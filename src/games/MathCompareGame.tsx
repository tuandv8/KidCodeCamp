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

type ComparisonType = 'max' | 'min' | 'compare-2' | 'sum-comparison' | 'place-value';

interface MathLevel {
  type: ComparisonType;
  question: string;
  options: string[];     // "<", ">", "=" + others
  correctIdx: number;
  context?: string;
  timeLimit: number;
}

function generateMathCompare(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): MathLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);

  // Stage-based type
  let type: ComparisonType;
  if (stage.stage === 1) type = 'compare-2';
  else if (stage.stage === 2) type = 'max';
  else if (stage.stage === 3) type = rng() < 0.5 ? 'max' : 'min';
  else if (stage.stage === 4) type = rng() < 0.4 ? 'min' : rng() < 0.7 ? 'sum-comparison' : 'compare-2';
  else type = rng() < 0.3 ? 'sum-comparison' : 'place-value';

  // Range tăng theo level
  const maxRange = Math.min(20 + (level - 1) * 3, 999);

  let question = '';
  let options: string[] = ['<', '>', '='];
  let correctIdx = 1;
  let context: string | undefined;

  if (type === 'compare-2') {
    const a = Math.floor(rng() * maxRange) + 1;
    let b = Math.floor(rng() * maxRange) + 1;
    while (a === b) b = Math.floor(rng() * maxRange) + 1;
    question = `${a} ? ${b}`;
    correctIdx = a > b ? 0 : a < b ? 1 : 2; // 0:>, 1:<, 2:=
  } else if (type === 'max' || type === 'min') {
    const count = stage.stage <= 2 ? 3 : stage.stage === 3 ? 4 : 5;
    const nums: number[] = [];
    for (let i = 0; i < count; i++) {
      nums.push(Math.floor(rng() * maxRange) + 1);
    }
    const target = type === 'max' ? Math.max(...nums) : Math.min(...nums);
    const position = nums.indexOf(target) + 1;
    question = `${nums.join(', ')}. Số ${type === 'max' ? 'lớn' : 'nhỏ'} nhất ở vị trí nào?`;
    options = nums.map((_, i) => String(i + 1));
    correctIdx = position;
  } else if (type === 'sum-comparison') {
    // So sánh tổng hai nhóm
    const a1 = Math.floor(rng() * (maxRange / 2)) + 1;
    const a2 = Math.floor(rng() * (maxRange / 2)) + 1;
    const b1 = Math.floor(rng() * (maxRange / 2)) + 1;
    const b2 = Math.floor(rng() * (maxRange / 2)) + 1;
    const sumA = a1 + a2;
    const sumB = b1 + b2;
    question = `${a1} + ${a2} ? ${b1} + ${b2}`;
    correctIdx = sumA > sumB ? 0 : sumA < sumB ? 1 : 2;
    context = `(${sumA} so với ${sumB})`;
  } else {
    // place-value: tìm giá trị của chữ số
    const num = Math.floor(rng() * (maxRange - 100)) + 100;
    const positions = ['đơn vị', 'chục', 'trăm'];
    const digitIdx = Math.floor(rng() * 3);
    const digits = num.toString().padStart(3, '0').split('').map(Number);
    const targetDigit = digits[digitIdx];
    const positionLabel = positions[digitIdx];

    question = `Trong số ${num}, chữ số ${positionLabel} là bao nhiêu?`;
    const wrongOpts = new Set<number>();
    while (wrongOpts.size < 3) {
      const w = Math.floor(rng() * 10);
      if (w !== targetDigit) wrongOpts.add(w);
    }
    const allOpts = [targetDigit, ...Array.from(wrongOpts)].slice(0, 4).sort(() => rng() - 0.5);
    options = allOpts.map(String);
    correctIdx = options.indexOf(String(targetDigit));
  }

  // Time limit
  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 25 + (type === 'max' || type === 'min' ? 8 : 0);
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return { type, question, options, correctIdx, context, timeLimit };
}

export default function MathCompareGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateMathCompare('math-compare-game', mode, level), [level, mode]);
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
        emoji="⚖️"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">⚖️ So Sánh Số</h2>
        <p className="text-xs text-purple-600">Tư duy toán - kiểu FMO</p>
      </div>

      <div className="glass mb-3 flex-1 rounded-2xl p-4 flex flex-col items-center justify-center">
        <motion.div
          key={puzzle.question}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-900 mb-1">
            {puzzle.question}
          </div>
          {puzzle.context && (
            <div className="text-xs text-purple-500 mt-1">💡 {puzzle.context}</div>
          )}
        </motion.div>
      </div>

      <div className={`grid gap-2 mb-2 ${puzzle.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {puzzle.options.map((opt, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl py-4 text-2xl sm:text-3xl font-extrabold transition-all ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === idx && idx === puzzle.correctIdx ? 'bg-green-200' : 'bg-gradient-to-br from-yellow-100 to-orange-100 text-purple-900'}`}
          >
            {opt}
          </motion.button>
        ))}
      </div>

      <div className="text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}