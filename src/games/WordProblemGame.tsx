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

interface WordLevel {
  story: string;
  question: string;
  options: number[];
  correctIdx: number;
  visual: { emoji: string; count: number }[];
  hint?: string;
  timeLimit: number;
}

function generateWordProblem(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): WordLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const stage = getStage(level);

  // Theo stage, các dạng bài tăng dần
  const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🍑'];
  const ANIMALS = ['🐱', '🐶', '🐰', '🐼', '🐯', '🦊', '🐻', '🐨'];
  const TOYS = ['🎈', '🎁', '🧸', '🎨', '🎲', '🪀', '🎯', '🎳'];

  let story = '';
  let question = '';
  let options: number[] = [];
  let correctAnswer = 0;
  let visual: { emoji: string; count: number }[] = [];
  let hint: string | undefined;

  if (stage.stage === 1) {
    // Đếm + cộng đơn giản
    const fruit = FRUITS[Math.floor(rng() * FRUITS.length)];
    const a = 1 + Math.floor(rng() * 5);
    const b = 1 + Math.floor(rng() * 5);
    correctAnswer = a + b;
    story = `Bé có ${a} ${fruit}. Mẹ cho thêm ${b} ${fruit}. Hỏi bé có tất cả bao nhiêu ${fruit}?`;
    question = `Bé có bao nhiêu ${fruit}?`;
    visual = [{ emoji: fruit, count: a + b }];
    hint = `Cộng: ${a} + ${b}`;

    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 5) - 2;
      if (w !== correctAnswer && w > 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else if (stage.stage === 2) {
    // Trừ
    const fruit = FRUITS[Math.floor(rng() * FRUITS.length)];
    const a = 5 + Math.floor(rng() * 8);
    const b = 1 + Math.floor(rng() * (a - 1));
    correctAnswer = a - b;
    story = `Bé có ${a} ${fruit}. Bé cho bạn ${b} ${fruit}. Hỏi bé còn lại bao nhiêu ${fruit}?`;
    question = `Bé còn lại bao nhiêu ${fruit}?`;
    visual = [{ emoji: fruit, count: a - b }];
    hint = `Trừ: ${a} - ${b}`;

    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 5) - 2;
      if (w !== correctAnswer && w >= 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else if (stage.stage === 3) {
    // Tổng 2 nhóm
    const toy = TOYS[Math.floor(rng() * TOYS.length)];
    void toy;
    const a = 1 + Math.floor(rng() * 6);
    const b = 1 + Math.floor(rng() * 6);
    correctAnswer = a + b;
    story = `Bé An có ${a} ${toy}, bé Bình có ${b} ${toy}. Hỏi cả hai bé có bao nhiêu ${toy}?`;
    question = `Cả hai bé có bao nhiêu ${toy}?`;
    visual = [{ emoji: toy, count: a + b }];
    hint = `Cộng hai nhóm: ${a} + ${b}`;

    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 6) - 3;
      if (w !== correctAnswer && w > 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else if (stage.stage === 4) {
    // So sánh 2 nhóm - nhiều hơn / ít hơn
    const fruit = FRUITS[Math.floor(rng() * FRUITS.length)];
    const a = 3 + Math.floor(rng() * 8);
    const b = 3 + Math.floor(rng() * 8);
    const diff = Math.abs(a - b);
    story = `Bé có ${a} ${fruit}, em có ${b} ${fruit}. Hỏi bé có nhiều hơn em bao nhiêu ${fruit}?`;
    question = `Bé nhiều hơn em bao nhiêu?`;
    visual = [{ emoji: fruit, count: diff }];
    correctAnswer = diff;
    hint = a > b ? `Hiệu: ${a} - ${b}` : `Hiệu: ${b} - ${a}`;

    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 5) - 2;
      if (w !== correctAnswer && w >= 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  } else {
    // Nhân / Chia đơn giản
    const animal = ANIMALS[Math.floor(rng() * ANIMALS.length)];
    const groups = 2 + Math.floor(rng() * 3);
    const perGroup = 2 + Math.floor(rng() * 3);
    correctAnswer = groups * perGroup;
    story = `Có ${groups} lồng, mỗi lồng có ${perGroup} con ${animal}. Hỏi có tất cả bao nhiêu con ${animal}?`;
    question = `Có bao nhiêu con ${animal}?`;
    visual = [{ emoji: animal, count: correctAnswer }];
    hint = `Nhân: ${groups} × ${perGroup}`;

    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const w = correctAnswer + Math.floor(rng() * 6) - 3;
      if (w !== correctAnswer && w > 0) wrong.add(w);
    }
    options = [correctAnswer, ...Array.from(wrong)];
  }

  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctIdx = options.indexOf(correctAnswer);

  const stageMul = stage.stage === 1 ? 1.4 : stage.stage === 2 ? 1.15 : stage.stage === 3 ? 0.95 : stage.stage === 4 ? 0.8 : 0.65;
  const baseTime = 40;
  const timeLimit = Math.round(baseTime * MODE_CONFIG[mode].timeMultiplier * stageMul * 1000);

  return { story, question, options, correctIdx, visual, hint, timeLimit };
}

export default function WordProblemGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateWordProblem('word-problem-game', mode, level), [level, mode]);
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
        emoji="📚"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">📚 Toán Có Lời Văn</h2>
        <p className="text-xs text-purple-600">{puzzle.question}</p>
      </div>

      <div className="glass mb-2 rounded-2xl p-3">
        <p className="text-sm text-purple-800 leading-relaxed mb-2">{puzzle.story}</p>
        {puzzle.visual.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center bg-yellow-50 rounded-xl p-2">
            {puzzle.visual[0].count > 0 ? (
              Array.from({ length: Math.min(puzzle.visual[0].count, 30) }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="text-2xl"
                >
                  {puzzle.visual[0].emoji}
                </motion.span>
              ))
            ) : (
              <span className="text-purple-500 text-xs">Không còn gì</span>
            )}
          </div>
        )}
        {puzzle.hint && (
          <p className="text-xs text-pink-600 mt-2 text-center italic">💡 {puzzle.hint}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {puzzle.options.map((opt, idx) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`btn-shadow flex items-center justify-center rounded-2xl py-4 text-3xl sm:text-4xl font-extrabold transition-all ${
              wrongIdx === idx ? 'animate-shake bg-red-200' : ''
            } ${selected === idx && idx === puzzle.correctIdx ? 'bg-green-200' : 'bg-gradient-to-br from-yellow-100 to-orange-100 text-purple-900'}`}
          >
            {opt}
          </motion.button>
        ))}
      </div>

      <div className="mt-2 text-center text-xs text-purple-700 font-bold">
        Thử: {moves} lần
      </div>
    </div>
  );
}