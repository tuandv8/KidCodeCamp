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

interface PatternItem {
  emoji: string;
  color: string;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🍑', '🌸', '🌺', '⭐', '🌙', '☀️', '🌈', '🎈', '🎁', '🦄', '🐱', '🐶', '🐼'];

function generatePattern(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number) {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];

  // Tăng độ khó theo stage
  const stage = getStage(level);
  const stageBaseLen = stage.stage === 1 ? 3 : stage.stage === 2 ? 4 : stage.stage === 3 ? 5 : stage.stage === 4 ? 6 : 7;
  const bonus = Math.min(Math.floor((level - 1) / 12), 3);
  const seqLen = stageBaseLen + bonus + (mode === 'hard' ? 1 : 0);

  const typeCount = Math.min(3 + Math.floor(level / 15) + (mode === 'hard' ? 2 : 0), 7);

  const pool: PatternItem[] = [];
  for (let i = 0; i < typeCount; i++) {
    pool.push({
      emoji: EMOJIS[Math.floor(rng() * EMOJIS.length)],
      color: COLORS[i % COLORS.length],
    });
  }

  // Cycle length tăng theo level
  const cycleLen = Math.min(2 + Math.floor((level - 1) / 25) + (mode === 'hard' ? 1 : 0), 5);
  const cycle: PatternItem[] = [];
  for (let i = 0; i < cycleLen; i++) {
    cycle.push(pool[Math.floor(rng() * pool.length)]);
  }

  const sequence: PatternItem[] = [];
  for (let i = 0; i < seqLen; i++) {
    sequence.push(cycle[i % cycleLen]);
  }

  const missingIdx = Math.floor(rng() * seqLen);
  const correctAnswer = sequence[missingIdx];

  const choices = new Set<string>();
  choices.add(correctAnswer.emoji);
  let attempts = 0;
  while (choices.size < 4 && attempts < 60) {
    const c = pool[Math.floor(rng() * pool.length)];
    if (c.emoji !== sequence[(missingIdx + 1) % seqLen].emoji &&
        c.emoji !== sequence[(missingIdx - 1 + seqLen) % seqLen].emoji) {
      choices.add(c.emoji);
    }
    attempts++;
  }
  while (choices.size < 4) {
    choices.add(EMOJIS[Math.floor(rng() * EMOJIS.length)]);
  }

  const choiceList = Array.from(choices).sort(() => rng() - 0.5);

  // Time theo stage
  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 18 + seqLen * 3;
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * stageMul * 1000);

  return {
    sequence,
    missingIdx,
    choices: choiceList,
    correctAnswer,
    timeLimit,
  };
}

export default function PatternGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generatePattern('pattern-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [selected, setSelected] = useState<string | null>(initialState?.selected ?? null);
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
            onComplete({
              score,
              accuracy: 0,
              timeMs,
              stars: 0,
              perfect: false,
              hintsUsed: 0,
              moves,
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

  const handleSelect = (emoji: string, idx: number) => {
    if (completedRef.current) return;
    soundF(playClick);
    setSelected(emoji);
    const newMoves = moves + 1;
    setMoves(newMoves);

    if (emoji === puzzle.correctAnswer.emoji) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const accuracy = newMoves === 1 ? 1 : Math.max(0, 1 - (newMoves - 1) * 0.3);
      const score = calculateScore(accuracy, timeMs, puzzle.timeLimit, moves === 0, 0, mode, stage.stage);
      const stars = calculateStars(score);
      soundF(playWin);
      setTimeout(() => onComplete({
        score,
        accuracy,
        timeMs,
        stars,
        perfect: moves === 0,
        hintsUsed: 0,
        moves: newMoves,
      }), 500);
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
        emoji="🧩"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🔍 Tìm Quy Luật</h2>
        <p className="text-xs text-purple-600">Hình nào còn thiếu?</p>
      </div>

      <div className="glass mb-3 rounded-2xl p-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {puzzle.sequence.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.04 }}
              className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-2xl sm:text-3xl ${
                idx === puzzle.missingIdx ? 'border-4 border-dashed border-purple-400 bg-purple-50 animate-pulse' : ''
              }`}
              style={idx !== puzzle.missingIdx ? { background: item.color + '30', boxShadow: `0 3px 0 ${item.color}50` } : undefined}
            >
              {idx === puzzle.missingIdx ? '❓' : item.emoji}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.choices.map((emoji, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(emoji, idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 py-3 text-4xl sm:text-5xl ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === emoji && emoji === puzzle.correctAnswer.emoji ? 'bg-green-200' : ''}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}