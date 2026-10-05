// Types chung cho game

export type GameMode = 'easy' | 'normal' | 'hard';

export type Stage = 1 | 2 | 3 | 4 | 5;

export interface GameConfig {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
  gradient: string;
  totalLevels: number; // 100
  unlockThreshold: number;
  category: 'logic' | 'memory' | 'coding' | 'math' | 'music';
  render: (props: GameProps) => any;
}

export interface GameProps {
  level: number;        // 1..100
  mode: GameMode;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  initialState?: any;
  soundOn: boolean;
}

export interface GameResult {
  score: number;
  accuracy: number;
  timeMs: number;
  stars: 0 | 1 | 2 | 3;
  perfect: boolean;
  hintsUsed: number;
  moves: number;
}

export const MODE_CONFIG: Record<GameMode, {
  label: string;
  emoji: string;
  timeMultiplier: number;
  description: string;
}> = {
  easy: {
    label: 'Dễ',
    emoji: '🐣',
    description: 'Bé mới bắt đầu',
    timeMultiplier: 1.2,
  },
  normal: {
    label: 'Vừa',
    emoji: '🐥',
    description: 'Thử thách vừa phải',
    timeMultiplier: 0.85,
  },
  hard: {
    label: 'Khó',
    emoji: '🦅',
    description: 'Siêu nhanh, siêu khó',
    timeMultiplier: 0.6,
  },
};

// Hệ thống 5 cấp độ (Stage) theo level
// Stage 1: 1-20 (rất cơ bản)
// Stage 2: 21-40 (nâng cao một chút)
// Stage 3: 41-60 (trung bình)
// Stage 4: 61-80 (khó)
// Stage 5: 81-100 (rất khó - thử thách)
export interface StageInfo {
  stage: Stage;
  label: string;
  emoji: string;
  range: [number, number];
  color: string;
}

export const STAGES: StageInfo[] = [
  { stage: 1, label: 'Khởi Đầu', emoji: '🌱', range: [1, 20], color: '#10b981' },
  { stage: 2, label: 'Tập Sự', emoji: '🌿', range: [21, 40], color: '#22c55e' },
  { stage: 3, label: 'Thành Thạo', emoji: '🌳', range: [41, 60], color: '#3b82f6' },
  { stage: 4, label: 'Thử Thách', emoji: '🔥', range: [61, 80], color: '#f59e0b' },
  { stage: 5, label: 'Huyền Thoại', emoji: '👑', range: [81, 100], color: '#a855f7' },
];

export function getStage(level: number): StageInfo {
  const clamped = Math.max(1, Math.min(100, level));
  const stageIdx = Math.min(4, Math.floor((clamped - 1) / 20));
  return STAGES[stageIdx];
}

// Hệ số độ khó theo stage (nhân vào timeLimit)
export function getStageMultiplier(stage: Stage): number {
  // Stage 1 dễ nhất (1.0), Stage 5 khó nhất (0.55)
  const map: Record<Stage, number> = {
    1: 1.0,
    2: 0.85,
    3: 0.72,
    4: 0.6,
    5: 0.55,
  };
  return map[stage];
}

// Công thức tính điểm có tính stage
export function calculateScore(
  accuracy: number,
  timeMs: number,
  timeLimit: number,
  perfect: boolean,
  hintsUsed: number,
  mode: GameMode,
  stage: Stage = 3
): number {
  const accuracyScore = Math.min(accuracy, 1) * 50;
  const timeRatio = Math.max(0, Math.min(1, timeMs / timeLimit));
  const timeScore = (1 - timeRatio) * 35;

  const bonus = (perfect ? 8 : 0) + (hintsUsed === 0 ? 4 : 0);
  const total = accuracyScore + timeScore + bonus;

  const modeBonus = mode === 'hard' ? 6 : mode === 'normal' ? 3 : 0;
  const stageBonus = stage >= 4 ? 3 : 0;

  return Math.round(Math.min(100, total + modeBonus + stageBonus));
}

export function calculateStars(score: number): 0 | 1 | 2 | 3 {
  if (score >= 88) return 3;
  if (score >= 72) return 2;
  if (score >= 50) return 1;
  return 0;
}

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function levelSeed(gameId: string, mode: GameMode, level: number): number {
  let hash = 0;
  const s = `${gameId}-${mode}-${level}`;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}