import { GameMode, MODE_CONFIG, getStage } from '../games/types';
import { playClick } from '../utils/sound';

interface Props {
  level: number;
  mode: GameMode;
  timeLeft: number;
  timeLimit: number;
  emoji: string;
  onExit: () => void;
  soundOn: boolean;
}

export default function GameHeader({ level, mode, timeLeft, timeLimit, emoji, onExit, soundOn }: Props) {
  const stageInfo = getStage(level);
  const progress = timeLeft / timeLimit;

  const soundF = (fn: () => void) => { if (soundOn) fn(); };

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <button
        onClick={() => { soundF(playClick); onExit(); }}
        className="btn-shadow flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl"
      >
        ⬅️
      </button>
      <div className="glass flex flex-1 items-center gap-3 rounded-2xl px-3 py-1.5">
        <div className="text-xl">{emoji}</div>
        <div className="flex-1">
          <div className="text-xs font-bold text-purple-700 flex items-center gap-2 flex-wrap">
            <span>Level {level}</span>
            <span
              className="rounded-full px-2 py-0.5 text-white text-[10px]"
              style={{ background: stageInfo.color }}
            >
              {stageInfo.emoji} {stageInfo.label}
            </span>
            <span className="text-[10px] text-purple-500">• {MODE_CONFIG[mode].emoji} {MODE_CONFIG[mode].label}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-purple-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress * 100}%`,
                background: progress > 0.3
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              }}
            />
          </div>
        </div>
        <div className="font-mono text-base font-bold text-purple-900">
          {Math.ceil(timeLeft / 1000)}s
        </div>
      </div>
    </div>
  );
}