import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getGame } from '../games';
import type { GameConfig, GameMode, GameResult } from '../games/types';
import { AppData, GameSave, saveCurrentGame, clearSavedGame, recordProgress } from '../utils/storage';
import ResultScreen from './ResultScreen';
import { playClick } from '../utils/sound';

interface GameRendererProps {
  game: GameConfig;
  level: number;
  mode: GameMode;
  soundOn: boolean;
  savedGame?: GameSave;
  onComplete: (res: GameResult) => void;
  onExit: () => void;
}

function GameRenderer({ game, level, mode, soundOn, savedGame, onComplete, onExit }: GameRendererProps) {
  // Key bao gồm level, mode, gameId và savedGame để force re-mount khi thay đổi
  const key = `${game.id}-${mode}-${level}-${savedGame ? 'saved' : 'fresh'}`;
  return (
    <div key={key} className="h-full">
      {game.render({
          level,
          mode,
          onComplete,
          onExit,
          initialState: savedGame?.state,
          soundOn,
        })}
    </div>
  );
}

interface Props {
  data: AppData;
  gameId: string;
  mode: GameMode;
  level: number;
  savedGame?: GameSave;
  onBack: () => void;
  onDataChange: (data: AppData) => void;
  soundOn: boolean;
  onNextLevel?: () => void;
}

export default function GamePlayScreen({ data, gameId, mode, level, savedGame, onBack, onDataChange, soundOn, onNextLevel }: Props) {
  const game = getGame(gameId);
  const [result, setResult] = useState<GameResult | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [paused] = useState(false);
  const completedRef = useRef(false);
  const stateRef = useRef<any>(savedGame?.state ?? {});
  const startTimeRef = useRef(Date.now());

  // Save game định kỳ
  useEffect(() => {
    const id = setInterval(() => {
      if (completedRef.current || paused) return;
      const newSave: GameSave = {
        gameId,
        mode,
        level,
        score: 0,
        timeLeft: 0,
        moves: 0,
        hintsUsed: 0,
        state: stateRef.current,
      };
      const newData = saveCurrentGame(data, newSave);
      onDataChange(newData);
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, gameId, mode, level, paused]);

  if (!game) return null;

  const handleComplete = (res: GameResult) => {
    if (completedRef.current) return;
    completedRef.current = true;

    const progressData = {
      gameId,
      mode,
      level,
      score: res.score,
      stars: res.stars,
      bestTime: res.timeMs,
    };
    let newData = recordProgress(data, progressData);
    newData = clearSavedGame(newData, gameId, mode);

    onDataChange(newData);
    setResult(res);
  };

  const handleExit = () => {
    setConfirmExit(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="absolute right-3 top-3 z-30">
        <button
          onClick={() => { if (soundOn) playClick(); handleExit(); }}
          className="btn-shadow flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl"
        >
          ⏸
        </button>
      </div>

      <div className="flex-1">
        <GameRenderer
          game={game}
          level={level}
          mode={mode}
          soundOn={soundOn}
          savedGame={savedGame}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </div>

      {confirmExit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-full max-w-sm rounded-3xl bg-white p-6"
          >
            <div className="text-center text-4xl mb-2">💾</div>
            <h3 className="text-xl font-extrabold text-purple-800 mb-2 text-center">
              Lưu game?
            </h3>
            <p className="text-sm text-purple-600 mb-4 text-center">
              Bé có thể chơi tiếp lần sau. Tiến trình sẽ được lưu lại.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setConfirmExit(false);
                  onBack();
                }}
                className="btn-shadow w-full rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 py-3 font-extrabold text-white"
              >
                ✅ Lưu & Thoát
              </button>
              <button
                onClick={() => {
                  const newData = clearSavedGame(data, gameId, mode);
                  onDataChange(newData);
                  onBack();
                }}
                className="btn-shadow w-full rounded-2xl bg-gradient-to-r from-red-400 to-pink-500 py-3 font-extrabold text-white"
              >
                🗑️ Không Lưu
              </button>
              <button
                onClick={() => setConfirmExit(false)}
                className="btn-shadow w-full rounded-2xl bg-white border-2 border-purple-200 py-3 font-extrabold text-purple-700"
              >
                ↩ Tiếp Tục Chơi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {result && (
        <ResultScreen
          result={result}
          level={level}
          gameEmoji={game.emoji}
          onNext={() => {
            if (onNextLevel) {
              // Ẩn result trước rồi mới chuyển level
              setResult(null);
              completedRef.current = false;
              startTimeRef.current = Date.now();
              stateRef.current = {};
              setTimeout(() => {
                onNextLevel();
              }, 50);
            } else {
              setResult(null);
              completedRef.current = false;
              startTimeRef.current = Date.now();
              stateRef.current = {};
              onBack();
            }
          }}
          onRetry={() => {
            setResult(null);
            completedRef.current = false;
            startTimeRef.current = Date.now();
            stateRef.current = {};
          }}
          onBack={onBack}
          soundOn={soundOn}
        />
      )}
    </div>
  );
}