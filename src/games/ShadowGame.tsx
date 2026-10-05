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

interface ShadowLevel {
  source: number[][];
  transforms: ('rotate' | 'flip-h' | 'flip-v')[];
  options: number[][][];
  correctIdx: number;
  timeLimit: number;
}

function rotateGrid(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const result: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(grid[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

function flipHorizontal(grid: number[][]): number[][] {
  return grid.map(row => [...row].reverse());
}

function flipVertical(grid: number[][]): number[][] {
  return [...grid].reverse();
}

function gridEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[0].length; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}

function generateShadow(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): ShadowLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];

  const size = mode === 'easy' ? 4 : mode === 'normal' ? 5 : 6;

  const source: number[][] = [];
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      row.push(rng() < 0.4 ? 1 : 0);
    }
    if (row.every(v => v === 0)) {
      (row as number[])[Math.floor(rng() * size)] = 1;
    }
    source.push(row);
  }

  const transforms: ('rotate' | 'flip-h' | 'flip-v')[] = [];
  let transformed = source;
  const numTransforms = mode === 'easy' ? 1 : mode === 'normal' ? (rng() < 0.5 ? 1 : 2) : 2 + Math.floor(rng() * 2);
  for (let i = 0; i < numTransforms; i++) {
    const t = (['rotate', 'flip-h', 'flip-v'] as const)[Math.floor(rng() * 3)];
    if (t === 'rotate') transformed = rotateGrid(transformed);
    if (t === 'flip-h') transformed = flipHorizontal(transformed);
    if (t === 'flip-v') transformed = flipVertical(transformed);
    transforms.push(t);
  }

  if (gridEqual(transformed, source)) {
    transformed = flipHorizontal(transformed);
    transforms.push('flip-h');
  }

  const options: number[][][] = [transformed];
  let attempts = 0;
  while (options.length < 4 && attempts < 60) {
    attempts++;
    let wrong = transformed.map(r => [...r]);
    const numChanges = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < numChanges; i++) {
      const r = Math.floor(rng() * wrong.length);
      const c = Math.floor(rng() * wrong[0].length);
      wrong[r][c] = ((wrong[r][c] + 1) % 2);
    }
    if (gridEqual(wrong, transformed)) continue;
    if (options.some(o => gridEqual(o, wrong))) continue;
    options.push(wrong);
  }

  while (options.length < 4) {
    const wrong = transformed.map(r => [...r]);
    wrong[0][0] = (wrong[0][0] + 1) % 2;
    options.push(wrong);
  }

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const correctIdx = options.findIndex(o => gridEqual(o, transformed));

  const stage = getStage(level);
  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 25 + size * 4;
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * stageMul * 1000);

  return { source, transforms, options, correctIdx, timeLimit };
}

const TRANSFORM_TEXT: Record<string, string> = {
  rotate: 'Xoay 90°',
  'flip-h': 'Lật ngang',
  'flip-v': 'Lật dọc',
};

export default function ShadowGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateShadow('shadow-game', mode, level), [level, mode]);
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

  const cellSize = Math.max(8, Math.min(18, Math.floor(220 / puzzle.source.length)));

  const renderGrid = (grid: number[][], idx: number) => (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => handleSelect(idx)}
      className={`btn-shadow flex items-center justify-center rounded-2xl bg-white p-2 ${
        wrongIdx === idx ? 'animate-shake bg-red-200' : ''
      } ${selected === idx && idx === puzzle.correctIdx ? 'bg-green-200' : ''}`}
    >
      <div
        className="grid gap-0.5 rounded-lg bg-gray-100 p-1"
        style={{
          gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              className="rounded transition-colors"
              style={{
                width: cellSize,
                height: cellSize,
                background: cell === 1 ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
              }}
            />
          ))
        )}
      </div>
    </motion.button>
  );

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={puzzle.timeLimit}
        emoji="🪞"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🪞 Ghép Bóng</h2>
        <p className="text-xs text-purple-600 flex justify-center flex-wrap">
          {puzzle.transforms.map((t, i) => (
            <span key={i} className="mx-1 my-0.5 rounded-full bg-purple-100 px-2 py-0.5 font-bold text-purple-700">
              {TRANSFORM_TEXT[t]}
            </span>
          ))}
        </p>
      </div>

      <div className="glass mb-3 flex flex-col items-center rounded-2xl p-3">
        <div className="mb-2 text-xs font-bold text-purple-600">🟧 Hình gốc</div>
        <div
          className="grid gap-0.5 rounded-lg bg-purple-100 p-1"
          style={{
            gridTemplateColumns: `repeat(${puzzle.source[0].length}, ${cellSize}px)`,
          }}
        >
          {puzzle.source.map((row, ri) =>
            row.map((cell, ci) => (
              <motion.div
                key={`${ri}-${ci}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (ri * puzzle.source.length + ci) * 0.02 }}
                className="rounded"
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: cell === 1 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'transparent',
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className="text-center text-xs font-bold text-purple-600 mb-1">
        ⬇️ Chọn hình phản chiếu ⬇️
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.options.map((opt, idx) => (
          <div key={idx}>
            {renderGrid(opt, idx)}
          </div>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}