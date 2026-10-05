import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GameProps,
  MODE_CONFIG,
  Stage,
  calculateScore,
  calculateStars,
  getStage,
  levelSeed,
  seededRandom,
} from './types';
import { playWrong, playWin, playClick, playFail, playTick, playPop } from '../utils/sound';

// Định nghĩa nốt nhạc - mapping sang tần số Hz (Equal Temperament, A4=440Hz)
const NOTES: { name: string; label: string; freq: number; key: string; color: string }[] = [
  { name: 'C',  label: 'Đô',  freq: 261.63, key: '1', color: '#ef4444' },
  { name: 'D',  label: 'Rê',  freq: 293.66, key: '2', color: '#f59e0b' },
  { name: 'E',  label: 'Mi',  freq: 329.63, key: '3', color: '#10b981' },
  { name: 'F',  label: 'Fa',  freq: 349.23, key: '4', color: '#06b6d4' },
  { name: 'G',  label: 'Sol', freq: 392.00, key: '5', color: '#3b82f6' },
  { name: 'A',  label: 'La',  freq: 440.00, key: '6', color: '#8b5cf6' },
  { name: 'B',  label: 'Si',  freq: 493.88, key: '7', color: '#ec4899' },
];

interface MelodyNote {
  noteIdx: number;
  duration: number;
}

interface PianoLevel {
  type: 'repeat' | 'complete' | 'match' | 'compose';
  notes: MelodyNote[];
  correctAnswer: any;
  options: MelodyNote[][];
  correctIdx: number;
  melodyName: string;
  stage: Stage;
  timeLimit: number;
  hint: string;
  blankIdx: number;
}

// Phát 1 nốt nhạc dùng Web Audio API - tạo âm thanh piano mượt
function playNote(freq: number, duration: number = 500) {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.4, now + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
    masterGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + duration / 1000);

    const triGain = ctx.createGain();
    triGain.gain.value = 0.15;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;
    osc2.connect(triGain);
    triGain.connect(masterGain);
    osc2.start(now);
    osc2.stop(now + duration / 1000);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, duration + 200);
  } catch (e) {
    // ignore
  }
}

function playSequence(notes: MelodyNote[], onNote?: (i: number) => void) {
  let cumulative = 0;
  notes.forEach((n, i) => {
    setTimeout(() => {
      playNote(NOTES[n.noteIdx].freq, n.duration);
      onNote?.(i);
    }, cumulative);
    cumulative += n.duration;
  });
}

// Một số giai điệu quen thuộc
const FAMOUS_MELODIES: { name: string; notes: number[] }[] = [
  { name: 'Twinkle Twinkle', notes: [0, 0, 4, 4, 5, 5, 4] },
  { name: 'Happy Birthday', notes: [4, 4, 5, 4, 6, 5, 4, 4, 5, 4, 7, 6] },
  { name: 'Mary Had a Little Lamb', notes: [3, 2, 1, 2, 3, 3, 3, 2, 2, 2, 3, 4, 4] },
  { name: 'Ode to Joy', notes: [3, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 3, 2, 2] },
  { name: 'Jingle Bells', notes: [4, 4, 4, 4, 4, 4, 4, 6, 2, 3, 4] },
  { name: 'Old MacDonald', notes: [4, 2, 0, 2, 4, 4, 4] },
  { name: 'ABC Song', notes: [4, 4, 5, 4, 6, 5, 4, 3, 1, 2, 3, 4] },
  { name: 'London Bridge', notes: [4, 3, 2, 3, 4, 4, 4, 4, 3, 3, 3, 3, 2, 3, 4] },
];

