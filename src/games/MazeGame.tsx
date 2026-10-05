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
import { playWrong, playWin, playClick, playFail, playTick, playMove } from '../utils/sound';
import GameHeader from '../components/GameHeader';

type Dir = 'up' | 'down' | 'left' | 'right';
const DIR_DELTAS: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const DIR_EMOJI: Record<Dir, string> = {
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
};

interface MazeData {
  grid: number[][];
  start: [number, number];
  goal: [number, number];
  pathLen: number;
  size: number;
}

function bfsDist(grid: number[][], start: [number, number], goal: [number, number], size: number): number {
  const ds = Array.from({ length: size }, () => Array(size).fill(-1));
  ds[start[0]][start[1]] = 0;
  const q: [number, number][] = [[start[0], start[1]]];
  while (q.length) {
    const [r, c] = q.shift()!;
    if (r === goal[0] && c === goal[1]) return ds[r][c];
    for (const k of Object.keys(DIR_DELTAS) as Dir[]) {
      const [dr, dc] = DIR_DELTAS[k];
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== 1 && ds[nr][nc] === -1) {
        ds[nr][nc] = ds[r][c] + 1;
        q.push([nr, nc]);
      }
    }
  }
  return -1;
}

function generateMaze(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): MazeData {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);

  const minSize = mode === 'easy' ? 5 : mode === 'normal' ? 6 : 7;
  const maxSize = mode === 'easy' ? 8 : mode === 'normal' ? 9 : 10;
  const size = Math.min(minSize + Math.floor((level - 1) / 15), maxSize);

  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(1));
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const startR = Math.floor(rng() * size);
  const startC = Math.floor(rng() * size);

  function carve(r: number, c: number) {
    visited[r][c] = true;
    const dirs: Dir[] = ['up', 'right', 'down', 'left'];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const d of dirs) {
      const [dr, dc] = DIR_DELTAS[d];
      const nr = r + dr * 2;
      const nc = c + dc * 2;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        grid[r + dr][c + dc] = 0;
        grid[nr][nc] = 0;
        carve(nr, nc);
      }
    }
  }

  carve(startR, startC);

  // Tìm danh sách reachable
  const reachList: [number, number][] = [];
  const reachQueue: [number, number][] = [[startR, startC]];
  const reachable = Array.from({ length: size }, () => Array(size).fill(false));
  reachable[startR][startC] = true;
  while (reachQueue.length) {
    const [r, c] = reachQueue.shift()!;
    reachList.push([r, c]);
    for (const d of Object.keys(DIR_DELTAS) as Dir[]) {
      const [dr, dc] = DIR_DELTAS[d];
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] !== 1 && !reachable[nr][nc]) {
        reachable[nr][nc] = true;
        reachQueue.push([nr, nc]);
      }
    }
  }

  // Chọn goal xa nhất
  let bestGoal: [number, number] = reachList[0];
  let bestDist = -1;
  for (const [r, c] of reachList) {
    const d = Math.abs(r - startR) + Math.abs(c - startC);
    if (d > bestDist) {
      bestDist = d;
      bestGoal = [r, c];
    }
  }

  const finalGoal: [number, number] = bestGoal;
  grid[startR][startC] = 2;
  grid[finalGoal[0]][finalGoal[1]] = 3;

  // Tính pathLen
  let pathLen = bfsDist(grid, [startR, startC], finalGoal, size);

  // Thêm walls - tăng theo level
  const wallsToAdd = Math.floor((level - 1) / 5);
  let tries = 0;
  let wallAdded = 0;
  while (wallAdded < wallsToAdd && tries < 100) {
    tries++;
    const r = Math.floor(rng() * size);
    const c = Math.floor(rng() * size);
    if (grid[r][c] === 0 && !(r === startR && c === startC) && !(r === finalGoal[0] && c === finalGoal[1])) {
      grid[r][c] = 1;
      const newDist = bfsDist(grid, [startR, startC], finalGoal, size);
      if (newDist === -1) {
        grid[r][c] = 0;
      } else {
        wallAdded++;
        pathLen = newDist;
      }
    }
  }

  return {
    grid,
    start: [startR, startC],
    goal: finalGoal,
    pathLen: Math.max(pathLen, 0),
    size,
  };
}

const MAX_PROGRAM = 50;

