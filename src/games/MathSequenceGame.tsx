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

interface MathSeqLevel {
  type: 'between' | 'missing-num' | 'true-num' | 'odd-out';
  question: string;
  options: number[];
  correctIdx: number;
  context?: string;
  timeLimit: number;
}

function generateMathSeq(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): MathSeqLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);

  let type: MathSeqLevel['type'];
  if (stage.stage === 1) type = 'between';
  else if (stage.stage === 2) type = 'missing-num';
  else if (stage.stage === 3) type = 'true-num';
  else if (stage.stage === 4) type = rng() < 0.5 ? 'missing-num' : 'odd-out';
  else type = rng() < 0.5 ? 'odd-out' : 'true-num';

  const maxRange = Math.min(20 + (level - 1) * 5, 999);

  let question = '';
  let options: number[] = [];
  let correctAnswer = 0;
  let context: string | undefined;

  if (type === 'between') {
    const a = Math.floor(rng() * maxRange) + 1;
    const b = a + 1 + Math.floor(rng() * 4);
    correctAnswer = Math.floor((a + b) / 2);
    question = `Số ở giữa ${a} và ${b}?`;
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 5) - 2;
      if (w !== correctAnswer && w > 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else if (type === 'missing-num') {
    const start = Math.floor(rng() * 30) + 1;
    const step = Math.floor(rng() * 5) + 1;
    const len = 5;
    const seq: number[] = [];
    for (let i = 0; i < len; i++) seq.push(start + step * i);
    const missingIdx = 1 + Math.floor(rng() * 3);
    correctAnswer = seq[missingIdx];
    const shownSeq = seq.map((n, i) => i === missingIdx ? 0 : n);
    question = shownSeq.join(', ');
    context = `Tìm số bị thiếu (mỗi bước +${step})`;

    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 7) - 3;
      if (w !== correctAnswer && w > 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else if (type === 'true-num') {
    const rule = rng() < 0.5 ? 'even' : rng() < 0.5 ? 'multiple3' : 'multiple5';
    if (rule === 'even') correctAnswer = 2 + Math.floor(rng() * 9) * 2;
    else if (rule === 'multiple3') correctAnswer = 3 + Math.floor(rng() * 8) * 3;
    else correctAnswer = 5 + Math.floor(rng() * 7) * 5;

    const ruleText = rule === 'even' ? 'số chẵn' : rule === 'multiple3' ? 'bội số của 3' : 'bội số của 5';
    question = `Tìm ${ruleText}:`;
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      let w: number;
      if (rule === 'even') w = 1 + Math.floor(rng() * 9) * 2;
      else if (rule === 'multiple3') w = (1 + Math.floor(rng() * 8)) * 3 + 1;
      else w = (1 + Math.floor(rng() * 7)) * 5 + 1;
      if (w !== correctAnswer && w > 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else {
    // odd-out: hiển thị cả dãy số với 1 số khác quy luật
    const baseType: 'even' | 'odd' = rng() < 0.5 ? 'even' : 'odd';
    const seq: number[] = [];
    for (let i = 0; i < 5; i++) {
      let n: number;
      if (baseType === 'even') {
        n = 2 + Math.floor(rng() * 5) * 2;
      } else {
        n = 1 + Math.floor(rng() * 5) * 2;
      }
      seq.push(n);
    }
    const wrongIdx = Math.floor(rng() * 5);
    correctAnswer = seq[wrongIdx];
    const newOdd = baseType === 'odd' ? 2 + Math.floor(rng() * 5) * 2 : 1 + Math.floor(rng() * 5) * 2;
    seq[wrongIdx] = newOdd;
    question = `Tìm số KHÁC quy luật (các số còn lại đều ${baseType === 'even' ? 'chẵn' : 'lẻ'}):`;
    options = seq;
    context = `Dãy: ${seq.join(', ')}`;
  }

  // Shuffle options nếu chưa phải odd-out
  if (type !== 'odd-out') {
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
  }

  const correctIdx = options.indexOf(correctAnswer);

  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 30;
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return { type, question, options, correctIdx, context, timeLimit };
}

export default function MathSequenceGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateMathSeq('math-sequence-game', mode, level), [level, mode]);
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
        emoji="🔢"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🔢 Dãy Số Toán</h2>
        <p className="text-xs text-purple-600">{puzzle.question}</p>
        {puzzle.context && (
          <p className="text-xs text-pink-600 mt-1">💡 {puzzle.context}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.options.map((opt, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl py-4 text-3xl sm:text-4xl font-extrabold transition-all ${
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