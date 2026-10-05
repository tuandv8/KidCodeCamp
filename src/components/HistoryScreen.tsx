import { motion } from 'framer-motion';
import { GAMES } from '../games';
import { AppData } from '../utils/storage';
import { MODE_CONFIG } from '../games/types';
import { playClick, playHover } from '../utils/sound';

interface Props {
  data: AppData;
  onBack: () => void;
  soundOn: boolean;
}

export default function HistoryScreen({ data, onBack, soundOn }: Props) {
  // Sắp xếp progress theo thời gian gần nhất
  const sorted = [...data.progress].sort((a, b) => b.completedAt - a.completedAt);

  // Group by game
  const grouped: Record<string, typeof sorted> = {};
  sorted.forEach(p => {
    if (!grouped[p.gameId]) grouped[p.gameId] = [];
    grouped[p.gameId].push(p);
  });

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <button
            onMouseEnter={() => soundOn && playHover()}
            onClick={() => { if (soundOn) playClick(); onBack(); }}
            className="btn-shadow flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl"
          >
            ⬅️
          </button>
          <h1 className="flex-1 text-center text-2xl font-extrabold text-purple-800">
            📜 Lịch Sử
          </h1>
          <div className="w-11" />
        </div>

        {sorted.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center">
            <div className="text-6xl mb-2">🎮</div>
            <p className="text-purple-700 font-bold">Chưa có lượt chơi nào</p>
            <p className="text-sm text-purple-500 mt-1">Hãy bắt đầu chơi nào!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {GAMES.map(g => {
              const gameProgress = grouped[g.id] ?? [];
              if (gameProgress.length === 0) return null;

              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-3xl p-4"
                >
                  <div className={`mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r ${g.gradient} p-3 text-white`}>
                    <div className="text-3xl">{g.emoji}</div>
                    <div>
                      <div className="font-extrabold">{g.title}</div>
                      <div className="text-xs opacity-90">
                        {gameProgress.length} lượt • {gameProgress.reduce((s, p) => s + p.stars, 0)} ⭐
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {gameProgress.slice(0, 15).map((p, i) => {
                      const date = new Date(p.completedAt);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl bg-white/60 p-2 text-sm"
                        >
                          <div className="text-lg">
                            {[1, 2, 3].map(s => (
                              <span key={s}>{s <= p.stars ? '⭐' : '☆'}</span>
                            ))}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-purple-900">Level {p.level}</div>
                            <div className="text-xs text-purple-500">
                              {MODE_CONFIG[p.mode as keyof typeof MODE_CONFIG]?.emoji} {MODE_CONFIG[p.mode as keyof typeof MODE_CONFIG]?.label}
                              {' • '}
                              {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="rounded-full bg-purple-100 px-2 py-0.5 font-bold text-purple-800 text-xs">
                            {p.score}đ
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}