function generatePianoLevel(gameId: string, mode: 'easy' | 'normal' | 'hard', level: number): PianoLevel {
  const seed = levelSeed(gameId, mode, level);
  const rng = seededRandom(seed);
  const modeCfg = MODE_CONFIG[mode];
  const stage = getStage(level).stage;

  let type: PianoLevel['type'];
  if (stage <= 2) type = 'repeat';
  else if (stage === 3) type = rng() < 0.5 ? 'repeat' : 'complete';
  else if (stage === 4) type = rng() < 0.4 ? 'complete' : 'match';
  else type = rng() < 0.3 ? 'match' : 'compose';

  let correctAnswer: any = [];
  let options: MelodyNote[][] = [];
  let correctIdx = 0;
  let melodyName = '';
  let blankIdx = -1;

  const dur = mode === 'easy' ? 600 : mode === 'normal' ? 450 : 320;
  const notes: MelodyNote[] = [];

  if (type === 'repeat') {
    const seqLen = Math.min(2 + Math.floor((level - 1) / 12) + (mode === 'hard' ? 1 : 0), 7);
    const startNote = Math.floor(rng() * Math.max(1, NOTES.length - 4));
    for (let i = 0; i < seqLen; i++) {
      const offset = i === 0 ? 0 : Math.floor(rng() * 5) - 2;
      const noteIdx = Math.max(0, Math.min(NOTES.length - 1, startNote + offset));
      notes.push({ noteIdx, duration: dur });
    }
    correctAnswer = notes.map(n => n.noteIdx);
    options = [notes];
    melodyName = 'Lặp lại giai điệu';
  } else if (type === 'complete') {
    const melody = FAMOUS_MELODIES[Math.floor(rng() * FAMOUS_MELODIES.length)];
    melodyName = melody.name;
    const startPos = Math.floor(rng() * Math.max(1, melody.notes.length - 5));
    const length = Math.min(5, melody.notes.length - startPos);
    const melodySlice: MelodyNote[] = [];
    for (let i = 0; i < length; i++) {
      melodySlice.push({ noteIdx: melody.notes[startPos + i], duration: dur });
    }
    blankIdx = 1 + Math.floor(rng() * Math.max(1, length - 1));
    const correctNote = melodySlice[blankIdx].noteIdx;

    notes.push(...melodySlice);
    correctAnswer = correctNote;

    // Tạo 4 options
    const wrongChoices = new Set<number>();
    let tries = 0;
    while (wrongChoices.size < 3 && tries < 30) {
      const w = Math.floor(rng() * NOTES.length);
      if (w !== correctNote) wrongChoices.add(w);
      tries++;
    }
    const allChoices = [correctNote, ...Array.from(wrongChoices)].slice(0, 4);
    correctIdx = allChoices.indexOf(correctNote);
    options = allChoices.map(c => [{ noteIdx: c, duration: dur }]);
  } else if (type === 'match') {
    const melody = FAMOUS_MELODIES[Math.floor(rng() * FAMOUS_MELODIES.length)];
    melodyName = melody.name;
    const startPos = Math.floor(rng() * Math.max(1, melody.notes.length - 5));
    const length = Math.min(5, melody.notes.length - startPos);
    const correctMelody: MelodyNote[] = [];
    for (let i = 0; i < length; i++) {
      correctMelody.push({ noteIdx: melody.notes[startPos + i], duration: dur });
    }
    notes.push(...correctMelody);

    options = [correctMelody];
    let attempts = 0;
    while (options.length < 4 && attempts < 30) {
      attempts++;
      const wrong = correctMelody.map(n => ({ ...n }));
      const numChanges = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < numChanges; i++) {
        const pos = Math.floor(rng() * wrong.length);
        let newNote: number;
        do {
          newNote = Math.floor(rng() * NOTES.length);
        } while (newNote === wrong[pos].noteIdx);
        wrong[pos] = { ...wrong[pos], noteIdx: newNote };
      }
      if (JSON.stringify(wrong) === JSON.stringify(correctMelody)) continue;
      if (options.some(o => JSON.stringify(o) === JSON.stringify(wrong))) continue;
      options.push(wrong);
    }
    while (options.length < 4) {
      const wrong = correctMelody.map(n => ({ ...n }));
      wrong[0] = { ...wrong[0], noteIdx: (wrong[0].noteIdx + 1) % NOTES.length };
      if (JSON.stringify(wrong) === JSON.stringify(correctMelody)) {
        wrong[0] = { ...wrong[0], noteIdx: (wrong[0].noteIdx + 2) % NOTES.length };
      }
      options.push(wrong);
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    correctAnswer = correctMelody;
    correctIdx = options.findIndex(o => JSON.stringify(o) === JSON.stringify(correctMelody));
  } else {
    // compose
    const length = Math.min(3 + Math.floor((level - 80) / 5), 6);
    const startNote = Math.floor(rng() * Math.max(1, NOTES.length - 3));
    for (let i = 0; i < length; i++) {
      const offset = i === 0 ? 0 : Math.floor(rng() * 5) - 2;
      const noteIdx = Math.max(0, Math.min(NOTES.length - 1, startNote + offset));
      notes.push({ noteIdx, duration: dur });
    }
    melodyName = 'Bé sáng tác';
    correctAnswer = notes.map(n => n.noteIdx);
    options = [notes];
  }

  const totalDuration = notes.reduce((sum, n) => sum + n.duration, 0);
  const baseTime = (totalDuration / 1000) * 1.8 + 6;
  const stageMul = stage <= 2 ? 1.3 : stage === 3 ? 1.0 : stage === 4 ? 0.85 : 0.7;
  const timeLimit = Math.round(baseTime * modeCfg.timeMultiplier * stageMul * 1000);

  const hint = stage <= 2
    ? 'Nghe kỹ rồi nhấn các nốt theo đúng thứ tự'
    : stage === 3
    ? 'Bé nghe giai điệu và chọn nốt còn thiếu'
    : stage === 4
    ? 'Bé chọn giai điệu giống hệt với bản gốc'
    : 'Bé hãy sáng tác giai điệu của riêng mình';

  return {
    type,
    notes,
    correctAnswer,
    options,
    correctIdx,
    melodyName,
    stage,
    timeLimit,
    hint,
    blankIdx,
  };
}

