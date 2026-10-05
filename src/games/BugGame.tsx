import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MODE_CONFIG,
  getStage,
  calculateScore,
  calculateStars,
  levelSeed,
  seededRandom,
} from './types';
import type { GameProps } from './types';
import { playWrong, playWin, playClick, playFail, playTick } from '../utils/sound';
import GameHeader from '../components/GameHeader';

type Dir = 'N' | 'E' | 'S' | 'W';
type BugType = 'wrong-direction' | 'wrong-turn';

interface BlockDef {
  id: string;
  type: 'forward' | 'turn' | 'repeat';
  text: string;
  emoji: string;
  color: string;
  repeatCount?: number;
}

const COLORS_FB: Record<string, string> = {
  forward: '#10b981',
  turn: '#f59e0b',
  repeat: '#8b5cf6',
};

function turn(dir: Dir, side: 'trái' | 'phải'): Dir {
  if (dir === 'N') return side === 'trái' ? 'W' : 'E';
  if (dir === 'S') return side === 'trái' ? 'E' : 'W';
  if (dir === 'E') return side === 'trái' ? 'N' : 'S';
  return side === 'trái' ? 'S' : 'N';
}

function step(dir: Dir, reverse = false): [number, number, Dir] {
  // Returns [dx, dy, newDir]
  if (reverse) {
    if (dir === 'N') return [0, -1, dir];
    if (dir === 'S') return [0, 1, dir];
    if (dir === 'E') return [-1, 0, dir];
    return [1, 0, dir];
  }
  if (dir === 'N') return [0, 1, dir];
  if (dir === 'S') return [0, -1, dir];
  if (dir === 'E') return [1, 0, dir];
  return [-1, 0, dir];
}

interface BugLevelData {
  buggy: BlockDef[];
  bugIndex: number;
  bugType: BugType;
  expectedOutput: string;
  buggyOutput: string;
  description: string;
}

function generateBugLevel(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): BugLevelData {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);

  const programLen = Math.min(3 + Math.floor((level - 1) / 12) + (mode === 'hard' ? 1 : 0), 8);

  // Tạo chương trình đúng
  const correct: BlockDef[] = [];
  let x = 0, y = 0;
  let dir: Dir = 'E';

  for (let i = 0; i < programLen; i++) {
    const isEasyLevel = level <= 30;
    if (isEasyLevel || rng() < 0.65) {
      // forward
      correct.push({ id: `c${i}`, type: 'forward', text: 'Đi tới 1', emoji: '⬆️', color: COLORS_FB.forward });
      const [dx, dy] = step(dir);
      x += dx;
      y += dy;
    } else {
      // turn
      const side: 'trái' | 'phải' = rng() < 0.5 ? 'trái' : 'phải';
      dir = turn(dir, side);
      correct.push({
        id: `c${i}`,
        type: 'turn',
        text: `Rẽ ${side}`,
        emoji: side === 'trái' ? '↪️' : '↩️',
        color: COLORS_FB.turn,
      });
    }
  }

  // Tạo chương trình bị lỗi
  const buggy = correct.map(b => ({ ...b }));
  // Chọn vị trí lỗi
  const candidates = buggy
    .map((b, idx) => ({ b, idx }))
    .filter(c => c.b.type === 'forward' || c.b.type === 'turn');

  const chosen = candidates[Math.floor(rng() * candidates.length)] ?? { b: buggy[0], idx: 0 };
  const bugIdx = chosen.idx;
  const buggyAt = buggy[bugIdx];

  // Tính lại vị trí cho buggy (từ đầu đến bugIdx với lỗi, sau đó tiếp tục correct)
  let bugX = 0, bugY = 0;
  let bugDir: Dir = 'E';

  for (let i = 0; i < correct.length; i++) {
    const block = correct[i];
    if (i === bugIdx) {
      // Apply bug instead of correct
      if (buggyAt.type === 'forward') {
        // Bug: đi lùi thay vì tới
        const [dx, dy] = step(bugDir, true);
        bugX += dx;
        bugY += dy;
      } else if (buggyAt.type === 'turn') {
        // Bug: đổi chiều rẽ
        const side = buggyAt.text.includes('trái') ? 'trái' : 'phải';
        bugDir = turn(bugDir, side);
      }
    } else if (block.type === 'forward') {
      const [dx, dy] = step(bugDir);
      bugX += dx;
      bugY += dy;
    } else if (block.type === 'turn') {
      const side = block.text.includes('trái') ? 'trái' : 'phải';
      bugDir = turn(bugDir, side);
    }
  }

  // Apply bug to buggy
  if (buggyAt.type === 'forward') {
    buggyAt.text = 'Đi lùi 1';
    buggyAt.emoji = '⬇️';
  } else if (buggyAt.type === 'turn') {
    buggyAt.text = buggyAt.text.includes('trái') ? 'Rẽ phải' : 'Rẽ trái';
    buggyAt.emoji = buggyAt.emoji === '↪️' ? '↩️' : '↪️';
  }

  const expectedOutput = `Vị trí (${x}, ${y})`;
  const buggyOutput = `Vị trí (${bugX}, ${bugY})`;

  const description = buggyAt.type === 'forward'
    ? 'Có một khối "Đi tới" bị đổi thành "Đi lùi"!'
    : 'Có một khối "Rẽ trái/phải" bị đổi chiều!';

  return {
    buggy,
    bugIndex: bugIdx,
    bugType: buggyAt.type === 'forward' ? 'wrong-direction' : 'wrong-turn',
    expectedOutput,
    buggyOutput,
    description,
  };
}

