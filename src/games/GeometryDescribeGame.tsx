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

interface Shape {
  sides: number;      // số cạnh
  corners: number;    // số đỉnh
  hasCurve: boolean;   // có đường cong không
  isRegular: boolean;  // đều hay không
  name: string;
  emoji: string;
  color: string;
}

interface GeometryLevel {
  description: string;
  properties: string[];   // các tính chất
  shapes: Shape[];        // 4 hình lựa chọn
  correctIdx: number;
  shapeName: string;
  timeLimit: number;
}

const SHAPE_LIBRARY: Shape[] = [
  // Tam giác
  { sides: 3, corners: 3, hasCurve: false, isRegular: true, name: 'Tam giác đều', emoji: '🔺', color: '#ef4444' },
  { sides: 3, corners: 3, hasCurve: false, isRegular: false, name: 'Tam giác thường', emoji: '📐', color: '#f97316' },
  // Tứ giác
  { sides: 4, corners: 4, hasCurve: false, isRegular: true, name: 'Hình vuông', emoji: '🟥', color: '#10b981' },
  { sides: 4, corners: 4, hasCurve: false, isRegular: false, name: 'Hình chữ nhật', emoji: '▭', color: '#14b8a6' },
  { sides: 4, corners: 4, hasCurve: false, isRegular: false, name: 'Hình thoi', emoji: '◆', color: '#06b6d4' },
  // Ngũ giác
  { sides: 5, corners: 5, hasCurve: false, isRegular: true, name: 'Ngũ giác đều', emoji: '⬠', color: '#3b82f6' },
  { sides: 5, corners: 5, hasCurve: false, isRegular: false, name: 'Ngũ giác', emoji: '⬡', color: '#6366f1' },
  // Lục giác
  { sides: 6, corners: 6, hasCurve: false, isRegular: true, name: 'Lục giác đều', emoji: '⬢', color: '#8b5cf6' },
  // Tròn
  { sides: 0, corners: 0, hasCurve: true, isRegular: true, name: 'Hình tròn', emoji: '🔴', color: '#a855f7' },
  // Bầu dục
  { sides: 0, corners: 0, hasCurve: true, isRegular: false, name: 'Hình bầu dục', emoji: '🥚', color: '#ec4899' },
  // Bán nguyệt
  { sides: 1, corners: 0, hasCurve: true, isRegular: false, name: 'Nửa hình tròn', emoji: '🌗', color: '#f43f5e' },
  // Ngôi sao
  { sides: 10, corners: 10, hasCurve: false, isRegular: true, name: 'Ngôi sao', emoji: '⭐', color: '#fbbf24' },
];

function generateDescription(shape: Shape): string {
  const parts: string[] = [];

  if (shape.hasCurve) {
    if (shape.sides === 0) {
      parts.push(shape.name.includes('bầu') ? 'Hình có đường cong kín' : 'Hình tròn, không có cạnh và đỉnh');
    } else {
      parts.push('Có cả đường thẳng và đường cong');
    }
  } else {
    parts.push(`Có ${shape.sides} cạnh`);
    parts.push(`Có ${shape.corners} đỉnh`);
  }

  if (shape.isRegular && !shape.hasCurve) {
    parts.push('Các cạnh bằng nhau');
  }

  return parts.join(', ');
}

function generateGeometryLevel(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): GeometryLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);

  // Theo stage, chọn loại hình khác nhau
  let pool: Shape[];
  if (stage.stage === 1) {
    pool = SHAPE_LIBRARY.filter(s => ['Hình vuông', 'Hình tròn', 'Tam giác đều', 'Hình chữ nhật'].includes(s.name));
  } else if (stage.stage === 2) {
    pool = SHAPE_LIBRARY.filter(s => s.corners <= 4);
  } else if (stage.stage === 3) {
    pool = SHAPE_LIBRARY.filter(s => s.sides <= 6 || s.hasCurve);
  } else {
    pool = SHAPE_LIBRARY.slice();
  }

  // Chọn hình đúng
  const correctIdx = Math.floor(rng() * pool.length);
  const correct = pool[correctIdx];

  // Tạo các hình sai khác
  const wrongShapes: Shape[] = [];
  while (wrongShapes.length < 3 && wrongShapes.length < pool.length - 1) {
    const candidate = pool[Math.floor(rng() * pool.length)];
    if (candidate.name !== correct.name && !wrongShapes.some(s => s.name === candidate.name)) {
      wrongShapes.push(candidate);
    }
  }

  // Pad nếu không đủ
  while (wrongShapes.length < 3) {
    wrongShapes.push(SHAPE_LIBRARY[wrongShapes.length]);
  }

  const shapes = [correct, ...wrongShapes].slice(0, 4);
  // Shuffle
  for (let i = shapes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }

  const finalCorrectIdx = shapes.findIndex(s => s.name === correct.name);
  const description = generateDescription(correct);

  // Tạo danh sách tính chất
  const properties: string[] = [];
  if (correct.hasCurve) {
    if (correct.name.includes('tròn')) {
      properties.push('🔵 Có đường cong');
      properties.push('⭕ Không có cạnh');
      properties.push('⭕ Không có đỉnh');
    } else if (correct.name.includes('bầu')) {
      properties.push('🥚 Giống quả trứng');
      properties.push('🔵 Có đường cong');
    }
  } else {
    properties.push(`📐 Có ${correct.sides} cạnh`);
    properties.push(`📍 Có ${correct.corners} đỉnh`);
    if (correct.isRegular) {
      properties.push('✨ Các cạnh bằng nhau');
    }
  }

  // Time limit
  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 30;
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return {
    description,
    properties,
    shapes,
    correctIdx: finalCorrectIdx,
    shapeName: correct.name,
    timeLimit,
  };
}

export default function GeometryDescribeGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateGeometryLevel('geometry-describe-game', mode, level), [level, mode]);
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
        emoji="📐"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">📐 Toán Mô Tả Hình</h2>
        <p className="text-xs text-purple-600">Đọc mô tả và chọn hình đúng</p>
      </div>

      {/* Description */}
      <div className="glass mb-3 rounded-2xl p-3">
        <div className="mb-2 text-center">
          <div className="text-xs font-bold text-purple-600 mb-1">📝 Mô tả hình:</div>
          <div className="text-base font-extrabold text-purple-900">
            "{puzzle.description}"
          </div>
        </div>
        <div className="border-t border-purple-200 pt-2">
          <div className="text-xs font-bold text-purple-600 mb-1">🔍 Tính chất:</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {puzzle.properties.map((p, i) => (
              <span key={i} className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Shape options */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.shapes.map((shape, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex flex-col items-center justify-center rounded-2xl p-3 transition-all ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === idx && idx === puzzle.correctIdx ? 'bg-green-200' : 'bg-white'}`}
          >
            <div className="text-5xl sm:text-6xl mb-1">{shape.emoji}</div>
            <div className="text-xs font-bold text-purple-800 text-center">
              {shape.name}
            </div>
            <div className="text-[10px] text-purple-500 mt-1">
              {shape.hasCurve
                ? '⭕ Đường cong'
                : `${shape.sides} cạnh, ${shape.corners} đỉnh`}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}