export default function PianoMaestroGame({ level, mode, onComplete, onExit, initialState, soundOn }: GameProps) {
  const puzzle = useMemo(() => generatePianoLevel('piano-maestro-game', mode, level), [level, mode]);
  const stageInfo = getStage(level);

  const [userNotes, setUserNotes] = useState<MelodyNote[]>(initialState?.userNotes ?? []);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [playingNoteIdx, setPlayingNoteIdx] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(puzzle.timeLimit);
  const [moves, setMoves] = useState(initialState?.moves ?? 0);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  const soundF = (fn: () => void) => { if (soundOn) fn(); };

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 100) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            const timeMs = Date.now() - startTimeRef.current;
            const score = calculateScore(0, timeMs, puzzle.timeLimit, false, 0, mode, puzzle.stage);
            soundF(playFail);
            onComplete({ score, accuracy: 0, timeMs, stars: 0, perfect: false, hintsUsed: 0, moves });
          }
          return 0;
        }
        if (t < 3000 && t % 1000 < 100) soundF(playTick);
        return t - 100;
      });
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playOriginalMelody = () => {
    playSequence(puzzle.notes, (i) => setPlayingNoteIdx(i));
    const totalDur = puzzle.notes.reduce((s, n) => s + n.duration, 0);
    setTimeout(() => setPlayingNoteIdx(-1), totalDur + 200);
  };

  const playOption = (idx: number) => {
    const opt = puzzle.options[idx];
    if (!opt) return;
    playSequence(opt, (i) => setPlayingNoteIdx(i));
    const totalDur = opt.reduce((s, n) => s + n.duration, 0);
    setTimeout(() => setPlayingNoteIdx(-1), totalDur + 200);
  };

  const handlePlayNote = (noteIdx: number) => {
    if (completedRef.current) return;
    soundF(playClick);
    setActiveKey(noteIdx);
    playNote(NOTES[noteIdx].freq, 600);
    setTimeout(() => setActiveKey(null), 300);

    if (puzzle.type === 'match') return;

    if (puzzle.type === 'compose' && userNotes.length >= 8) return;

    const newNotes: MelodyNote[] = [...userNotes, { noteIdx, duration: 600 }];
    setUserNotes(newNotes);
    setMoves((m: number) => m + 1);

    if (puzzle.type === 'repeat' || puzzle.type === 'compose') {
      const expectedLen = puzzle.notes.length;
      if (newNotes.length >= expectedLen) {
        let isCorrect = true;
        for (let i = 0; i < expectedLen; i++) {
          if (newNotes[i].noteIdx !== puzzle.notes[i].noteIdx) {
            isCorrect = false;
            break;
          }
        }
        if (isCorrect) {
          completedRef.current = true;
          const timeMs = Date.now() - startTimeRef.current;
          const score = calculateScore(1, timeMs, puzzle.timeLimit, moves === 0, 0, mode, puzzle.stage);
          const stars = calculateStars(score);
          soundF(playPop);
          setTimeout(() => {
            soundF(playWin);
            onComplete({
              score, accuracy: 1, timeMs, stars,
              perfect: moves === 0, hintsUsed: 0, moves: moves + 1,
            });
          }, 400);
        } else {
          soundF(playWrong);
          setWrongFlash(noteIdx);
          setTimeout(() => setWrongFlash(null), 500);
          setTimeout(() => setUserNotes([]), 800);
        }
      }
    }
  };

  // Handle complete mode: pick 1 note to fill the blank
  const handleCompletePick = (noteIdx: number) => {
    if (completedRef.current) return;
    if (puzzle.type !== 'complete') return;
    soundF(playClick);
    setActiveKey(noteIdx);
    playNote(NOTES[noteIdx].freq, 600);
    setTimeout(() => setActiveKey(null), 300);

    const newMoves = moves + 1;
    setMoves(newMoves);

    if (noteIdx === puzzle.correctAnswer) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const score = calculateScore(1, timeMs, puzzle.timeLimit, moves === 0, 0, mode, puzzle.stage);
      const stars = calculateStars(score);
      soundF(playPop);
      setTimeout(() => {
        soundF(playWin);
        onComplete({
          score, accuracy: 1, timeMs, stars,
          perfect: moves === 0, hintsUsed: 0, moves: newMoves,
        });
      }, 400);
    } else {
      setWrongFlash(noteIdx);
      soundF(playWrong);
      setTimeout(() => setWrongFlash(null), 500);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (completedRef.current) return;
    soundF(playClick);
    const newMoves = moves + 1;
    setMoves(newMoves);

    if (idx === puzzle.correctIdx) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const score = calculateScore(1, timeMs, puzzle.timeLimit, moves === 0, 0, mode, puzzle.stage);
      const stars = calculateStars(score);
      soundF(playPop);
      setTimeout(() => {
        soundF(playWin);
        onComplete({
          score, accuracy: 1, timeMs, stars,
          perfect: moves === 0, hintsUsed: 0, moves: newMoves,
        });
      }, 400);
    } else {
      setWrongFlash(idx);
      soundF(playWrong);
      setTimeout(() => setWrongFlash(null), 500);
    }
  };

  const handleClear = () => {
    if (completedRef.current) return;
    soundF(playClick);
    setUserNotes([]);
  };

  const handleUndo = () => {
    if (completedRef.current) return;
    soundF(playClick);
    setUserNotes((prev: MelodyNote[]) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (completedRef.current) return;
    if (userNotes.length === 0) return;

    let isCorrect = true;
    for (let i = 0; i < puzzle.notes.length; i++) {
      if (userNotes[i]?.noteIdx !== puzzle.notes[i].noteIdx) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      completedRef.current = true;
      const timeMs = Date.now() - startTimeRef.current;
      const score = calculateScore(1, timeMs, puzzle.timeLimit, moves === 0, 0, mode, puzzle.stage);
      const stars = calculateStars(score);
      soundF(playPop);
      setTimeout(() => {
        soundF(playWin);
        onComplete({
          score, accuracy: 1, timeMs, stars,
          perfect: moves === 0, hintsUsed: 0, moves: moves + 1,
        });
      }, 400);
    } else {
      soundF(playWrong);
      setWrongFlash(-1);
      setTimeout(() => setWrongFlash(null), 500);
    }
  };

  const progress = timeLeft / puzzle.timeLimit;

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          onClick={() => { soundF(playClick); onExit(); }}
          className="btn-shadow flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl"
        >
          ⬅️
        </button>
        <div className="glass flex flex-1 items-center gap-3 rounded-2xl px-3 py-1.5">
          <div className="text-xl">🎹</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-purple-700 flex items-center gap-2 flex-wrap">
              <span>Level {level}</span>
              <span className="rounded-full px-2 py-0.5 text-white" style={{ background: stageInfo.color }}>
                {stageInfo.emoji} {stageInfo.label}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-purple-100">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${progress * 100}%`,
                  background: progress > 0.3 ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                }} />
            </div>
          </div>
          <div className="font-mono text-base font-bold text-purple-900">
            {Math.ceil(timeLeft / 1000)}s
          </div>
        </div>
      </div>

      <div className="mb-2 text-center">
        <h2 className="text-xl font-extrabold text-purple-800">🎹 Nhạc Trưởng Nhí</h2>
        <p className="text-xs text-purple-600">💡 {puzzle.hint}</p>
        {puzzle.melodyName && (
          <p className="text-xs font-bold text-pink-600 mt-0.5">🎵 {puzzle.melodyName}</p>
        )}
      </div>

      <div className="mb-2 flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={playOriginalMelody}
          className="btn-shadow flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-white"
        >
          <span className="text-xl">▶</span>
          <span className="font-bold">Nghe giai điệu</span>
        </motion.button>
      </div>

      {/* Visual representation of melody */}
      {puzzle.type !== 'match' && (
        <div className="glass mb-2 rounded-2xl p-2">
          <div className="mb-1 text-center text-xs font-bold text-purple-600">
            {puzzle.type === 'complete' ? 'Giai điệu (có 1 chỗ ?):' : 'Giai điệu cần chơi:'}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {puzzle.notes.map((n, idx) => {
              const isPlaying = playingNoteIdx === idx;
              const isBlank = puzzle.type === 'complete' && idx === puzzle.blankIdx;
              return (
                <motion.div
                  key={idx}
                  animate={isPlaying ? { scale: 1.3 } : { scale: 1 }}
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-xs sm:text-sm font-extrabold shadow ${
                    isBlank ? 'border-4 border-dashed border-purple-400 bg-purple-50 text-purple-600' : 'text-white'
                  } ${isPlaying ? 'ring-4 ring-yellow-400' : ''}`}
                  style={!isBlank ? { background: NOTES[n.noteIdx].color } : {}}
                >
                  {isBlank ? '?' : NOTES[n.noteIdx].name}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* User's played notes */}
      {(puzzle.type === 'repeat' || puzzle.type === 'compose') && (
        <div className="glass mb-2 rounded-2xl p-2">
          <div className="mb-1 text-center text-xs font-bold text-purple-600">
            Bé đã chơi ({userNotes.length}/{puzzle.notes.length}):
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1 min-h-[36px]">
            {userNotes.length === 0 ? (
              <span className="text-xs text-purple-400">Bé chưa chơi nốt nào</span>
            ) : (
              userNotes.map((n, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-xs font-extrabold text-white shadow"
                  style={{ background: NOTES[n.noteIdx].color }}
                >
                  {NOTES[n.noteIdx].name}
                </motion.div>
              ))
            )}
          </div>
          {userNotes.length === puzzle.notes.length && userNotes.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              className={`btn-shadow mt-2 w-full rounded-2xl py-2 font-bold text-white ${
                wrongFlash === -1 ? 'bg-red-400' : 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse-soft'
              }`}
            >
              {wrongFlash === -1 ? '❌ Sai rồi, thử lại' : '✅ Kiểm tra'}
            </motion.button>
          )}
        </div>
      )}

      {/* Match options */}
      {puzzle.type === 'match' && (
        <div className="grid grid-cols-2 gap-2 mb-2 flex-1 content-center">
          {puzzle.options.map((opt, idx) => (
            <motion.button
              whileTap={{ scale: 0.92 }}
              key={idx}
              onClick={() => handleOptionSelect(idx)}
              onMouseEnter={() => playOption(idx)}
              className={`btn-shadow rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-2 ${
                wrongFlash === idx ? 'animate-shake bg-red-200' : ''
              }`}
            >
              <div className="text-center text-xs font-bold text-purple-700 mb-1">
                Lựa chọn {idx + 1}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {opt.map((n, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded text-xs font-extrabold text-white"
                    style={{ background: NOTES[n.noteIdx].color }}
                  >
                    {NOTES[n.noteIdx].name}
                  </div>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {(puzzle.type === 'repeat' || puzzle.type === 'compose') && (
        <div className="flex justify-end items-center mb-1 px-2 gap-1">
          <span className="text-xs font-bold text-purple-700 mr-auto">
            Bé chơi đây:
          </span>
          <button
            onClick={handleUndo}
            disabled={userNotes.length === 0}
            className="btn-shadow flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-white text-sm font-bold disabled:opacity-40"
          >
            ↶
          </button>
          <button
            onClick={handleClear}
            disabled={userNotes.length === 0}
            className="btn-shadow flex h-7 w-7 items-center justify-center rounded-lg bg-red-400 text-white text-sm font-bold disabled:opacity-40"
          >
            🗑
          </button>
        </div>
      )}

      {puzzle.type === 'complete' && (
        <div className="mb-1 px-2 text-xs font-bold text-purple-700">
          Bé chọn nốt còn thiếu:
        </div>
      )}

      {/* Piano keyboard */}
      {puzzle.type !== 'match' && (
        <div className="flex gap-0.5 justify-center bg-gradient-to-b from-gray-700 to-gray-900 rounded-2xl p-2 shadow-inner">
          {NOTES.map((note, i) => {
            const isActive = activeKey === i || playingNoteIdx === i;
            const isWrong = wrongFlash === i;
            return (
              <motion.button
                whileTap={{ scale: 0.95, y: 4 }}
                key={i}
                onClick={() => puzzle.type === 'complete' ? handleCompletePick(i) : handlePlayNote(i)}
                animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                className={`relative flex flex-1 flex-col items-center justify-end rounded-b-xl border-2 border-gray-800 py-2 ${
                  isWrong ? 'animate-shake' : ''
                } ${isActive ? 'brightness-125' : ''}`}
                style={{
                  background: `linear-gradient(180deg, white 0%, ${note.color}30 100%)`,
                  minHeight: 90,
                  boxShadow: isActive
                    ? `0 0 15px ${note.color}, inset 0 -2px 0 ${note.color}`
                    : '0 4px 0 rgba(0,0,0,0.3)',
                }}
              >
                <div
                  className="absolute top-1 h-2 w-2 rounded-full"
                  style={{ background: note.color }}
                />
                <div className="text-lg sm:text-xl font-extrabold text-gray-800">
                  {note.name}
                </div>
                <div className="text-[10px] font-bold text-gray-600">
                  {note.label}
                </div>
                <div className="text-[9px] text-gray-400">
                  {note.key}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}