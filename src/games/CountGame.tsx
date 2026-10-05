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

interface CountLevel {
  groups: { emoji: string; count: number; color: string }[];
  options: number[];
  correctIdx: number;
  question: 'max' | 'min' | 'sum' | 'diff' | 'which';
  questionEmoji?: string;
  timeLimit: number;
}

const ALL_EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🌸', '🐱', '🐶', '🐼', '🦊'];
const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

function generateCount(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): CountLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];

  // Số nhóm và số phần tử tăng theo level
  const groupCount = Math.min(2 + Math.floor(level / 25), mode === 'hard' ? 5 : 4);
  const maxCount = mode === 'easy' ? 9 : mode === 'normal' ? 12 : 19;

  const groups: CountLevel['groups'] = [];
  const usedEmojis = new Set<string>();
  for (let i = 0; i < groupCount; i++) {
    let emoji: string;
    do {
      emoji = ALL_EMOJIS[Math.floor(rng() * ALL_EMOJIS.length)];
    } while (usedEmojis.has(emoji));
    usedEmojis.add(emoji);
    groups.push({
      emoji,
      count: Math.floor(rng() * maxCount) + 1,
      color: COLORS[i % COLORS.length],
    });
  }

  // Loại câu hỏi
  let question: 'max' | 'min' | 'sum' | 'diff' | 'which';
  if (level <= 30) question = 'max';
  else if (level <= 50) question = rng() < 0.5 ? 'max' : 'min';
  else if (level <= 75) {
    const r = rng();
    question = r < 0.3 ? 'max' : r < 0.6 ? 'min' : r < 0.8 ? 'sum' : 'diff';
  } else {
    const r = rng();
    question = r < 0.2 ? 'max' : r < 0.4 ? 'min' : r < 0.6 ? 'sum' : r < 0.85 ? 'diff' : 'which';
  }

  let correctAnswer: number;
  let questionEmoji: string | undefined;

  switch (question) {
    case 'max':
      correctAnswer = Math.max(...groups.map(g => g.count));
      break;
    case 'min':
      correctAnswer = Math.min(...groups.map(g => g.count));
      break;
    case 'sum':
      correctAnswer = groups.reduce((s, g) => s + g.count, 0);
      break;
    case 'diff':
      correctAnswer = Math.abs(groups[0].count - groups[1].count);
      break;
    case 'which': {
      const idx = Math.floor(rng() * groups.length);
      correctAnswer = groups[idx].count;
      questionEmoji = groups[idx].emoji;
      break;
    }
  }

  // Tạo 4 lựa chọn
  const options = new Set<number>();
  options.add(correctAnswer);
  while (options.size < 4) {
    const delta = (Math.floor(rng() * 5) + 1) * (mode === 'hard' ? 2 : 1);
    const sign = rng() < 0.5 ? 1 : -1;
    const wrong = correctAnswer + sign * delta;
    if (wrong > 0 && wrong !== correctAnswer) options.add(wrong);
  }
  const optionList = Array.from(options).slice(0, 4).sort(() => rng() - 0.5);

  const correctIdx = optionList.indexOf(correctAnswer);

  // Time
  const baseTime = 25 + groupCount * 3 + (question === 'sum' ? 5 : 0);
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * 1000);

  return { groups, options: optionList, correctIdx, question, questionEmoji, timeLimit };
}

const QUESTION_TEXT: Record<string, string> = {
  max: 'Nhóm nào có nhiều nhất?',
  min: 'Nhóm nào có ít nhất?',
  sum: 'Tổng cộng có bao nhiêu?',
  diff: 'Hai nhóm đầu hơn kém nhau bao nhiêu?',
  which: 'Nhóm này có bao nhiêu?',
};

export default function CountGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateCount('count-game', mode, level), [level, mode]);
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
        emoji="🧮"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🔢 Đếm & So Sánh</h2>
        <p className="text-xs text-purple-600">
          {puzzle.question === 'which' && puzzle.questionEmoji
            ? `${QUESTION_TEXT[puzzle.question]} ${puzzle.questionEmoji}`
            : QUESTION_TEXT[puzzle.question]}
        </p>
      </div>

      {/* Groups */}
      <div className="glass mb-3 rounded-2xl p-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {puzzle.groups.map((g, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-2xl p-2"
              style={{ background: g.color + '20' }}
            >
              <div className="mb-1 text-xs text-center font-bold" style={{ color: g.color }}>
                Nhóm {idx + 1}
              </div>
              <div className="flex flex-wrap gap-0.5 justify-center max-w-32">
                {Array.from({ length: g.count }).map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (idx * 0.1) + (i * 0.03) }}
                    className="text-2xl"
                  >
                    {g.emoji}
                  </motion.span>
                ))}
              </div>
              <div className="mt-1 text-center text-sm font-extrabold text-purple-900">
                {g.count} {g.emoji}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.options.map((num, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(num, idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl py-4 text-4xl sm:text-5xl font-extrabold ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === num && idx === puzzle.correctIdx ? 'bg-green-200' : ''} bg-gradient-to-br from-yellow-100 to-orange-100 text-purple-900`}
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