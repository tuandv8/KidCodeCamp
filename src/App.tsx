import { useEffect, useState } from 'react';
import { AppData, loadData, saveData, clearData, GameSave } from './utils/storage';
import { GameMode } from './games/types';
import { getGame } from './games';
import { setMuted, playMagic } from './utils/sound';
import HomeScreen from './components/HomeScreen';
import LevelSelectScreen from './components/LevelSelectScreen';
import GamePlayScreen from './components/GamePlayScreen';
import ProfileScreen from './components/ProfileScreen';
import SettingsScreen from './components/SettingsScreen';
import HistoryScreen from './components/HistoryScreen';

type Screen =
  | { type: 'home' }
  | { type: 'levels'; gameId: string }
  | { type: 'play'; gameId: string; mode: GameMode; level: number; savedGame?: GameSave }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'history' };

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('beCodeVui_sound');
      return stored === null ? true : stored === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    setMuted(!soundOn);
    try {
      localStorage.setItem('beCodeVui_sound', soundOn ? '1' : '0');
    } catch {}
  }, [soundOn]);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (soundOn) playMagic();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDataChange = (newData: AppData) => {
    setData(newData);
  };

  const handleResetData = () => {
    clearData();
    const fresh = loadData();
    setData(fresh);
    setScreen({ type: 'home' });
  };

  if (screen.type === 'home') {
    return (
      <HomeScreen
        data={data}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        onSelectGame={(gameId) => setScreen({ type: 'levels', gameId })}
        onShowProfile={() => setScreen({ type: 'profile' })}
        onShowSettings={() => setScreen({ type: 'settings' })}
        onResetData={handleResetData}
      />
    );
  }

  if (screen.type === 'levels') {
    return (
      <LevelSelectScreen
        data={data}
        gameId={screen.gameId}
        onBack={() => setScreen({ type: 'home' })}
        onPlay={(gameId, mode, level, savedGame) => {
          if (savedGame) {
            setScreen({ type: 'play', gameId, mode, level, savedGame });
          } else {
            setScreen({ type: 'play', gameId, mode, level });
          }
        }}
        soundOn={soundOn}
      />
    );
  }

  if (screen.type === 'play') {
    const { gameId, mode, level, savedGame } = screen;
    return (
      <GamePlayScreen
        data={data}
        gameId={gameId}
        mode={mode}
        level={level}
        savedGame={savedGame}
        onBack={() => setScreen({ type: 'levels', gameId })}
        onDataChange={handleDataChange}
        soundOn={soundOn}
        onNextLevel={() => {
          const gameCfg = getGame(gameId);
          if (gameCfg && level < gameCfg.totalLevels) {
            setScreen({ type: 'play', gameId, mode, level: level + 1 });
          } else {
            setScreen({ type: 'levels', gameId });
          }
        }}
      />
    );
  }

  if (screen.type === 'profile') {
    return (
      <ProfileScreen
        data={data}
        onBack={() => setScreen({ type: 'home' })}
        onChange={handleDataChange}
        soundOn={soundOn}
      />
    );
  }

  if (screen.type === 'settings') {
    return (
      <SettingsScreen
        data={data}
        onBack={() => setScreen({ type: 'home' })}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        onReset={handleResetData}
        onShowHistory={() => setScreen({ type: 'history' })}
      />
    );
  }

  if (screen.type === 'history') {
    return (
      <HistoryScreen
        data={data}
        onBack={() => setScreen({ type: 'settings' })}
        soundOn={soundOn}
      />
    );
  }

  return null;
}