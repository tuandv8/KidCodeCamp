import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GAMES } from '../games';
import { AppData } from '../utils/storage';
import { setMuted, playClick, playHover, playMagic } from '../utils/sound';

type Category = 'all' | 'logic' | 'memory' | 'coding' | 'math' | 'music';

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'all', label: 'Tất cả', emoji: '🎯' },
  { id: 'logic', label: 'Logic', emoji: '🧠' },
  { id: 'memory', label: 'Trí nhớ', emoji: '🧩' },
  { id: 'coding', label: 'Lập trình', emoji: '💻' },
  { id: 'math', label: 'Toán', emoji: '🔢' },
  { id: 'music', label: 'Âm nhạc', emoji: '🎵' },
];

interface Props {
  data: AppData;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  onSelectGame: (gameId: string) => void;
  onShowProfile: () => void;
  onShowSettings: () => void;
  onResetData: () => void;
}

const AVATARS = ['🦁', '🐯', '🐼', '🐰', '🦊', '🐶', '🐱', '🐸', '🐵', '🦄', '🐙', '🐢'];

export default function HomeScreen({ data, soundOn, setSoundOn, onSelectGame, onShowProfile, onShowSettings, onResetData }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('all');

  const filteredGames = useMemo(() => {
    if (category === 'all') return GAMES;
    return GAMES.filter(g => g.category === category);
  }, [category]);

  const toggleSound = () => {
    const nv = !soundOn;
    setSoundOn(nv);
    setMuted(!nv);
    if (nv) playMagic();
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-12">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-yellow-300/40 blur-3xl animate-float" />
        <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-pink-300/40 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 pt-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onMouseEnter={() => soundOn && playHover()}
            onClick={() => { playClick(); onShowProfile(); }}
            className="btn-shadow glass flex items-center gap-2 rounded-2xl px-3 py-2"
          >
            <div className="text-2xl">{data.profile.avatar}</div>
            <div className="text-left">
              <div className="text-xs text-purple-600">Xin chào</div>
              <div className="text-sm font-bold text-purple-900">{data.profile.name}</div>
            </div>
          </button>

          <div className="flex gap-2">
            <button
              onMouseEnter={() => soundOn && playHover()}
              onClick={toggleSound}
              className="btn-shadow glass flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onMouseEnter={() => soundOn && playHover()}
              onClick={() => { playClick(); onShowSettings(); }}
              className="btn-shadow glass flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 text-center"
        >
          <h1 className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-4xl sm:text-5xl font-extrabold text-transparent">
            🌟 Bé Code Vui
          </h1>
          <p className="mt-1 text-sm text-purple-700 font-medium">
            Học lập trình qua trò chơi vui nhộn!
          </p>
        </motion.div>

        {/* Stats bar */}
        <div className="glass mb-6 grid grid-cols-3 gap-2 rounded-2xl p-3">
          <div className="text-center">
            <div className="text-2xl">⭐</div>
            <div className="text-lg font-extrabold text-purple-900">{data.profile.totalStars}</div>
            <div className="text-xs text-purple-600">Sao</div>
          </div>
          <div className="text-center border-x border-purple-200">
            <div className="text-2xl">🎮</div>
            <div className="text-lg font-extrabold text-purple-900">{data.profile.gamesPlayed}</div>
            <div className="text-xs text-purple-600">Lượt chơi</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">🏆</div>
            <div className="text-lg font-extrabold text-purple-900">
              {data.progress.filter(p => p.stars === 3).length}
            </div>
            <div className="text-xs text-purple-600">3 Sao</div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="mb-4 overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-1">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => { if (soundOn) playClick(); setCategory(c.id); }}
                className={`btn-shadow flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-3 py-1.5 text-sm font-bold transition-all ${
                  category === c.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white text-purple-700'
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game cards */}
        <div className="mb-4 px-1 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-purple-800">Trò Chơi</h2>
          <span className="text-xs text-purple-600 font-bold">{filteredGames.length} game</span>
        </div>

        <div className="space-y-3">
          {filteredGames.map((g, idx) => {
            const gameProgress = data.progress.filter(p => p.gameId === g.id);
            const totalStars = gameProgress.reduce((s, p) => s + p.stars, 0);
            const played = gameProgress.length;
            return (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                onMouseEnter={() => {
                  setHovered(g.id);
                  if (soundOn) playHover();
                }}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { playClick(); onSelectGame(g.id); }}
                className={`btn-shadow group relative w-full overflow-hidden rounded-3xl bg-gradient-to-r ${g.gradient} p-4 text-left transition-all`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white/30 text-4xl transition-transform ${hovered === g.id ? 'animate-wiggle scale-110' : ''}`}>
                    {g.emoji}
                  </div>
                  <div className="flex-1 text-white">
                    <div className="text-lg font-extrabold drop-shadow">{g.title}</div>
                    <div className="text-xs opacity-90 leading-tight">{g.description}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs font-bold">
                      <span className="rounded-full bg-white/30 px-2 py-0.5">
                        ⭐ {totalStars}
                      </span>
                      <span className="rounded-full bg-white/30 px-2 py-0.5">
                        🎯 {played}/{g.totalLevels}
                      </span>
                    </div>
                  </div>
                  <div className="text-3xl text-white/80">→</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu?')) {
                onResetData();
              }
            }}
            className="text-xs text-purple-500 underline"
          >
            Xóa dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
}

export { AVATARS };