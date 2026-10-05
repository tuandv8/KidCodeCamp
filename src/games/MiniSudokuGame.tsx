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

type Cell = number; // 0 nếu chưa điền, 1-4 nếu đã điền

interface SudokuLevel {
  grid: Cell[][];     // Grid đáp án đầy đủ
  puzzle: Cell[][];   // Grid câu đố (có ô trống)
  blanks: number;     // Số ô trống
  timeLimit: number;
}

// Tạo Sudoku 4x4 với quy luật:
// - Mỗi hàng có 4 số 1-4 khác nhau
// - Mỗi cột có 4 số 1-4 khác nhau
// - Mỗi khối 2x2 có 4 số 1-4 khác nhau
function generateSudoku4(rng: () => number): Cell[][] {
  const grid: Cell[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  // Pattern mẫu - swap rows và cols để tạo variety
  const base = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];

  // Shuffle rows within pairs
  const swapRows = (a: number, b: number) => {
    [grid[a], grid[b]] = [[...grid[b]], [...grid[a]]];
  };
  const swapCols = (a: number, b: number) => {
    for (let i = 0; i < 4; i++) {
      [grid[i][a], grid[i][b]] = [grid[i][b], grid[i][a]];
    }
  };

  // Copy base vào grid
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      grid[i][j] = base[i][j];
    }
  }

  // Random swaps
  if (rng() < 0.5) swapRows(0, 1);
  if (rng() < 0.5) swapRows(2, 3);
  if (rng() < 0.5) swapCols(0, 1);
  if (rng() < 0.5) swapCols(2, 3);

  // Reload base after swaps
  const result: Cell[][] = [];
  for (let i = 0; i < 4; i++) {
    result.push([...grid[i]]);
  }

  // Apply row swaps
  const swapRows2 = (a: number, b: number) => {
    [result[a], result[b]] = [[...result[b]], [...result[a]]];
  };
  const swapCols2 = (a: number, b: number) => {
    for (let i = 0; i < 4; i++) {
      [result[i][a], result[i][b]] = [result[i][b], result[i][a]];
    }
  };

  if (rng() < 0.5) swapRows2(0, 1);
  if (rng() < 0.5) swapRows2(2, 3);
  if (rng() < 0.5) swapCols2(0, 1);
  if (rng() < 0.5) swapCols2(2, 3);

  return result;
}

function generateSudokuLevel(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): SudokuLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);

  // Tạo lưới đầy đủ
  let attempts = 0;
  let fullGrid: Cell[][] = [];
  while (fullGrid.length === 0 && attempts < 20) {
    fullGrid = generateSudoku4(rng);
    attempts++;
  }
  if (fullGrid.length === 0) fullGrid = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];

  // Số ô trống tăng theo level
  const blanks = stage.stage === 1 ? 4 : stage.stage === 2 ? 6 : stage.stage === 3 ? 8 : stage.stage === 4 ? 10 : 12;

  // Tạo puzzle bằng cách xóa ngẫu nhiên
  const puzzle: Cell[][] = fullGrid.map(r => [...r]);
  const positions = Array.from({ length: 16 }, (_, i) => i);
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (let i = 0; i < blanks && i < positions.length; i++) {
    const pos = positions[i];
    const r = Math.floor(pos / 4);
    const c = pos % 4;
    puzzle[r][c] = 0;
  }

  const stageMul = stage.stage === 1 ? 1.4 : stage.stage === 2 ? 1.15 : stage.stage === 3 ? 0.95 : stage.stage === 4 ? 0.8 : 0.65;
  const baseTime = 60 + blanks * 5;
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return { grid: fullGrid, puzzle, blanks, timeLimit };
}