export default function MazeGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const maze = useMemo(() => generateMaze('maze-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [program, setProgram] = useState<Dir[]>(initialState?.program ?? []);
  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState<[number, number]>(maze.start);
  const [steps, setSteps] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);
  const timeLimit = useMemo(() => {
    const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
    const baseTime = 20 + maze.pathLen * 3;
    return Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);
  }, [maze, mode]);

  const soundF = (fn: () => void) => { if (soundOn) fn(); };

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
            soundF(playFail);
            onComplete({
              score,
              accuracy: 0,
              timeMs,
              stars: 0,
              perfect: false,
              hintsUsed: 0,
              moves: steps,
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

  const addCommand = (d: Dir) => {
    if (running || completed || program.length >= MAX_PROGRAM) return;
    soundF(playClick);
    setProgram((p: Dir[]) => [...p, d]);
  };

  const clearProgram = () => {
    if (running) return;
    soundF(playClick);
    setProgram([]);
  };

  const undoProgram = () => {
    if (running) return;
    soundF(playClick);
    setProgram((p: Dir[]) => p.slice(0, -1));
  };

  const runProgram = () => {
    if (program.length === 0 || running || completed) return;
    setRunning(true);
    setPos(maze.start);
    setSteps(0);
    setCrashed(false);

    let r = maze.start[0];
    let c = maze.start[1];
    let i = 0;
    const totalSteps = program.length;
    const finalTimeLeft = timeLeft;

    const step = () => {
      if (i >= totalSteps || completedRef.current) {
        if (r === maze.goal[0] && c === maze.goal[1]) {
          completedRef.current = true;
          const timeMs = Date.now() - startTimeRef.current;
          const optimalMoves = maze.pathLen;
          const efficiency = optimalMoves / Math.max(totalSteps, optimalMoves);
          const score = Math.round(calculateScore(efficiency, timeMs, finalTimeLeft, totalSteps === optimalMoves, 0, mode));
          const stars = calculateStars(score);
          soundF(playWin);
          setCompleted(true);
          setTimeout(() => onComplete({
            score,
            accuracy: efficiency,
            timeMs,
            stars,
            perfect: totalSteps === optimalMoves,
            hintsUsed: 0,
            moves: totalSteps,
          }), 600);
        } else {
          completedRef.current = true;
          const timeMs = Date.now() - startTimeRef.current;
          const score = calculateScore(0.3, timeMs, finalTimeLeft, false, 0, mode);
          soundF(playFail);
          setTimeout(() => onComplete({
            score,
            accuracy: 0.3,
            timeMs,
            stars: 0,
            perfect: false,
            hintsUsed: 0,
            moves: totalSteps,
          }), 600);
        }
        return;
      }

      const d = program[i];
      const [dr, dc] = DIR_DELTAS[d];
      const nr = r + dr;
      const nc = c + dc;
      i++;

      if (nr < 0 || nr >= maze.size || nc < 0 || nc >= maze.size || maze.grid[nr][nc] === 1) {
        soundF(playWrong);
        setCrashed(true);
        setPos([r, c]);
        setSteps((s: number) => s + 1);
        setRunning(false);
        completedRef.current = true;
        const timeMs = Date.now() - startTimeRef.current;
        const score = calculateScore(0, timeMs, finalTimeLeft, false, 0, mode);
        setTimeout(() => onComplete({
          score,
          accuracy: 0,
          timeMs,
          stars: 0,
          perfect: false,
          hintsUsed: 0,
          moves: i,
        }), 800);
        return;
      }

      r = nr;
      c = nc;
      setPos([r, c]);
      setSteps((s: number) => s + 1);
      soundF(playMove);
      setTimeout(step, 280);
    };

    setTimeout(step, 300);
  };

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={timeLimit}
        emoji="🧭"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🧭 Robot Tìm Đường</h2>
        <p className="text-xs text-purple-600">Lập trình các lệnh để robot đến ⭐</p>
      </div>

      <div className="mb-3 flex justify-center">
        <div
          className="grid gap-0.5 rounded-2xl bg-purple-900 p-1"
          style={{
            gridTemplateColumns: `repeat(${maze.size}, 1fr)`,
            width: `min(${maze.size * 40}px, 90vw)`,
            aspectRatio: '1',
          }}
        >
          {maze.grid.map((row, ri) =>
            row.map((cell, ci) => {
              const isPlayer = pos[0] === ri && pos[1] === ci;
              const isStart = ri === maze.start[0] && ci === maze.start[1];
              const isGoal = ri === maze.goal[0] && ci === maze.goal[1];
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`relative flex aspect-square items-center justify-center rounded-md text-xl sm:text-2xl ${
                    cell === 1 ? 'bg-purple-900' : isGoal ? 'bg-yellow-300' : 'bg-white'
                  } ${crashed && isPlayer ? 'bg-red-300' : ''}`}
                >
                  {isStart && !isPlayer && '🤖'}
                  {isGoal && '⭐'}
                  {isPlayer && (
                    <motion.div
                      key={`${ri}-${ci}-${steps}`}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="text-2xl"
                    >
                      {crashed ? '💥' : '🤖'}
                    </motion.div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="glass mb-2 flex min-h-[36px] items-center gap-1 rounded-xl p-1.5 overflow-x-auto">
        {program.length === 0 ? (
          <span className="text-xs text-purple-400 px-2">Nhấn mũi tên bên dưới để lập trình</span>
        ) : (
          program.map((d, i) => (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={i}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 text-sm text-white"
            >
              {DIR_EMOJI[d]}
            </motion.div>
          ))
        )}
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5">
        <div />
        <button
          onClick={() => addCommand('up')}
          disabled={running}
          className="btn-shadow flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-2xl text-white disabled:opacity-50"
        >
          ⬆️
        </button>
        <div />
        <button
          onClick={() => addCommand('left')}
          disabled={running}
          className="btn-shadow flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-2xl text-white disabled:opacity-50"
        >
          ⬅️
        </button>
        <button
          onClick={() => addCommand('down')}
          disabled={running}
          className="btn-shadow flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-2xl text-white disabled:opacity-50"
        >
          ⬇️
        </button>
        <button
          onClick={() => addCommand('right')}
          disabled={running}
          className="btn-shadow flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-2xl text-white disabled:opacity-50"
        >
          ➡️
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={undoProgram}
          disabled={running}
          className="btn-shadow flex h-11 flex-1 items-center justify-center rounded-xl bg-yellow-400 text-lg font-bold text-white disabled:opacity-50"
        >
          ↶
        </button>
        <button
          onClick={runProgram}
          disabled={running || program.length === 0}
          className="btn-shadow flex h-11 flex-[2] items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 text-lg font-bold text-white disabled:opacity-50"
        >
          ▶ CHẠY
        </button>
        <button
          onClick={clearProgram}
          disabled={running}
          className="btn-shadow flex h-11 flex-1 items-center justify-center rounded-xl bg-red-400 text-lg font-bold text-white disabled:opacity-50"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}