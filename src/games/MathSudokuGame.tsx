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

type CellValue = number; // 0 nếu trống, 1-9 nếu có
type Op = '+' | '-' | '×' | '÷';

interface MathSudokuLevel {
  // Sudoku toán: mỗi hàng/cột là một phép tính hợp lệ
  // puzzle: ma trận với 1 số ở mỗi ô (1-9), 0 = trống
  // Mỗi hàng có phép tính theo rowOp cho ra rowResult
  // Mỗi cột có phép tính theo colOp cho ra colResult
  puzzle: CellValue[][];
  solution: CellValue[][];
  rowOps: Op[];
  colOps: Op[];
  rowResults: number[];
  colResults: number[];
  timeLimit: number;
}

// Tạo sudoku toán 4x4 với phép cộng/trừ đơn giản
// Mỗi hàng có 4 ô số (1-9), phép tính rowOp, kết quả rowResult
// Ví dụ: 2 + 5 + 3 + 1 = 11
function generateMathSudoku(rng: () => number, stage: number, mode: 'easy' | 'normal' | 'hard'): MathSudokuLevel {
  const size = mode === 'easy' ? 3 : 4;

  // Số lượng ô trống tăng theo stage
  const blanks = stage === 1 ? 2 : stage === 2 ? 4 : stage === 3 ? 6 : stage === 4 ? 8 : 10;

  // Random puzzle với 4 số 1-9 cho mỗi hàng
  const solution: CellValue[][] = [];
  for (let i = 0; i < size; i++) {
    const row: CellValue[] = [];
    for (let j = 0; j < size; j++) {
      row.push(Math.floor(rng() * 9) + 1);
    }
    solution.push(row);
  }

  // Phép tính cho hàng và cột (chỉ cộng/trừ cho đơn giản)
  const rowOps: Op[] = [];
  const colOps: Op[] = [];
  for (let i = 0; i < size; i++) {
    rowOps.push(rng() < 0.6 ? '+' : '-');
    colOps.push(rng() < 0.6 ? '+' : '-');
  }

  // Tính kết quả
  const rowResults: number[] = [];
  const colResults: number[] = [];

  for (let i = 0; i < size; i++) {
    let rowVal = solution[i][0];
    for (let j = 1; j < size; j++) {
      if (rowOps[i] === '+') rowVal += solution[i][j];
      else rowVal -= solution[i][j];
    }
    rowResults.push(rowVal);
  }

  for (let j = 0; j < size; j++) {
    let colVal = solution[0][j];
    for (let i = 1; i < size; i++) {
      if (colOps[j] === '+') colVal += solution[i][j];
      else colVal -= solution[i][j];
    }
    colResults.push(colVal);
  }

  // Tạo puzzle: xóa random cells nhưng giữ nguyên solution
  const puzzle: CellValue[][] = solution.map(r => [...r]);
  const positions = Array.from({ length: size * size }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (let i = 0; i < blanks && i < positions.length; i++) {
    const pos = positions[i];
    const r = Math.floor(pos / size);
    const c = pos % size;
    puzzle[r][c] = 0;
  }

  // Time limit theo stage
  const stageMul = stage === 1 ? 1.4 : stage === 2 ? 1.15 : stage === 3 ? 0.95 : stage === 4 ? 0.8 : 0.65;
  const baseTime = 60 + blanks * 8;
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return {
    puzzle,
    solution,
    rowOps,
    colOps,
    rowResults,
    colResults,
    timeLimit,
  };
}

function generateMathSudokuLevel(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): MathSudokuLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);
  return generateMathSudoku(rng, stage.stage, mode);
}

