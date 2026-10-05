import { useState } from 'react';
import { motion } from 'framer-motion';
import { AVATARS } from './HomeScreen';
import { AppData } from '../utils/storage';
import { playClick, playHover, playStar } from '../utils/sound';

interface Props {
  data: AppData;
  onBack: () => void;
  onChange: (data: AppData) => void;
  soundOn: boolean;
}

export default function ProfileScreen({ data, onBack, onChange, soundOn }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(data.profile.name);
  const [hovered, setHovered] = useState<string | null>(null);

  const saveName = () => {
    const trimmed = name.trim() || 'Bé';
    onChange({ ...data, profile: { ...data.profile, name: trimmed } });
    setEditingName(false);
    if (soundOn) playStar();
  };

  const selectAvatar = (av: string) => {
    if (soundOn) playClick();
    onChange({ ...data, profile: { ...data.profile, avatar: av } });
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <button
            onMouseEnter={() => soundOn && playHover()}
            onClick={() => { if (soundOn) playClick(); onBack(); }}
            className="btn-shadow flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl"
          >
            ⬅️
          </button>
          <h1 className="flex-1 text-center text-2xl font-extrabold text-purple-800">
            👤 Cá Của Bé
          </h1>
          <div className="w-11" />
        </div>

        {/* Avatar + Name */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass mb-4 rounded-3xl p-6 text-center"
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 text-6xl shadow-lg"
          >
            {data.profile.avatar}
          </motion.div>
          {editingName ? (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={12}
                className="flex-1 rounded-2xl border-2 border-purple-300 bg-white px-3 py-2 text-center font-bold text-purple-900"
                autoFocus
              />
              <button
                onClick={saveName}
                className="btn-shadow rounded-2xl bg-green-500 px-4 font-bold text-white"
              >
                ✅
              </button>
            </div>
          ) : (
            <button
              onClick={() => { if (soundOn) playClick(); setEditingName(true); }}
              className="text-2xl font-extrabold text-purple-900 hover:underline"
            >
              {data.profile.name} ✏️
            </button>
          )}
        </motion.div>

        {/* Avatar picker */}
        <div className="glass mb-4 rounded-3xl p-4">
          <div className="mb-2 text-sm font-bold text-purple-800">Chọn avatar:</div>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map(av => (
              <motion.button
                key={av}
                whileTap={{ scale: 0.9 }}
                onClick={() => selectAvatar(av)}
                onMouseEnter={() => {
                  setHovered(av);
                  if (soundOn) playHover();
                }}
                onMouseLeave={() => setHovered(null)}
                className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition-all ${
                  data.profile.avatar === av
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 ring-4 ring-purple-400 scale-110'
                    : 'bg-white hover:bg-purple-50'
                } ${hovered === av && data.profile.avatar !== av ? 'animate-wiggle' : ''}`}
              >
                {av}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="glass rounded-3xl p-4">
          <div className="mb-3 text-sm font-bold text-purple-800">📊 Thành tích:</div>
          <div className="space-y-2">
            <StatRow emoji="⭐" label="Tổng số sao" value={data.profile.totalStars} />
            <StatRow emoji="🎮" label="Lượt chơi" value={data.profile.gamesPlayed} />
            <StatRow emoji="🏆" label="Hoàn hảo (3 sao)" value={data.progress.filter(p => p.stars === 3).length} />
            <StatRow emoji="✅" label="Hoàn thành" value={data.progress.filter(p => p.stars >= 1).length} />
            <StatRow
              emoji="💾"
              label="Game đang lưu"
              value={data.savedGames.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/60 p-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-sm text-purple-700">{label}</span>
      </div>
      <span className="text-lg font-extrabold text-purple-900">{value}</span>
    </div>
  );
}