export default function MiniSudokuGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateSudokuLevel('mini-sudoku-game', mode, level), [level, mode]);
  const stage = getStage(level);

  const [grid, setGrid] = useState<Cell[][]>(initialState?.grid ?? puzzle.puzzle);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [wrongCell, setWrongCell] = useState<[number, number] | null>(null);
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

  const handleCellClick = (r: number, c: number) => {
    if (completedRef.current) return;
    if (puzzle.puzzle[r][c] !== 0) return; // ô đã có sẵn, không thay đổi
    soundF(playClick);
    setSelected([r, c]);
  };

  const handleNumber = (num: number) => {
    if (completedRef.current || !selected) return;
    const [r, c] = selected;
    soundF(playClick);
    setMoves((m: number) => m + 1);

    const correct = puzzle.grid[r][c];

    setGrid((prev) => {
      const next = prev.map(row => [...row]);
      next[r][c] = num;
      return next;
    });

    if (num !== correct) {
      soundF(playWrong);
      setWrongCell([r, c]);
      setTimeout(() => setWrongCell(null), 500);
    } else {
      soundF(playPop);
      // Kiểm tra đã hoàn thành chưa
      setTimeout(() => {
        setGrid((g) => {
          let isComplete = true;
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
              if (g[i][j] !== puzzle.grid[i][j]) {
                isComplete = false;
                break;
              }
            }
            if (!isComplete) break;
          }
          if (isComplete && !completedRef.current) {
            completedRef.current = true;
            const timeMs = Date.now() - startTimeRef.current;
            const score = calculateScore(1, timeMs, puzzle.timeLimit, moves === 0, 0, mode, stage.stage);
            const stars = calculateStars(score);
            setTimeout(() => {
              soundF(playWin);
              onComplete({
                score, accuracy: 1, timeMs, stars,
                perfect: moves === 0, hintsUsed: 0, moves: moves + 1,
              });
            }, 400);
          }
          return g;
        });
      }, 100);
    }
    setSelected(null);
  };

  const handleClear = () => {
    if (!selected || completedRef.current) return;
    soundF(playClick);
    const [r, c] = selected;
    setGrid((prev) => {
      const next = prev.map(row => [...row]);
      next[r][c] = 0;
      return next;
    });
    setSelected(null);
  };

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={puzzle.timeLimit}
        emoji="🧩"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🧩 Mini Sudoku 4×4</h2>
        <p className="text-xs text-purple-600">Điền số 1-4 vào ô trống</p>
      </div>

      <div className="glass mb-3 rounded-2xl p-2 flex justify-center">
        <div className="grid grid-cols-4 gap-1 bg-purple-300 p-1 rounded-xl" style={{ maxWidth: 280, aspectRatio: 1, width: '100%' }}>
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              const isOriginal = puzzle.puzzle[ri][ci] !== 0;
              const isSelected = selected && selected[0] === ri && selected[1] === ci;
              const isWrong = wrongCell && wrongCell[0] === ri && wrongCell[1] === ci;
              // Xác định border đậm cho khối 2x2
              const borderClass = `border-purple-300 ${
                ri === 1 ? 'border-b-4' : ri === 0 ? '' : ri === 2 ? 'border-t-4' : ''
              } ${ci === 1 ? 'border-r-4' : ci === 0 ? '' : ci === 2 ? 'border-l-4' : ''}`;

              return (
                <motion.button
                  key={`${ri}-${ci}`}
                  whileTap={!isOriginal ? { scale: 0.92 } : undefined}
                  onClick={() => handleCellClick(ri, ci)}
                  className={`aspect-square rounded-md flex items-center justify-center text-2xl sm:text-3xl font-extrabold border-2 ${borderClass} transition-all ${
                    isOriginal ? 'bg-purple-100 text-purple-700 cursor-default' : 'bg-white text-purple-900'
                  } ${isSelected ? 'ring-4 ring-yellow-400' : ''} ${isWrong ? 'animate-shake bg-red-200' : ''}`}
                >
                  {cell !== 0 ? cell : ''}
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        {[1, 2, 3, 4].map(n => (
          <motion.button
            whileTap={{ scale: 0.9 }}
            key={n}
            onClick={() => handleNumber(n)}
            disabled={!selected}
            className="btn-shadow flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 text-2xl sm:text-3xl font-extrabold text-white disabled:opacity-40"
          >
            {n}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClear}
          disabled={!selected}
          className="btn-shadow flex aspect-square items-center justify-center rounded-2xl bg-red-400 text-2xl text-white disabled:opacity-40"
        >
          🗑
        </motion.button>
      </div>

      <div className="text-center text-xs text-purple-700 font-bold">
        Đã điền: {moves} lần
      </div>
    </div>
  );
}