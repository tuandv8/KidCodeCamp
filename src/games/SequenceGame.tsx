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

const PADS = [
  { id: 0, color: '#ef4444', emoji: '🍎', shadow: '#dc2626' },
  { id: 1, color: '#f59e0b', emoji: '🍊', shadow: '#d97706' },
  { id: 2, color: '#10b981', emoji: '🍋', shadow: '#059669' },
  { id: 3, color: '#3b82f6', emoji: '🫐', shadow: '#2563eb' },
];

function generateSequence(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number) {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);

  // Tăng độ khó theo stage
  const stage = getStage(level);
  const baseLen = stage.stage === 1 ? 3 : stage.stage === 2 ? 4 : stage.stage === 3 ? 5 : stage.stage === 4 ? 6 : 7;
  const seqLen = Math.min(baseLen + Math.floor((level - 1) / 15) + (mode === 'hard' ? 1 : 0), 10);
  const sequence: number[] = [];
  for (let i = 0; i < seqLen; i++) {
    sequence.push(Math.floor(rng() * 4));
  }

  const modeCfg = MODE_CONFIG[mode];
  const stageMul = stage.stage === 1 ? 1.3 : stage.stage === 2 ? 1.05 : stage.stage === 3 ? 0.85 : stage.stage === 4 ? 0.7 : 0.55;
  const baseTime = 5 + seqLen * 2;
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * stageMul * 1000);

  return { sequence, timeLimit };
}

export default function SequenceGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generateSequence('sequence-game', mode, level), [level, mode]);
  const stage = getStage(level);
  const [phase, setPhase] = useState<'showing' | 'input' | 'done'>(
    initialState?.phase ?? 'showing'
  );
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [showStep, setShowStep] = useState(0);
  const [inputStep, setInputStep] = useState(initialState?.inputStep ?? 0);
  const [timeLeft, setTimeLeft] = useState(puzzle.timeLimit);
  const [moves, setMoves] = useState(initialState?.moves ?? 0);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  const soundF = (fn: () => void) => { if (soundOn) fn(); };

  useEffect(() => {
    if (phase !== 'showing') return;
    if (showStep >= puzzle.sequence.length) {
      setPhase('input');
      return;
    }
    const id = setTimeout(() => {
      setActiveIdx(puzzle.sequence[showStep]);
      soundF(playPop);
      setTimeout(() => setActiveIdx(null), 350);
      setShowStep(s => s + 1);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, showStep]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 100) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            const timeMs = Date.now() - startTimeRef.current;
            const accuracy = inputStep / puzzle.sequence.length;
            const score = calculateScore(accuracy, timeMs, puzzle.timeLimit, false, 0, mode, stage.stage);
            soundF(playFail);
            onComplete({
              score,
              accuracy,
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

  const handlePad = (idx: number) => {
    if (phase !== 'input' || completedRef.current) return;
    soundF(playClick);
    setActiveIdx(idx);
    setTimeout(() => setActiveIdx(null), 200);
    setMoves((m: number) => m + 1);

    const expected = puzzle.sequence[inputStep];
    if (idx !== expected) {
      soundF(playWrong);
      setWrongFlash(idx);
      setTimeout(() => setWrongFlash(null), 400);
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const accuracy = inputStep / puzzle.sequence.length;
      const score = calculateScore(accuracy, timeMs, puzzle.timeLimit, false, 0, mode, stage.stage);
      setTimeout(() => onComplete({
        score,
        accuracy,
        timeMs,
        stars: calculateStars(score),
        perfect: false,
        hintsUsed: 0,
        moves: moves + 1,
      }), 700);
      return;
    }

    const newInputStep = inputStep + 1;
    setInputStep(newInputStep);

    if (newInputStep >= puzzle.sequence.length) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const score = calculateScore(1, timeMs, puzzle.timeLimit, moves === 0, 0, mode, stage.stage);
      const stars = calculateStars(score);
      soundF(playWin);
      setTimeout(() => onComplete({
        score,
        accuracy: 1,
        timeMs,
        stars,
        perfect: moves === 0,
        hintsUsed: 0,
        moves: moves + 1,
      }), 600);
    }
  };

  return (
    <div className="flex h-full flex-col p-3">
      <GameHeader
        level={level}
        mode={mode}
        timeLeft={timeLeft}
        timeLimit={puzzle.timeLimit}
        emoji="🎵"
        onExit={onExit}
        soundOn={soundOn}
      />

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🎵 Ghi Nhớ Chuỗi</h2>
        <p className="text-xs text-purple-600">
          {phase === 'showing' && '👀 Quan sát chuỗi phát sáng...'}
          {phase === 'input' && `Bấm theo đúng thứ tự (${inputStep}/${puzzle.sequence.length})`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 content-center">
        {PADS.map((pad) => {
          const isActive = activeIdx === pad.id;
          const isWrong = wrongFlash === pad.id;
          return (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={pad.id}
              onClick={() => handlePad(pad.id)}
              disabled={phase !== 'input'}
              className={`flex aspect-square items-center justify-center rounded-3xl text-6xl sm:text-7xl transition-all ${
                isActive ? 'scale-95 brightness-150' : ''
              } ${isWrong ? 'animate-shake' : ''} ${phase === 'showing' ? 'opacity-90' : ''}`}
              style={{
                background: pad.color,
                boxShadow: isActive
                  ? `0 0 0 6px white, 0 0 0 8px ${pad.color}, 0 0 30px ${pad.color}`
                  : `0 6px 0 ${pad.shadow}, 0 8px 20px ${pad.color}40`,
              }}
            >
              <span className={isActive ? 'animate-pop' : ''}>{pad.emoji}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-2 text-center text-sm text-purple-700 font-bold">
        {phase === 'showing' && '👀 Đang xem...'}
        {phase === 'input' && `Đã gõ: ${inputStep}/${puzzle.sequence.length}`}
      </div>
    </div>
  );
}