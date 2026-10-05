// Storage utility - quản lý việc lưu game

export interface LevelProgress {
  gameId: string;
  mode: string;
  level: number;
  score: number;
  stars: number; // 1-3 sao
  bestTime: number; // ms
  completedAt: number;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  totalStars: number;
  gamesPlayed: number;
  lastPlayed: number;
}

export interface GameSave {
  gameId: string;
  mode: string;
  level: number;
  score: number;
  timeLeft: number;
  moves: number;
  hintsUsed: number;
  state: any; // game-specific state
}

export interface AppData {
  profile: PlayerProfile;
  progress: LevelProgress[]; // Lịch sử các level đã chơi
  savedGames: GameSave[]; // Game đang chơi dở
  unlockedGames: string[];
  unlockedModes: Record<string, string[]>; // gameId -> modes unlocked
}

const STORAGE_KEY = 'beCodeVui_data_v1';

const defaultData: AppData = {
  profile: {
    name: 'Bé',
    avatar: '🦁',
    totalStars: 0,
    gamesPlayed: 0,
    lastPlayed: 0,
  },
  progress: [],
  savedGames: [],
  unlockedGames: ['pattern', 'sequence', 'maze', 'bug', 'arrow'],
  unlockedModes: {
    pattern: ['easy', 'normal', 'hard'],
    sequence: ['easy', 'normal', 'hard'],
    maze: ['easy', 'normal', 'hard'],
    bug: ['easy', 'normal', 'hard'],
    arrow: ['easy', 'normal', 'hard'],
  },
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    return {
      ...defaultData,
      ...parsed,
      profile: { ...defaultData.profile, ...parsed.profile },
      progress: parsed.progress ?? [],
      savedGames: parsed.savedGames ?? [],
      unlockedGames: parsed.unlockedGames ?? defaultData.unlockedGames,
      unlockedModes: parsed.unlockedModes ?? defaultData.unlockedModes,
    };
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Cannot save data', e);
  }
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function recordProgress(
  data: AppData,
  progress: Omit<LevelProgress, 'completedAt'>
): AppData {
  // Tìm progress cũ
  const idx = data.progress.findIndex(
    p => p.gameId === progress.gameId && p.mode === progress.mode && p.level === progress.level
  );
  const newProgress = [...data.progress];
  if (idx >= 0) {
    // Cập nhật nếu điểm cao hơn
    if (newProgress[idx].score < progress.score) {
      newProgress[idx] = { ...progress, completedAt: Date.now() };
    }
  } else {
    newProgress.push({ ...progress, completedAt: Date.now() });
  }

  // Cập nhật tổng sao
  const totalStars = newProgress.reduce((s, p) => s + p.stars, 0);
  const gamesPlayed = newProgress.length;

  return {
    ...data,
    progress: newProgress,
    profile: {
      ...data.profile,
      totalStars,
      gamesPlayed,
      lastPlayed: Date.now(),
    },
  };
}

export function getProgress(
  data: AppData,
  gameId: string,
  mode: string,
  level: number
): LevelProgress | undefined {
  return data.progress.find(
    p => p.gameId === gameId && p.mode === mode && p.level === level
  );
}

export function getGameProgress(
  data: AppData,
  gameId: string,
  mode: string
): LevelProgress[] {
  return data.progress
    .filter(p => p.gameId === gameId && p.mode === mode)
    .sort((a, b) => a.level - b.level);
}

export function saveCurrentGame(
  data: AppData,
  save: GameSave
): AppData {
  const idx = data.savedGames.findIndex(
    s => s.gameId === save.gameId && s.mode === save.mode
  );
  const newSaved = [...data.savedGames];
  if (idx >= 0) {
    newSaved[idx] = save;
  } else {
    newSaved.push(save);
  }
  return { ...data, savedGames: newSaved };
}

export function clearSavedGame(
  data: AppData,
  gameId: string,
  mode: string
): AppData {
  return {
    ...data,
    savedGames: data.savedGames.filter(
      s => !(s.gameId === gameId && s.mode === mode)
    ),
  };
}

export function getSavedGame(
  data: AppData,
  gameId: string,
  mode: string
): GameSave | undefined {
  return data.savedGames.find(
    s => s.gameId === gameId && s.mode === mode
  );
}

// Tính số sao dựa trên điểm
export function calculateStars(score: number, maxScore: number = 100): number {
  const ratio = score / maxScore;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}