export default function MathSudokuGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateMathSudokuLevel('math-sudoku-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const size = puzzle.puzzle.length;

  const [grid, setGrid] = useState<CellValue[][]>(initialState?.grid ?? puzzle.puzzle);
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
    if (puzzle.puzzle[r][c] !== 0) return;
    soundF(playClick);
    setSelected([r, c]);
  };

  const handleNumber = (num: number) => {
    if (completedRef.current || !selected) return;
    const [r, c] = selected;
    soundF(playClick);
    setMoves((m: number) => m + 1);

    const correct = puzzle.solution[r][c];

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
      setTimeout(() => {
        setGrid((g) => {
          let isComplete = true;
          for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              if (g[i][j] !== puzzle.solution[i][j]) {
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

  // Kiểm tra logic hiện tại: mỗi hàng và cột phải khớp với kết quả
  const checkRow = (r: number): boolean => {
    if (grid[r].some(v => v === 0)) return false;
    let val = grid[r][0];
    for (let j = 1; j < size; j++) {
      if (puzzle.rowOps[r] === '+') val += grid[r][j];
      else val -= grid[r][j];
    }
    return val === puzzle.rowResults[r];
  };

  const checkCol = (c: number): boolean => {
    if (grid.some(row => row[c] === 0)) return false;
    let val = grid[0][c];
    for (let i = 1; i < size; i++) {
      if (puzzle.colOps[c] === '+') val += grid[i][c];
      else val -= grid[i][c];
    }
    return val === puzzle.colResults[c];
  };

  const cellSize = Math.max(45, Math.min(70, Math.floor(280 / size)));

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={puzzle.timeLimit}
        emoji="➕"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">➕ Toán Sudoku</h2>
        <p className="text-xs text-purple-600">Điền số 1-9 sao cho mỗi hàng và cột có kết quả đúng</p>
      </div>

      {/* Grid với operations */}
      <div className="glass mb-2 rounded-2xl p-2 flex justify-center">
        <div className="flex items-center gap-1">
          <div
            className="grid gap-1 bg-purple-300 p-1 rounded-xl"
            style={{
              gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
            }}
          >
            {grid.map((row, ri) =>
              row.map((cell, ci) => {
                const isOriginal = puzzle.puzzle[ri][ci] !== 0;
                const isSelected = selected && selected[0] === ri && selected[1] === ci;
                const isWrong = wrongCell && wrongCell[0] === ri && wrongCell[1] === ci;
                return (
                  <motion.button
                    key={`${ri}-${ci}`}
                    whileTap={!isOriginal ? { scale: 0.92 } : undefined}
                    onClick={() => handleCellClick(ri, ci)}
                    className={`rounded-md flex items-center justify-center font-extrabold border-2 transition-all ${
                      isOriginal ? 'bg-purple-100 text-purple-700 cursor-default' : 'bg-white text-purple-900'
                    } ${isSelected ? 'ring-4 ring-yellow-400' : ''} ${isWrong ? 'animate-shake bg-red-200' : ''}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      fontSize: cellSize * 0.4,
                    }}
                  >
                    {cell !== 0 ? cell : ''}
                  </motion.button>
                );
              })
            )}
          </div>
          {/* Column operations + results */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={`col-${i}`}
                className={`flex items-center justify-center rounded-md font-extrabold ${
                  checkCol(i) && grid.some(r => r[i] !== 0) ? 'bg-green-200 text-green-800' : 'bg-purple-100 text-purple-700'
                }`}
                style={{ width: cellSize, height: cellSize }}
              >
                {puzzle.colOps[i]} {puzzle.colResults[i]}
              </div>
            ))}
          </div>
        </div>

        {/* Row operations + results */}
        <div className="ml-1 flex flex-col gap-1 justify-center">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={`row-${i}`}
              className={`flex items-center justify-center rounded-md font-extrabold ${
                checkRow(i) && grid[i].some(v => v !== 0) ? 'bg-green-200 text-green-800' : 'bg-purple-100 text-purple-700'
              }`}
              style={{ width: cellSize * 1.4, height: cellSize * 0.5 }}
            >
              {puzzle.rowOps[i]} {puzzle.rowResults[i]}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-center text-purple-600 mb-2 italic">
        Mỗi hàng có phép tính = kết quả. Mỗi cột cũng vậy.
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <motion.button
            whileTap={{ scale: 0.9 }}
            key={n}
            onClick={() => handleNumber(n)}
            disabled={!selected}
            className="btn-shadow flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 text-xl sm:text-2xl font-extrabold text-white disabled:opacity-40"
          >
            {n}
          </motion.button>
        ))}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClear}
          disabled={!selected}
          className="btn-shadow flex aspect-square items-center justify-center rounded-2xl bg-red-400 text-xl text-white disabled:opacity-40"
        >
          🗑
        </motion.button>
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Đã điền: {moves} lần
      </div>
    </div>
  );
}