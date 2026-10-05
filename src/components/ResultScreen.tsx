import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameResult } from '../games/types';
import { playStar, playWin } from '../utils/sound';

interface Props {
  result: GameResult;
  level: number;
  gameEmoji: string;
  onNext: () => void;
  onRetry: () => void;
  onBack: () => void;
  soundOn: boolean;
}

export default function ResultScreen({ result, level, gameEmoji, onNext, onRetry, onBack, soundOn }: Props) {
  const [showStars, setShowStars] = useState(0);
  const score = result.score;
  const stars = result.stars;
  const passed = score >= 50;

  useEffect(() => {
    if (!soundOn) return;
    // Star reveal sequence
    const timers: number[] = [];
    for (let i = 0; i < stars; i++) {
      timers.push(window.setTimeout(() => playStar(), 300 + i * 350));
    }
    if (stars === 3) {
      timers.push(window.setTimeout(() => playWin(), 1400));
    }
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [stars, soundOn]);

  useEffect(() => {
    if (!soundOn) return;
    const t1 = setTimeout(() => setShowStars(Math.min(stars, 1)), 300);
    const t2 = setTimeout(() => setShowStars(Math.min(stars, 2)), 700);
    const t3 = setTimeout(() => setShowStars(Math.min(stars, 3)), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [stars, soundOn]);

  // Time display
  const timeS = (result.timeMs / 1000).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ delay: 0.2 }}
            className="mb-3 text-6xl"
          >
            {passed ? (stars === 3 ? '🏆' : '🎉') : '😢'}
          </motion.div>

          <h2 className={`text-2xl font-extrabold ${passed ? 'text-purple-800' : 'text-red-600'}`}>
            {passed ? (stars === 3 ? 'Hoàn Hảo!' : 'Tuyệt Vời!') : 'Cố Lên Nhé!'}
          </h2>
          <div className="text-sm text-purple-600 mb-3">Level {level} • {gameEmoji}</div>

          {/* Stars */}
          <div className="mb-4 flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <AnimatePresence key={i}>
                {showStars > i && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="text-5xl"
                  >
                    ⭐
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>

          {/* Score */}
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-4">
            <div className="text-xs text-purple-700">Điểm số</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="text-5xl font-extrabold text-purple-900"
            >
              {score}
            </motion.div>
            <div className="text-xs text-purple-600">/ 100</div>
          </div>

          {/* Stats */}
          <div className="mb-5 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-blue-50 p-2">
              <div className="text-xs text-blue-700">Độ chính xác</div>
              <div className="font-extrabold text-blue-900">{Math.round(result.accuracy * 100)}%</div>
            </div>
            <div className="rounded-xl bg-green-50 p-2">
              <div className="text-xs text-green-700">Thời gian</div>
              <div className="font-extrabold text-green-900">{timeS}s</div>
            </div>
            <div className="rounded-xl bg-yellow-50 p-2">
              <div className="text-xs text-yellow-700">Số bước</div>
              <div className="font-extrabold text-yellow-900">{result.moves}</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            {passed && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onNext}
                className="btn-shadow w-full rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 py-3 text-lg font-extrabold text-white"
              >
                ▶ Level Tiếp Theo
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onRetry}
              className="btn-shadow w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3 text-lg font-extrabold text-white"
            >
              🔄 Chơi Lại
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onBack}
              className="btn-shadow w-full rounded-2xl bg-white border-2 border-purple-200 py-3 text-lg font-extrabold text-purple-700"
            >
              ⬅️ Về Menu
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}