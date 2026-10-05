import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GameProps,
  MODE_CONFIG,
  getStage,
  calculateScore,
  calculateStars,
  levelSeed,
  seededRandom,
} from './types';
import { playWrong, playWin, playClick, playFail, playTick, playPop } from '../utils/sound';
import GameHeader from '../components/GameHeader';

type LogicType = 'true-false' | 'pattern-skip' | 'odd-one' | 'next-shape';

interface LogicLevel {
  type: LogicType;
  question: string;
  context?: string;
  options: string[];
  correctIdx: number;
  shapes?: string[];
  timeLimit: number;
}

function generateLogicReason(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): LogicLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);

  let type: LogicType;
  if (stage.stage === 1) type = 'true-false';
  else if (stage.stage === 2) type = 'odd-one';
  else if (stage.stage === 3) type = 'pattern-skip';
  else if (stage.stage === 4) type = rng() < 0.5 ? 'pattern-skip' : 'next-shape';
  else type = rng() < 0.4 ? 'next-shape' : 'odd-one';

  const SHAPES = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⭐', '🌸', '🔺', '⬜', '❤️', '💎'];

  let question = '';
  let options: string[] = [];
  let correctIdx = 0;
  let context: string | undefined;
  let shapes: string[] | undefined;

  if (type === 'true-false') {
    // Phép so sánh đơn giản - Đúng hay Sai
    const a = Math.floor(rng() * 20) + 1;
    const b = Math.floor(rng() * 20) + 1;
    const op = rng() < 0.5 ? '>' : '<';
    const isTrue = op === '>' ? a > b : a < b;
    // Thỉnh thoảng cho sai để cân bằng
    const showAsTrue = isTrue ? (rng() < 0.8) : (rng() < 0.2);

    question = `${a} ${op} ${b}`;
    options = ['Đúng', 'Sai'];
    correctIdx = showAsTrue ? 0 : 1;
    context = showAsTrue === isTrue ? 'Phép so sánh đúng hay sai?' : '';
  } else if (type === 'odd-one') {
    // Tìm hình khác biệt
    const baseShape = SHAPES[Math.floor(rng() * SHAPES.length)];
    let oddShape: string;
    do {
      oddShape = SHAPES[Math.floor(rng() * SHAPES.length)];
    } while (oddShape === baseShape);

    const count = stage.stage === 2 ? 5 : stage.stage === 3 ? 6 : 7;
    const arr: string[] = [];
    const oddPos = Math.floor(rng() * count);
    for (let i = 0; i < count; i++) {
      arr.push(i === oddPos ? oddShape : baseShape);
    }
    shapes = arr;
    question = 'Tìm hình KHÁC với các hình còn lại:';
    options = arr.map((_, i) => String(i + 1));
    correctIdx = oddPos;
  } else if (type === 'pattern-skip') {
    // Tìm quy luật - bỏ qua 1 phần tử
    const start = Math.floor(rng() * 10);
    const step = Math.floor(rng() * 4) + 2;
    const seq: number[] = [];
    for (let i = 0; i < 6; i++) seq.push(start + step * i);

    // Trong seq, 1 số bị thay sai
    const wrongPos = 1 + Math.floor(rng() * 4);
    const correctNum = seq[wrongPos];
    const wrongSeq = [...seq];
    const delta = (rng() < 0.5 ? 1 : -1) * (1 + Math.floor(rng() * 2));
    wrongSeq[wrongPos] = correctNum + delta;

    question = `Dãy số có 1 số bị sai. Số nào sai?`;
    shapes = wrongSeq.map(String);
    options = wrongSeq.map((_, i) => `Vị trí ${i + 1}`);
    correctIdx = wrongPos;
    context = `Dãy đúng: ${seq.join(', ')}`;
  } else {
    // next-shape: tìm hình tiếp theo
    const shapes4 = ['🔴', '🟠', '🟡', '🟢'];
    const len = stage.stage === 4 ? 3 : 4;
    const seq = [];
    for (let i = 0; i < len; i++) {
      seq.push(shapes4[Math.floor(rng() * shapes4.length)]);
    }
    const answer = shapes4[Math.floor(rng() * shapes4.length)];
    shapes = [...seq, '?'];

    // Tạo 4 options (trong đó có answer)
    const wrongOpts = new Set<string>();
    while (wrongOpts.size < 3) {
      const w = shapes4[Math.floor(rng() * shapes4.length)];
      if (w !== answer) wrongOpts.add(w);
    }
    const allOpts = [answer, ...Array.from(wrongOpts)];
    for (let i = allOpts.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allOpts[i], allOpts[j]] = [allOpts[j], allOpts[i]];
    }
    question = 'Tìm hình tiếp theo:';
    options = allOpts;
    correctIdx = options.indexOf(answer);
  }

  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 30 + (type === 'pattern-skip' ? 10 : 0);
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return { type, question, options, correctIdx, context, shapes, timeLimit };
}

export default function LogicReasonGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateLogicReason('logic-reason-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [selected, setSelected] = useState<number | null>(initialState?.selected ?? null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(puzzle.timeLimit);
  const [moves, setMoves] = useState(initialState?.moves ?? 0);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  const soundF = (fn: () => void) => { if (soundOn) fn(); };

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 100) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            const timeMs = Date.now() - startTimeRef.current;
            const score = calculateScore(0, timeMs, puzzle.timeLimit, false, 0, mode, stage.stage);
            soundF(playFail);
            onComplete({ score, accuracy: 0, timeMs, stars: 0, perfect: false, hintsUsed: 0, moves });
          }
          return 0;
        }
        if (t < 3000 && t % 1000 < 100) soundF(playTick);
        return t - 100;
      });
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (idx: number) => {
    if (completedRef.current) return;
    soundF(playClick);
    setSelected(idx);
    const newMoves = moves + 1;
    setMoves(newMoves);

    if (idx === puzzle.correctIdx) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const accuracy = newMoves === 1 ? 1 : Math.max(0, 1 - (newMoves - 1) * 0.3);
      const score = calculateScore(accuracy, timeMs, puzzle.timeLimit, moves === 0, 0, mode, stage.stage);
      const stars = calculateStars(score);
      soundF(playPop);
      setTimeout(() => {
        soundF(playWin);
        onComplete({
          score, accuracy, timeMs, stars,
          perfect: moves === 0, hintsUsed: 0, moves: newMoves,
        });
      }, 300);
    } else {
      setWrongIdx(idx);
      soundF(playWrong);
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
        timeLimit={puzzle.timeLimit}
        emoji="🧠"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🧠 Suy Luận Logic</h2>
        <p className="text-xs text-purple-600">{puzzle.question}</p>
        {puzzle.context && (
          <p className="text-xs text-pink-600 mt-1">💡 {puzzle.context}</p>
        )}
      </div>

      {puzzle.shapes && (
        <div className="glass mb-3 rounded-2xl p-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {puzzle.shapes.map((s, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white shadow text-3xl"
              >
                {s === '?' ? '❓' : s}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-2 flex-1 ${puzzle.options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {puzzle.options.map((opt, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl py-3 text-lg sm:text-2xl font-bold transition-all ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === idx && idx === puzzle.correctIdx ? 'bg-green-200' : 'bg-gradient-to-br from-yellow-100 to-orange-100 text-purple-900'}`}
          >
            {opt}
          </motion.button>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}