export default function BugGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateBugLevel('bug-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState<number | null>(initialState?.selected ?? null);
  const [moves, setMoves] = useState(initialState?.moves ?? 0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const [timeLimit] = useState(() => {
    const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
    const baseTime = 30 + puzzle.buggy.length * 3;
    return Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);
  });

  useEffect(() => {
    setTimeLeft(timeLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 100) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            const timeMs = Date.now() - startTimeRef.current;
            const score = calculateScore(0, timeMs, t, false, 0, mode);
            if (soundOn) playFail();
            onComplete({
              score,
              accuracy: 0,
              timeMs,
              stars: 0,
              perfect: false,
              hintsUsed: 0,
              moves,
            });
          }
          return 0;
        }
        if (t < 3000 && t % 1000 < 100 && soundOn) playTick();
        return t - 100;
      });
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (idx: number) => {
    if (completedRef.current) return;
    if (soundOn) playClick();
    setSelected(idx);
    const newMoves = moves + 1;
    setMoves(newMoves);

    if (idx === puzzle.bugIndex) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const accuracy = newMoves === 1 ? 1 : Math.max(0.5, 1 - (newMoves - 1) * 0.2);
      const score = calculateScore(accuracy, timeMs, timeLeft, moves === 0, 0, mode);
      const stars = calculateStars(score);
      if (soundOn) playWin();
      setTimeout(() => onComplete({
        score,
        accuracy,
        timeMs,
        stars,
        perfect: moves === 0,
        hintsUsed: 0,
        moves: newMoves,
      }), 600);
    } else {
      setWrongIdx(idx);
      if (soundOn) playWrong();
      setTimeout(() => {
        setWrongIdx(null);
        setSelected(null);
      }, 500);
    }
  };

  

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={timeLimit}
        emoji="🐞"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🐞 Tìm Con Bọ</h2>
        <p className="text-xs text-purple-600">Tìm khối lệnh bị sai trong chương trình!</p>
      </div>

      <div className="glass mb-2 grid grid-cols-2 gap-2 rounded-2xl p-2">
        <div className="text-center rounded-xl bg-green-50 p-2">
          <div className="text-xs font-bold text-green-700">✅ Mong đợi</div>
          <div className="text-sm font-mono font-bold text-green-900">{puzzle.expectedOutput}</div>
        </div>
        <div className="text-center rounded-xl bg-red-50 p-2">
          <div className="text-xs font-bold text-red-700">❌ Đang chạy</div>
          <div className="text-sm font-mono font-bold text-red-900">{puzzle.buggyOutput}</div>
        </div>
      </div>

      <div className="mb-2 text-center text-xs italic text-purple-600">
        💡 {puzzle.description}
      </div>

      <div className="glass flex-1 rounded-2xl p-2 overflow-y-auto">
        <div className="flex flex-col items-center gap-2">
          {puzzle.buggy.map((block, idx) => {
            const isSelected = selected === idx;
            const isWrong = wrongIdx === idx;
            const isBugHere = idx === puzzle.bugIndex;
            return (
              <motion.button
                whileTap={{ scale: 0.96 }}
                key={block.id}
                onClick={() => handleClick(idx)}
                className={`btn-shadow flex w-56 items-center gap-2 rounded-2xl px-3 py-2.5 text-white transition-all ${
                  isSelected ? 'ring-4 ring-yellow-300' : ''
                } ${isWrong ? 'animate-shake' : ''}`}
                style={{
                  background: isWrong
                    ? '#ef4444'
                    : isSelected && isBugHere
                      ? '#10b981'
                      : block.color,
                  boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                }}
              >
                <div className="text-2xl">{block.emoji}</div>
                <div className="text-left text-sm font-bold flex-1">
                  {block.text}
                </div>
                <div className="text-xs font-mono opacity-70">#{idx + 1}</div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-center text-sm text-purple-700 font-bold">
        Số lần thử: {moves}
      </div>
    </div>
  );
}