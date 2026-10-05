import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getGame } from '../games';
import { GameMode, MODE_CONFIG, getStage, STAGES, Stage } from '../games/types';
import { AppData, GameSave, getGameProgress, getSavedGame } from '../utils/storage';
import { playClick, playHover } from '../utils/sound';

interface Props {
  data: AppData;
  gameId: string;
  onBack: () => void;
  onPlay: (gameId: string, mode: GameMode, level: number, savedGame?: GameSave) => void;
  soundOn: boolean;
}

export default function LevelSelectScreen({ data, gameId, onBack, onPlay, soundOn }: Props) {
  const game = getGame(gameId);
  const [mode, setMode] = useState<GameMode>(() => {
    try {
      const saved = localStorage.getItem(`beCodeVui_mode_${gameId}`);
      if (saved === 'easy' || saved === 'normal' || saved === 'hard') return saved;
    } catch {}
    return 'easy';
  });
  const [pageStart, setPageStart] = useState(1);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);

  // Lưu mode vào storage khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(`beCodeVui_mode_${gameId}`, mode);
    } catch {}
  }, [mode, gameId]);

  if (!game) return null;

  const handleClick = (fn: () => void): void => {
    if (soundOn) playClick();
    fn();
  };
  const handleHover = (): void => {
    if (soundOn) playHover();
  };

  const progress = useMemo(() => getGameProgress(data, gameId, mode), [data, gameId, mode]);
  const savedGame = getSavedGame(data, gameId, mode);

  const pageEnd = Math.min(pageStart + 9, game.totalLevels);

  // Khi chọn stage, jump đến level đầu của stage đó
  const selectStage = (stage: Stage | null) => {
    setActiveStage(stage);
    if (stage === null) {
      setPageStart(1);
    } else {
      const info = STAGES.find(s => s.stage === stage);
      if (info) setPageStart(info.range[0]);
    }
  };

  const unlockedUntil = useMemo(() => {
    let unlocked = 0;
    for (let i = 0; i < progress.length; i++) {
      if (progress[i].stars >= 1) {
        unlocked = Math.max(unlocked, progress[i].level);
      }
    }
    return unlocked + 1;
  }, [progress]);

  const stageInfo = getStage(pageStart);

  return (
    <div className="relative min-h-screen pb-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-yellow-300/30 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-60 w-60 rounded-full bg-pink-300/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <button
            onMouseEnter={handleHover}
            onClick={() => handleClick(onBack)}
            className="btn-shadow flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl"
          >
            ⬅️
          </button>
          <div className="flex-1 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${game.gradient} px-4 py-2 text-white`}
            >
              <span className="text-2xl">{game.emoji}</span>
              <span className="text-lg font-extrabold">{game.title}</span>
            </motion.div>
          </div>
          <div className="w-11" />
        </div>

        <p className="mb-3 text-center text-sm text-purple-700">{game.description}</p>

        {savedGame && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-3 flex items-center justify-between rounded-2xl bg-yellow-100 p-3 border-2 border-yellow-300"
          >
            <div>
              <div className="text-sm font-bold text-yellow-800">💾 Có game đang chơi dở</div>
              <div className="text-xs text-yellow-700">Level {savedGame.level} • {MODE_CONFIG[savedGame.mode as GameMode].label}</div>
            </div>
            <button
              onClick={() => {
                const m = savedGame.mode as GameMode;
                handleClick(() => onPlay(gameId, m, savedGame.level, savedGame));
              }}
              className="btn-shadow rounded-xl bg-yellow-500 px-3 py-1.5 text-sm font-bold text-white"
            >
              ▶ Chơi tiếp
            </button>
          </motion.div>
        )}

        <div className="mb-3 grid grid-cols-3 gap-2">
          {(['easy', 'normal', 'hard'] as GameMode[]).map((m: GameMode) => (
            <motion.button
              key={m}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(() => { setMode(m); setPageStart(1); setActiveStage(null); })}
              onMouseEnter={handleHover}
              className={`btn-shadow flex flex-col items-center rounded-2xl p-2.5 transition-all ${
                mode === m
                  ? `bg-gradient-to-br ${game.gradient} text-white`
                  : 'bg-white text-purple-700'
              }`}
            >
              <span className="text-xl">{MODE_CONFIG[m].emoji}</span>
              <span className="text-sm font-bold">{MODE_CONFIG[m].label}</span>
              <span className="text-[10px] opacity-80">{MODE_CONFIG[m].description}</span>
            </motion.button>
          ))}
        </div>

        {/* Stage selector - 5 cấp độ rõ ràng */}
        <div className="mb-3">
          <div className="mb-1 text-center text-xs font-bold text-purple-700">
            🏆 Chọn cấp độ (Stage):
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <button
              onClick={() => handleClick(() => selectStage(null))}
              className={`btn-shadow flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
                activeStage === null
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white text-purple-700'
              }`}
            >
              🎯 Tất cả
            </button>
            {STAGES.map(s => {
              const isActive = activeStage === s.stage;
              const stageCompleted = progress.filter(p => p.level >= s.range[0] && p.level <= s.range[1] && p.stars >= 1).length;
              const stageTotal = s.range[1] - s.range[0] + 1;
              return (
                <button
                  key={s.stage}
                  onClick={() => handleClick(() => selectStage(s.stage))}
                  className={`btn-shadow flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive ? 'text-white scale-105' : 'bg-white text-purple-700'
                  }`}
                  style={isActive ? { background: s.color } : {}}
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                  <span className="opacity-70 text-[10px]">{stageCompleted}/{stageTotal}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between rounded-2xl bg-white p-2">
          <button
            disabled={pageStart <= 1}
            onClick={() => handleClick(() => { setPageStart(Math.max(1, pageStart - 10)); setActiveStage(null); })}
            className="btn-shadow flex h-9 w-9 items-center justify-center rounded-xl bg-purple-200 text-lg font-bold text-purple-800 disabled:opacity-40"
          >
            ◀
          </button>
          <div className="text-sm font-bold text-purple-700 flex items-center gap-2">
            <span>Level {pageStart} - {pageEnd}</span>
            <span
              className="rounded-full px-2 py-0.5 text-white text-xs"
              style={{ background: stageInfo.color }}
            >
              {stageInfo.emoji} {stageInfo.label}
            </span>
          </div>
          <button
            disabled={pageStart + 10 > game.totalLevels}
            onClick={() => handleClick(() => { setPageStart(Math.min(game.totalLevels - 9, pageStart + 10)); setActiveStage(null); })}
            className="btn-shadow flex h-9 w-9 items-center justify-center rounded-xl bg-purple-200 text-lg font-bold text-purple-800 disabled:opacity-40"
          >
            ▶
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-6">
          {Array.from({ length: pageEnd - pageStart + 1 }).map((_, i) => {
            const level = pageStart + i;
            const prog = progress.find(p => p.level === level);
            const isLocked = level > unlockedUntil;
            const stars = prog?.stars ?? 0;
            const score = prog?.score ?? 0;
            const lvlStage = getStage(level);
            return (
              <motion.button
                key={level}
                whileTap={!isLocked ? { scale: 0.92 } : undefined}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !isLocked && handleClick(() => onPlay(gameId, mode, level))}
                disabled={isLocked}
                className={`btn-shadow relative flex aspect-square flex-col items-center justify-center rounded-2xl p-1 transition-all ${
                  isLocked
                    ? 'bg-gray-200 text-gray-400'
                    : prog
                      ? `bg-gradient-to-br ${game.gradient} text-white`
                      : 'bg-white text-purple-700'
                }`}
                style={!isLocked && !prog ? { borderLeft: `4px solid ${lvlStage.color}` } : undefined}
              >
                <div className="text-lg font-extrabold">{level}</div>
                {isLocked ? (
                  <div className="text-base">🔒</div>
                ) : stars > 0 ? (
                  <div className="flex text-[10px]">
                    {[1, 2, 3].map(s => (
                      <span key={s}>{s <= stars ? '⭐' : '☆'}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px]">{lvlStage.emoji}</div>
                )}
                {prog && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full px-1 text-[10px] font-bold text-purple-700 shadow">
                    {score}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="glass rounded-2xl p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl">⭐</div>
              <div className="font-extrabold text-purple-900">
                {progress.reduce((s, p) => s + p.stars, 0)}
              </div>
              <div className="text-xs text-purple-600">Tổng sao</div>
            </div>
            <div>
              <div className="text-2xl">✅</div>
              <div className="font-extrabold text-purple-900">{progress.length}</div>
              <div className="text-xs text-purple-600">Đã chơi</div>
            </div>
            <div>
              <div className="text-2xl">🏆</div>
              <div className="font-extrabold text-purple-900">
                {progress.filter(p => p.stars === 3).length}
              </div>
              <div className="text-xs text-purple-600">Hoàn hảo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}