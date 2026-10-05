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

interface Item {
  emoji: string;
  value: number;
  color: string;
}

interface SortingLevel {
  items: Item[];
  sortType: 'asc' | 'desc' | 'asc-emoji' | 'desc-emoji';
  hint: string;
  timeLimit: number;
}

function generateSorting(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): SortingLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];

  const count = mode === 'easy' ? 4 : mode === 'normal' ? 5 : 6;
  const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🍑', '🐱', '🐶', '🐼', '🦊'];
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  const items: Item[] = [];
  const usedEmojis = new Set<string>();
  for (let i = 0; i < count; i++) {
    let emoji: string;
    do {
      emoji = emojis[Math.floor(rng() * emojis.length)];
    } while (usedEmojis.has(emoji));
    usedEmojis.add(emoji);
    items.push({
      emoji,
      value: Math.floor(rng() * 9) + 1,
      color: colors[i % colors.length],
    });
  }

  let sortType: SortingLevel['sortType'];
  if (level <= 30) sortType = rng() < 0.5 ? 'asc' : 'desc';
  else if (level <= 60) {
    const r = rng();
    sortType = r < 0.3 ? 'asc' : r < 0.6 ? 'desc' : r < 0.8 ? 'asc-emoji' : 'desc-emoji';
  } else {
    const r = rng();
    sortType = r < 0.25 ? 'asc' : r < 0.5 ? 'desc' : r < 0.75 ? 'asc-emoji' : 'desc-emoji';
  }

  let hint: string;
  switch (sortType) {
    case 'asc': hint = 'Sắp xếp tăng dần (nhỏ → lớn)'; break;
    case 'desc': hint = 'Sắp xếp giảm dần (lớn → nhỏ)'; break;
    case 'asc-emoji': hint = 'Sắp xếp theo thứ tự ABC'; break;
    case 'desc-emoji': hint = 'Sắp xếp ngược ABC'; break;
  }

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const stage = getStage(level);
  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 30 + count * 4;
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * stageMul * 1000);

  return { items, sortType, hint, timeLimit };
}

export default function SortingGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateSorting('sorting-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [sorted, setSorted] = useState<Item[]>(puzzle.items);
  const [selected, setSelected] = useState<number | null>(initialState?.selected ?? null);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
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

  const correctOrder = useMemo(() => {
    const arr = [...puzzle.items];
    switch (puzzle.sortType) {
      case 'asc':
        arr.sort((a, b) => a.value - b.value);
        break;
      case 'desc':
        arr.sort((a, b) => b.value - a.value);
        break;
      case 'asc-emoji':
        arr.sort((a, b) => a.emoji.localeCompare(b.emoji));
        break;
      case 'desc-emoji':
        arr.sort((a, b) => b.emoji.localeCompare(a.emoji));
        break;
    }
    return arr;
  }, [puzzle]);

  const swap = (a: number, b: number) => {
    if (a === b) return;
    setSorted((prev: Item[]) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  const isCurrentCorrect = sorted.every((it, i) =>
    it.emoji === correctOrder[i].emoji && it.value === correctOrder[i].value
  );

  const handleCheck = () => {
    if (completedRef.current) return;
    soundF(playClick);

    if (isCurrentCorrect) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const score = calculateScore(1, timeMs, puzzle.timeLimit, moves <= 5, 0, mode, stage.stage);
      const stars = calculateStars(score);
      soundF(playPop);
      setTimeout(() => {
        soundF(playWin);
        onComplete({
          score, accuracy: 1, timeMs, stars,
          perfect: moves === 0, hintsUsed: 0, moves: moves + 1,
        });
      }, 300);
    } else {
      setMoves((m: number) => m + 1);
      setWrongFlash(0);
      soundF(playWrong);
      setTimeout(() => setWrongFlash(null), 500);
    }
  };

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={puzzle.timeLimit}
        emoji="📊"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">📊 Xếp Theo Thứ Tự</h2>
        <p className="text-xs text-purple-600">💡 {puzzle.hint}</p>
      </div>

      <div className="glass mb-3 rounded-2xl p-3">
        <div className="mb-2 text-center text-xs font-bold text-purple-600">
          Bé chạm vào 2 ô để đổi chỗ
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {sorted.map((item, idx) => (
            <motion.button
              whileTap={{ scale: 0.92 }}
              key={`${item.emoji}-${item.value}-${idx}`}
              onClick={() => {
                if (completedRef.current) return;
                soundF(playClick);
                if (selected === null) {
                  setSelected(idx);
                } else if (selected === idx) {
                  setSelected(null);
                } else {
                  swap(selected, idx);
                  setSelected(null);
                  setMoves((m: number) => m + 1);
                }
              }}
              className={`btn-shadow flex h-14 w-14 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-2xl text-2xl sm:text-3xl transition-all ${
                selected === idx ? 'ring-4 ring-yellow-400 scale-110' : ''
              } ${wrongFlash === idx ? 'animate-shake bg-red-200' : ''}`}
              style={{ background: item.color + '40' }}
            >
              <div>{item.emoji}</div>
              {(puzzle.sortType === 'asc' || puzzle.sortType === 'desc') && (
                <div className="text-xs font-extrabold text-purple-900">{item.value}</div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleCheck}
        className={`btn-shadow rounded-2xl py-3 text-lg font-extrabold text-white ${
          isCurrentCorrect
            ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse-soft'
            : 'bg-gradient-to-r from-blue-400 to-purple-500'
        }`}
      >
        {isCurrentCorrect ? '✅ Đúng rồi! Nhấn để hoàn thành' : '🔍 Kiểm tra'}
      </motion.button>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Đã đổi: {moves} lần
      </div>
    </div>
  );
}