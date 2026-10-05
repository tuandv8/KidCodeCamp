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
import { playWrong, playWin, playClick, playFail, playTick } from '../utils/sound';
import GameHeader from '../components/GameHeader';

interface ArrowTask {
  arrows: ('up' | 'down' | 'left' | 'right')[];
  options: ('up' | 'down' | 'left' | 'right')[][];
  correctIdx: number;
}

function generateArrowTasks(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): ArrowTask {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);

  const arrowCount = Math.min(3 + Math.floor((level - 1) / 20) + (mode === 'hard' ? 1 : 0), 7);

  const arrows: ('up' | 'down' | 'left' | 'right')[] = [];
  for (let i = 0; i < arrowCount; i++) {
    const dir = ['up', 'down', 'left', 'right'][Math.floor(rng() * 4)];
    arrows.push(dir as any);
  }

  const options: ('up' | 'down' | 'left' | 'right')[][] = [];
  const correctIdx = Math.floor(rng() * 4);

  for (let i = 0; i < 4; i++) {
    if (i === correctIdx) {
      options.push([...arrows]);
    } else {
      const opt = [...arrows];
      const diffIdx = Math.floor(rng() * arrowCount);
      const otherDirs = ['up', 'down', 'left', 'right'].filter(d => d !== opt[diffIdx]);
      opt[diffIdx] = otherDirs[Math.floor(rng() * otherDirs.length)] as any;
      options.push(opt);
    }
  }

  return { arrows, options, correctIdx };
}

function generateArrowRound(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number) {
  const taskCount = Math.min(2 + Math.floor((level - 1) / 8) + (mode === 'hard' ? 1 : 0), 10);
  const tasks: ArrowTask[] = [];
  for (let i = 0; i < taskCount; i++) {
    tasks.push(generateArrowTasks(`${gameId}-${i}`, mode, level));
  }
  return { tasks };
}

const DIR_EMOJI: Record<string, string> = {
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
};

export default function ArrowGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const round = useMemo(() => generateArrowRound('arrow-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [taskIdx, setTaskIdx] = useState(initialState?.taskIdx ?? 0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  const soundF = (fn: () => void) => { if (soundOn) fn(); };

  const timeLimit = useMemo(() => {
    const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
    const baseTime = round.tasks.length * 15 + 15;
    return Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            const accuracy = correctCount + wrongCount === 0 ? 0 : correctCount / (correctCount + wrongCount);
            const score = calculateScore(accuracy, timeMs, t, false, 0, mode, stage.stage);
            soundF(playFail);
            onComplete({
              score,
              accuracy,
              timeMs,
              stars: 0,
              perfect: false,
              hintsUsed: 0,
              moves: correctCount + wrongCount,
            });
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

  const task = round.tasks[taskIdx];

  const handleSelect = (idx: number) => {
    if (completedRef.current) return;
    soundF(playClick);
    if (idx === task.correctIdx) {
      setCorrectCount((c: number) => c + 1);
      soundF(playWin);

      if (taskIdx + 1 >= round.tasks.length) {
        completedRef.current = true;
        const timeMs = Date.now() - startTimeRef.current;
        const total = correctCount + 1 + wrongCount;
        const accuracy = (correctCount + 1) / total;
        const score = calculateScore(accuracy, timeMs, timeLimit, wrongCount === 0, 0, mode, stage.stage);
        const stars = calculateStars(score);
        setTimeout(() => onComplete({
          score,
          accuracy,
          timeMs,
          stars,
          perfect: wrongCount === 0,
          hintsUsed: 0,
          moves: total,
        }), 500);
      } else {
        setTimeout(() => setTaskIdx((t: number) => t + 1), 400);
      }
    } else {
      setWrongIdx(idx);
      setWrongCount((c: number) => c + 1);
      soundF(playWrong);
      setTimeout(() => setWrongIdx(null), 500);
    }
  };

  const totalTasks = round.tasks.length;

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={timeLimit}
        emoji="🎯"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-bold text-purple-700">
          Task {Math.min(taskIdx + 1, totalTasks)}/{totalTasks}
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700">✓ {correctCount}</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700">✗ {wrongCount}</span>
        </div>
      </div>

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🎯 Đọc Chỉ Dẫn</h2>
        <p className="text-xs text-purple-600">Tìm chuỗi mũi tên GIỐNG hệt</p>
      </div>

      <div className="glass mb-3 rounded-2xl p-3">
        <div className="mb-1 text-center text-xs font-bold text-purple-600">Chuỗi mẫu:</div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {task.arrows.map((a, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 text-2xl text-white"
            >
              {DIR_EMOJI[a]}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {task.options.map((opt, idx) => (
          <motion.button
            whileTap={{ scale: 0.95 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex flex-col items-center justify-center rounded-2xl p-2 transition-all ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : 'bg-white hover:bg-purple-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-1">
              {opt.map((a, i) => (
                <div
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 text-xl text-white"
                >
                  {DIR_EMOJI[a]}
                </div>
              ))}
            </div>
            <div className="mt-1 text-xs font-bold text-purple-700">Lựa chọn {idx + 1}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}