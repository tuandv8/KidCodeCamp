import { motion } from 'framer-motion';
import { AppData } from '../utils/storage';
import { playClick, playHover } from '../utils/sound';

interface Props {
  data: AppData;
  onBack: () => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  onReset: () => void;
  onShowHistory: () => void;
}

export default function SettingsScreen({ data, onBack, soundOn, setSoundOn, onReset, onShowHistory }: Props) {
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
            ⚙️ Cài Đặt
          </h1>
          <div className="w-11" />
        </div>

        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{soundOn ? '🔊' : '🔇'}</span>
                <div>
                  <div className="font-bold text-purple-900">Âm thanh</div>
                  <div className="text-xs text-purple-600">
                    {soundOn ? 'Bật' : 'Tắt'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSoundOn(!soundOn);
                  playClick();
                }}
                className={`btn-shadow flex h-9 w-16 items-center rounded-full p-1 transition-all ${
                  soundOn ? 'bg-green-400' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full bg-white shadow transition-transform ${
                    soundOn ? 'translate-x-7' : ''
                  }`}
                />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-4"
          >
            <button
              onClick={() => { if (soundOn) playClick(); onShowHistory(); }}
              className="btn-shadow flex w-full items-center gap-3 rounded-xl bg-white p-3"
            >
              <span className="text-3xl">📜</span>
              <div className="flex-1 text-left">
                <div className="font-bold text-purple-900">Lịch sử chơi</div>
                <div className="text-xs text-purple-600">{data.progress.length} lượt đã chơi</div>
              </div>
              <span className="text-purple-400">→</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4"
          >
            <div className="text-sm font-bold text-purple-800 mb-2">📊 Thống kê</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-white/60 p-2 text-center">
                <div className="text-xl font-extrabold text-purple-900">{data.progress.length}</div>
                <div className="text-xs text-purple-600">Level đã chơi</div>
              </div>
              <div className="rounded-xl bg-white/60 p-2 text-center">
                <div className="text-xl font-extrabold text-purple-900">{data.savedGames.length}</div>
                <div className="text-xs text-purple-600">Game đang lưu</div>
              </div>
              <div className="rounded-xl bg-white/60 p-2 text-center">
                <div className="text-xl font-extrabold text-purple-900">{data.profile.totalStars}</div>
                <div className="text-xs text-purple-600">Tổng sao</div>
              </div>
              <div className="rounded-xl bg-white/60 p-2 text-center">
                <div className="text-xl font-extrabold text-purple-900">
                  {data.progress.filter(p => p.stars === 3).length}
                </div>
                <div className="text-xs text-purple-600">3 sao</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-4"
          >
            <div className="text-sm font-bold text-purple-800 mb-2">ℹ️ Thông tin</div>
            <div className="text-sm text-purple-700 leading-relaxed">
              🌟 Bé Code Vui là webapp giúp bé 6 tuổi làm quen với tư duy lập trình qua các trò chơi vui nhộn.
              <br /><br />
              🎮 Có <b>5 trò chơi</b> với <b>3 chế độ</b> (Dễ, Vừa, Khó), mỗi chế độ có <b>100 level</b>.
              <br /><br />
              ⭐ Điểm số phụ thuộc vào độ chính xác và tốc độ hoàn thành.
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu? Hành động này không thể hoàn tác!')) {
                onReset();
              }
            }}
            className="btn-shadow w-full rounded-2xl bg-gradient-to-r from-red-400 to-pink-500 py-3 font-extrabold text-white"
          >
            🗑️ Xóa Tất Cả Dữ Liệu
          </motion.button>

          <div className="pt-2 text-center text-xs text-purple-500">
            Made with 💜 cho trẻ em Việt Nam
          </div>
        </div>
      </div>
    </div>
  );
}