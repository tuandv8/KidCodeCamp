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

interface Cell {
  color: string;
  emoji: string;
}

interface Level {
  grid: Cell[][];
  rule: 'row-same' | 'col-same' | 'diagonal';
  answer: [number, number];
  options: Cell[][];
  answerIdx: number;
  gridSize: number;
  timeLimit: number;
}

function generateColorMatch(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): Level {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];

  // Kích thước bảng tăng theo level
  const size = mode === 'easy' ? 3 : mode === 'normal' ? 4 : 5;

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const emojis = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🌸', '🌻'];

  // Tạo bảng với quy luật
  const rule: 'row-same' | 'col-same' | 'diagonal' =
    level <= 30 ? 'row-same' :
    level <= 60 ? (rng() < 0.5 ? 'row-same' : 'col-same') :
    (rng() < 0.4 ? 'row-same' : rng() < 0.7 ? 'col-same' : 'diagonal');

  // Tạo target pattern - mỗi hàng/cột có 1 màu duy nhất
  const grid: Cell[][] = [];
  const usedColors: string[] = [];

  for (let i = 0; i < size; i++) {
    let rowColor: string;
    do {
      rowColor = colors[Math.floor(rng() * colors.length)];
    } while (usedColors.includes(rowColor) && usedColors.length < colors.length);
    usedColors.push(rowColor);

    const row: Cell[] = [];
    for (let j = 0; j < size; j++) {
      row.push({
        color: rowColor,
        emoji: emojis[Math.floor(rng() * emojis.length)],
      });
    }
    grid.push(row);
  }

  // Tạo 1 ô trống
  const emptyRow = Math.floor(rng() * size);
  const emptyCol = Math.floor(rng() * size);
  const expectedColor = grid[emptyRow][emptyCol].color;
  const expectedEmoji = grid[emptyRow][emptyCol].emoji;
  grid[emptyRow][emptyCol] = { color: 'transparent', emoji: '?' };

  // Tạo 4 lựa chọn
  const options: Cell[][] = [];
  const answerIdx = Math.floor(rng() * 4);

  for (let i = 0; i < 4; i++) {
    if (i === answerIdx) {
      options.push([{ color: expectedColor, emoji: expectedEmoji }]);
    } else {
      // Sai: dùng màu khác
      let wrongColor: string;
      do {
        wrongColor = colors[Math.floor(rng() * colors.length)];
      } while (wrongColor === expectedColor);
      options.push([{ color: wrongColor, emoji: emojis[Math.floor(rng() * emojis.length)] }]);
    }
  }

  // Time limit
  const baseTime = 25 + size * 5;
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * 1000);

  return {
    grid,
    rule,
    answer: [emptyRow, emptyCol],
    options,
    answerIdx,
    gridSize: size,
    timeLimit,
  };
}

const RULE_TEXT: Record<string, string> = {
  'row-same': 'Mỗi hàng phải có cùng màu',
  'col-same': 'Mỗi cột phải có cùng màu',
  'diagonal': 'Đường chéo phải cùng màu',
};

export default function ColorMatchGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateColorMatch('color-match-game', mode, level), [level, mode]);
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

    if (idx === puzzle.answerIdx) {
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
        emoji="🎨"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🎨 Ghép Màu</h2>
        <p className="text-xs text-purple-600">{RULE_TEXT[puzzle.rule]}</p>
      </div>

      {/* Grid */}
      <div className="mb-3 flex justify-center">
        <div
          className="grid gap-1 rounded-2xl bg-white/80 p-2 shadow-lg"
          style={{
            gridTemplateColumns: `repeat(${puzzle.gridSize}, 1fr)`,
            width: `min(${puzzle.gridSize * 70}px, 90vw)`,
          }}
        >
          {puzzle.grid.map((row, ri) =>
            row.map((cell, ci) => {
              const isEmpty = cell.color === 'transparent';
              return (
                <motion.div
                  key={`${ri}-${ci}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: (ri * puzzle.gridSize + ci) * 0.04 }}
                  className={`flex aspect-square items-center justify-center rounded-xl text-3xl sm:text-4xl ${
                    isEmpty ? 'border-4 border-dashed border-purple-400 bg-purple-50 animate-pulse' : ''
                  }`}
                  style={!isEmpty ? { background: cell.color + '40' } : undefined}
                >
                  {isEmpty ? '❓' : cell.emoji}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.options.map((opt, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex items-center justify-center gap-2 rounded-2xl p-3 text-4xl ${
              wrongIdx === idx ? 'animate-shake' : ''
            } ${selected === idx && idx === puzzle.answerIdx ? 'bg-green-200' : ''}`}
            style={{ background: opt[0].color + '40' }}
          >
            <span>{opt[0].emoji}</span>
            <span className="h-6 w-6 rounded-full" style={{ background: opt[0].color }} />
          </motion.button>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}