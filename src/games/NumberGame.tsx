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

interface NumberLevel {
  sequence: number[];
  answer: number;
  options: number[];
  hint: string;
  timeLimit: number;
}

function generateNumberSequence(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): NumberLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];

  // Loại quy tắc
  const ruleTypes: ('add' | 'sub' | 'mul' | 'fibonacci' | 'square' | 'double')[] = [];
  if (level <= 25) ruleTypes.push('add', 'sub');
  else if (level <= 50) ruleTypes.push('add', 'sub', 'mul', 'double');
  else if (level <= 75) ruleTypes.push('add', 'sub', 'mul', 'double', 'fibonacci');
  else ruleTypes.push('add', 'sub', 'mul', 'double', 'fibonacci', 'square');

  const ruleType = ruleTypes[Math.floor(rng() * ruleTypes.length)];

  let sequence: number[] = [];
  let answer: number;
  let hint: string;
  let range: { min: number; max: number };

  switch (ruleType) {
    case 'add': {
      const step = mode === 'easy' ? (rng() < 0.5 ? 1 : 2) : mode === 'normal' ? (rng() < 0.5 ? 2 : 3) : Math.floor(rng() * 5) + 2;
      const start = Math.floor(rng() * 20) + 1;
      for (let i = 0; i < 4; i++) sequence.push(start + step * i);
      answer = start + step * 4;
      hint = `Cộng thêm ${step}`;
      range = { min: Math.max(0, answer - step * 3), max: answer + step * 3 };
      break;
    }
    case 'sub': {
      const step = mode === 'easy' ? 1 : mode === 'normal' ? (rng() < 0.5 ? 2 : 3) : Math.floor(rng() * 4) + 2;
      const start = mode === 'easy' ? Math.floor(rng() * 10) + 10 : Math.floor(rng() * 30) + 20;
      for (let i = 0; i < 4; i++) sequence.push(start - step * i);
      answer = start - step * 4;
      hint = `Trừ đi ${step}`;
      range = { min: Math.max(0, answer - step * 3), max: answer + step * 3 };
      break;
    }
    case 'mul': {
      const factor = mode === 'easy' ? 2 : mode === 'normal' ? (rng() < 0.5 ? 2 : 3) : Math.floor(rng() * 3) + 2;
      const start = mode === 'easy' ? Math.floor(rng() * 3) + 1 : Math.floor(rng() * 5) + 1;
      for (let i = 0; i < 4; i++) sequence.push(start * Math.pow(factor, i));
      answer = start * Math.pow(factor, 4);
      hint = `Nhân ${factor}`;
      range = { min: 0, max: answer * 2 };
      break;
    }
    case 'double': {
      // +1, +2, +3, +4, +5
      const start = Math.floor(rng() * 10) + 1;
      let acc = start;
      sequence.push(acc);
      for (let i = 1; i < 4; i++) {
        acc += i + 1;
        sequence.push(acc);
      }
      acc += 5;
      answer = acc;
      hint = '+1, +2, +3, +4...';
      range = { min: answer - 10, max: answer + 10 };
      break;
    }
    case 'fibonacci': {
      // Mỗi số = tổng 2 số trước
      const a = Math.floor(rng() * 4) + 1;
      const b = Math.floor(rng() * 4) + 1;
      sequence = [a, b, a + b, (a + b) + b];
      answer = sequence[3] + sequence[2];
      hint = 'Mỗi số = tổng 2 số trước';
      range = { min: 0, max: answer * 2 };
      break;
    }
    case 'square': {
      // 1, 4, 9, 16, 25
      const offset = Math.floor(rng() * 3);
      sequence = [];
      for (let i = 1; i <= 4; i++) sequence.push((i + offset) * (i + offset));
      answer = (5 + offset) * (5 + offset);
      hint = 'Bình phương: 1, 4, 9, 16, 25...';
      range = { min: 0, max: answer * 2 };
      break;
    }
  }

  // Tạo 4 lựa chọn
  const options = new Set<number>();
  options.add(answer);
  while (options.size < 4) {
    const delta = Math.floor(rng() * 10) - 5;
    const wrong = answer + (delta === 0 ? 1 : delta) * (mode === 'hard' ? 3 : 1);
    if (wrong >= range.min && wrong <= range.max && wrong !== answer) {
      options.add(wrong);
    }
  }

  // Đảm bảo có 4 options unique
  let attempts = 0;
  while (options.size < 4 && attempts < 20) {
    options.add(answer + Math.floor(rng() * 20) - 10);
    attempts++;
  }

  const optionList = Array.from(options).slice(0, 4).sort(() => rng() - 0.5);

  // Time
  const baseTime = 30 + (ruleType === 'fibonacci' || ruleType === 'square' ? 10 : 0);
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * 1000);

  return { sequence, answer, options: optionList, hint, timeLimit };
}

export default function NumberGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateNumberSequence('number-game', mode, level), [level, mode]);
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

  const handleSelect = (num: number, idx: number) => {
    if (completedRef.current) return;
    soundF(playClick);
    setSelected(num);
    const newMoves = moves + 1;
    setMoves(newMoves);

    if (num === puzzle.answer) {
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
        <h2 className="text-xl font-extrabold text-purple-800">🔢 Dãy Số Bí Ẩn</h2>
        <p className="text-xs text-purple-600">Tìm số tiếp theo theo quy luật</p>
      </div>

      {/* Sequence */}
      <div className="glass mb-3 rounded-2xl p-3">
        <div className="mb-2 text-center text-xs font-bold text-purple-600">
          💡 {puzzle.hint}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {puzzle.sequence.map((num, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.06 }}
              className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-2xl sm:text-3xl font-extrabold text-white shadow-lg"
            >
              {num}
            </motion.div>
          ))}
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-4 border-dashed border-purple-400 bg-purple-50 text-2xl sm:text-3xl font-extrabold text-purple-600 animate-pulse">
            ?
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.options.map((num, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(num, idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl py-4 text-3xl sm:text-4xl font-extrabold ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === num && num === puzzle.answer ? 'bg-green-200' : ''} bg-gradient-to-br from-yellow-100 to-orange-100 text-purple-900`}
          >
            {num}
          </motion.button>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}