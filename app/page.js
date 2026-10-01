'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, Dumbbell, Scale, TrendingUp, Calendar, BookOpen,
  Check, X, Edit2, Trash2, ChevronLeft, ChevronRight, Target,
  Flame, Zap, Moon, Apple, Trophy, Clock, MapPin, FileText,
  AlertCircle, Plus, ArrowLeft, Footprints, Heart, ChevronDown,
  Play, Wind
} from 'lucide-react';

// ============================================================
// USER DATA & HR ZONES
// ============================================================

const USER_AGE = 26;
const MAX_HR = Math.round(208 - 0.7 * USER_AGE); // 190 bpm

const HR_ZONES = [
  { id: 'Z1', name: 'RECOVERY',  minPct: 50, maxPct: 60, color: '#60a5fa', feel: 'Very easy, can sing',           use: 'Active recovery, warm-ups, cool-downs' },
  { id: 'Z2', name: 'EASY',      minPct: 60, maxPct: 70, color: '#a3e635', feel: 'Conversational pace',           use: 'Aerobic base, long runs, easy days' },
  { id: 'Z3', name: 'TEMPO',     minPct: 70, maxPct: 80, color: '#facc15', feel: 'Comfortably hard, short replies', use: 'Marathon race pace (5:41/km)' },
  { id: 'Z4', name: 'THRESHOLD', minPct: 80, maxPct: 90, color: '#fb923c', feel: 'Hard, only single words',       use: 'Lactate threshold tempo runs' },
  { id: 'Z5', name: 'VO2 MAX',   minPct: 90, maxPct: 100, color: '#ef4444', feel: 'Max effort, breathless',        use: 'Short intervals, race finish' },
];

function zoneBpm(zone) {
  return {
    min: Math.round((zone.minPct / 100) * MAX_HR),
    max: Math.round((zone.maxPct / 100) * MAX_HR),
  };
}

function getZoneData(id) {
  return HR_ZONES.find((z) => z.id === id);
}

// ============================================================
// CONSTANTS & PLAN GENERATION
// ============================================================

const RACE_DATE = '2027-05-09';
const START_DATE = '2026-10-05';
const TOTAL_WEEKS = 31;

const C = {
  bg: '#0a0a0a',
  surface: '#161616',
  surfaceLight: '#1f1f1f',
  border: '#262626',
  borderLight: '#3a3a3a',
  text: '#fafafa',
  textDim: '#a3a3a3',
  textMuted: '#737373',
  primary: '#a3e635',
  primaryDim: '#84cc16',
  warn: '#fb923c',
  danger: '#ef4444',
  race: '#fbbf24',
  run: '#a3e635',
  gym: '#60a5fa',
  rest: '#525252',
};

const PHASE_DATA = {
  base:  { name: 'BASE',  fullName: 'Base Building',     color: '#a3e635', desc: 'Aerobic foundation, easy running, build consistency' },
  build: { name: 'BUILD', fullName: 'Build & Strength',  color: '#facc15', desc: 'Tempo work at 5:25–5:35/km, build marathon-specific fitness' },
  peak:  { name: 'PEAK',  fullName: 'Peak Training',     color: '#fb923c', desc: 'Marathon-specific long runs with goal-pace segments at 5:41/km' },
  taper: { name: 'TAPER', fullName: 'Taper & Race',      color: '#f87171', desc: 'Reduce volume, maintain speed, peak freshness for race day' },
};

// 31 weeks: Base W1-8, Build W9-18, Peak W19-26, Taper W27-31
// Weeks 1-4: 2 runs/week, Weeks 5+: 3 runs/week
const LONG_RUNS = [
  // BASE W1-8
  8, 9, 10, 10, 12, 11, 14, 13,
  // BUILD W9-18
  15, 16, 14, 18, 16, 20, 18, 22, 20, 24,
  // PEAK W19-26
  22, 26, 22, 28, 24, 30, 26, 32,
  // TAPER W27-31
  22, 16, 12, 8, 42.2,
];

const GOAL_PACE_KM = [
  // BASE W1-8 (no goal-pace segments)
  0, 0, 0, 0, 0, 0, 0, 0,
  // BUILD W9-18 (introduce goal-pace segments)
  0, 3, 0, 4, 0, 5, 0, 6, 0, 8,
  // PEAK W19-26 (longer goal-pace segments)
  0, 8, 0, 10, 0, 12, 0, 14,
  // TAPER W27-31
  6, 4, 0, 0, 42.2,
];

function getPhase(w) {
  if (w <= 8) return 'base';
  if (w <= 18) return 'build';
  if (w <= 26) return 'peak';
  return 'taper';
}

function getWeekStart(w) {
  const s = new Date(START_DATE + 'T00:00:00');
  s.setDate(s.getDate() + (w - 1) * 7);
  return s;
}

function formatDate(d) {
  const x = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(d) {
  const x = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getDayName(d) {
  const x = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return x.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
}

function getCurrentWeekNumber() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(START_DATE + 'T00:00:00');
  const diff = Math.floor((t - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff / 7) + 1));
}

function getWednesdayWorkout(weekNum, phase) {
  // Weeks 1-4: NO Wednesday run (2 runs/week only)
  if (weekNum <= 4) {
    return { type: 'rest', subtype: 'rest', title: 'REST', plannedDistance: 0, plannedTime: 0, description: 'No midweek run this month. Focus on building habit with 2 runs/week.', zone: '-' };
  }
  if (phase === 'base') {
    return { type: 'run', subtype: 'easy', title: 'EASY RUN', plannedDistance: 8, plannedTime: 52, description: 'Easy pace 6:20–6:40/km. Stay in Z2, conversational.', zone: 'Z2' };
  }
  if (phase === 'build') {
    const localWeek = weekNum - 8;
    const tempoMin = Math.min(30, 18 + Math.floor(localWeek / 2) * 2);
    return { type: 'run', subtype: 'tempo', title: 'TEMPO', plannedDistance: 10, plannedTime: 58, description: `10 min WU + ${tempoMin} min @ 5:25–5:35/km + 10 min CD`, zone: 'Z4' };
  }
  if (phase === 'peak') {
    const localWeek = weekNum - 18;
    if (localWeek % 2 === 1) return { type: 'run', subtype: 'tempo', title: 'TEMPO', plannedDistance: 11, plannedTime: 62, description: '10 min WU + 28–32 min @ 5:25–5:35/km + 10 min CD', zone: 'Z4' };
    return { type: 'run', subtype: 'racepace', title: 'RACE PACE', plannedDistance: 10, plannedTime: 58, description: '10 min WU + 20 min @ 5:41/km + 10 min CD', zone: 'Z3' };
  }
  // Taper
  const localWeek = weekNum - 26;
  if (localWeek <= 3) return { type: 'run', subtype: 'speed', title: 'SPEED', plannedDistance: 7, plannedTime: 38, description: '10 min WU + 4–5 × 2 min @ 5:20/km + 10 min CD', zone: 'Z4' };
  if (localWeek === 5) return { type: 'run', subtype: 'racepace', title: 'PRE-RACE TUNE', plannedDistance: 4, plannedTime: 25, description: '3 km easy + 4 × 1 min @ 5:41/km', zone: 'Z3' };
  return { type: 'run', subtype: 'easy', title: 'EASY SHAKEOUT', plannedDistance: 5, plannedTime: 32, description: 'Very easy 5 km, stay loose. Z1-Z2 only.', zone: 'Z2' };
}

function getSaturdayWorkout(weekNum, phase) {
  const distance = LONG_RUNS[weekNum - 1];
  const goalPace = GOAL_PACE_KM[weekNum - 1];
  if (weekNum === TOTAL_WEEKS) return { type: 'rest', subtype: 'rest', title: 'PRE-RACE REST', plannedDistance: 0, plannedTime: 0, description: 'Complete rest. Prepare gear, hydrate, sleep early.', zone: '-' };
  const estPace = goalPace > 0 ? 6.2 : 6.5;
  const time = Math.round(distance * estPace);
  const description = goalPace > 0 ? `Easy pace + ${goalPace} km @ 5:41/km in the middle` : 'Easy pace (6:20–6:40/km)';
  return { type: 'run', subtype: 'long', title: 'LONG RUN', plannedDistance: distance, plannedTime: time, description, zone: goalPace > 0 ? 'Z3' : 'Z2', goalPaceKm: goalPace };
}

function getRaceDayWorkout() {
  return { type: 'race', subtype: 'marathon', title: 'RACE DAY', plannedDistance: 42.2, plannedTime: 240, description: 'COPENHAGEN MARATHON. Goal: sub-4:00 @ 5:41/km. Execute your plan.', zone: 'Z3' };
}

function getMondayEasyRun(weekNum) {
  // Weeks 1-4: this is the only midweek run (instead of Wednesday)
  if (weekNum <= 2) return { type: 'run', subtype: 'easy', title: 'EASY RUN', plannedDistance: 5, plannedTime: 34, description: 'Easy pace 6:30–7:00/km. Just get moving, stay comfortable.', zone: 'Z2' };
  if (weekNum <= 4) return { type: 'run', subtype: 'easy', title: 'EASY RUN', plannedDistance: 6, plannedTime: 40, description: 'Easy pace 6:20–6:40/km. Build consistency.', zone: 'Z2' };
  return null; // Weeks 5+ use the normal schedule
}

function generateWeekWorkouts(weekNum) {
  const phase = getPhase(weekNum);
  const weekStart = getWeekStart(weekNum);
  const isTwoRunWeek = weekNum <= 4; // First month: 2 runs/week only
  const workouts = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    let workout;
    if (i === 0) {
      // Monday
      if (isTwoRunWeek) {
        // Weeks 1-4: Monday is the easy run (one of only 2 runs this week)
        workout = getMondayEasyRun(weekNum);
      } else if (weekNum === TOTAL_WEEKS) {
        workout = { type: 'run', subtype: 'easy', title: 'EASY JOG', plannedDistance: 3, plannedTime: 20, description: 'Very easy 3 km, stay loose.', zone: 'Z1' };
      } else {
        workout = { type: 'rest', subtype: 'rest', title: 'REST', plannedDistance: 0, plannedTime: 0, description: 'Full rest or 20–30 min easy walk.', zone: '-' };
      }
    } else if (i === 1) {
      // Tuesday — Gym
      const phaseLabel = phase === 'taper' ? 'Light mobility + activation' :
        phase === 'peak' ? 'Single-leg squats, calves, step-ups, hamstrings' :
        phase === 'build' ? 'Squats, Bulgarian splits, plyometrics' :
        'Squats, lunges, calf raises, balance';
      workout = { type: 'gym', subtype: 'lower', title: 'GYM LOWER', plannedDistance: 0, plannedTime: phase === 'taper' ? 35 : 55, description: phaseLabel, zone: '-' };
    } else if (i === 2) {
      // Wednesday — Quality run (or rest in weeks 1-4)
      workout = getWednesdayWorkout(weekNum, phase);
    } else if (i === 3) {
      // Thursday — Rest
      workout = { type: 'rest', subtype: 'rest', title: 'REST', plannedDistance: 0, plannedTime: 0, description: 'Rest. Foam roll, stretch, hydrate.', zone: '-' };
    } else if (i === 4) {
      // Friday — Gym
      const phaseLabel = phase === 'taper' ? 'Mobility, core, foam rolling' :
        phase === 'peak' ? 'Anti-rotation core, glute activation, shoulders' :
        'Core, upper body, planks, rotational';
      workout = { type: 'gym', subtype: 'general', title: 'GYM CORE/UPPER', plannedDistance: 0, plannedTime: phase === 'taper' ? 30 : 50, description: phaseLabel, zone: '-' };
    } else if (i === 5) {
      // Saturday — Long run
      workout = getSaturdayWorkout(weekNum, phase);
    } else {
      // Sunday — Race day or rest
      if (dateStr === RACE_DATE) workout = getRaceDayWorkout();
      else if (weekNum === TOTAL_WEEKS) workout = { type: 'rest', subtype: 'rest', title: 'FINAL PREP', plannedDistance: 0, plannedTime: 0, description: 'Final prep. Sleep early. Tomorrow you race.', zone: '-' };
      else workout = { type: 'rest', subtype: 'rest', title: 'REST', plannedDistance: 0, plannedTime: 0, description: 'Complete rest. Recovery is essential.', zone: '-' };
    }
    workouts.push({ ...workout, date: dateStr, day: getDayName(date), weekNum, phase });
  }
  return workouts;
}

function generateFullPlan() {
  const weeks = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    weeks.push({ weekNum: w, phase: getPhase(w), startDate: formatDate(getWeekStart(w)), workouts: generateWeekWorkouts(w) });
  }
  return weeks;
}

// ============================================================
// STORAGE
// ============================================================

function saveLog(date, data) {
  try { localStorage.setItem(`workout:${date}`, JSON.stringify(data)); return true; }
  catch (e) { console.error(e); return false; }
}
function deleteLog(date) {
  try { localStorage.removeItem(`workout:${date}`); return true; } catch { return false; }
}
function listAllLogs() {
  try {
    const logs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('workout:')) {
        try {
          const val = JSON.parse(localStorage.getItem(key));
          logs.push({ date: key.replace('workout:', ''), ...val });
        } catch {}
      }
    }
    return logs;
  } catch { return []; }
}
function saveWeight(date, kg) {
  try { localStorage.setItem(`weight:${date}`, JSON.stringify({ kg })); return true; } catch { return false; }
}
function listAllWeights() {
  try {
    const weights = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('weight:')) {
        try {
          const val = JSON.parse(localStorage.getItem(key));
          weights.push({ date: key.replace('weight:', ''), ...val });
        } catch {}
      }
    }
    return weights.sort((a, b) => a.date.localeCompare(b.date));
  } catch { return []; }
}

// ============================================================
// UTILITIES
// ============================================================

function parsePace(d, t) {
  if (!d || !t || d <= 0) return null;
  const sec = (t * 60) / d;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function paceToSec(p) {
  if (!p) return null;
  const [m, s] = p.split(':').map(Number);
  return m * 60 + (s || 0);
}

function isToday(d) { return d === formatDate(new Date()); }
function isPast(d) { return d < formatDate(new Date()); }

// ============================================================
// ZONE BADGE
// ============================================================

function ZoneBadge({ zone, size = 'sm', filled = false }) {
  if (!zone || zone === '-') return null;
  const data = getZoneData(zone);
  if (!data) return null;
  const px = size === 'lg' ? 'px-3 py-1.5 text-sm' : size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';
  return (
    <span
      className={`inline-block rounded-sm ${px}`}
      style={{
        backgroundColor: filled ? data.color : data.color + '20',
        color: filled ? C.bg : data.color,
        border: filled ? 'none' : `1px solid ${data.color}50`,
        fontFamily: 'Oswald, sans-serif',
        letterSpacing: '0.15em',
        fontWeight: 600,
      }}
    >
      {zone}
    </span>
  );
}

function PhaseBadge({ phase }) {
  const data = PHASE_DATA[phase];
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-sm text-xs"
      style={{
        backgroundColor: data.color + '20',
        color: data.color,
        border: `1px solid ${data.color}50`,
        fontFamily: 'Oswald, sans-serif',
        letterSpacing: '0.2em',
        fontWeight: 600,
      }}
    >
      {data.name}
    </span>
  );
}

function WorkoutIcon({ type, size = 18 }) {
  if (type === 'run') return <Footprints size={size} style={{ color: C.run }} />;
  if (type === 'gym') return <Dumbbell size={size} style={{ color: C.gym }} />;
  if (type === 'race') return <Trophy size={size} style={{ color: C.race }} />;
  return <Moon size={size} style={{ color: C.rest }} />;
}

// ============================================================
// STAT CARD (BIGGER, CLEANER)
// ============================================================

function StatCard({ label, value, unit, accent, sub }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
    >
      <div
        className="text-[11px] tracking-widest mb-2"
        style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.2em', fontWeight: 500 }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="leading-none"
          style={{
            color: accent || C.text,
            fontFamily: 'Oswald, sans-serif',
            fontWeight: 600,
            fontSize: '2.75rem',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="text-base"
            style={{ color: C.textDim, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          className="text-xs mt-1.5"
          style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOG MODAL (WITH HR ZONE SELECTOR)
// ============================================================

function LogModal({ workout, existingLog, onClose, onSave, onDelete }) {
  const isRun = workout.type === 'run' || workout.type === 'race';
  const [distance, setDistance] = useState(existingLog?.distance ?? (isRun ? workout.plannedDistance : ''));
  const [duration, setDuration] = useState(existingLog?.duration ?? (workout.plannedTime || ''));
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [completed, setCompleted] = useState(existingLog?.completed ?? true);
  const [zone, setZone] = useState(existingLog?.zone ?? (isRun ? workout.zone : null));
  const [saving, setSaving] = useState(false);

  const pace = useMemo(() => {
    if (isRun) return parsePace(parseFloat(distance), parseFloat(duration));
    return null;
  }, [distance, duration, isRun]);

  function handleSave() {
    setSaving(true);
    const data = {
      completed,
      notes,
      loggedAt: new Date().toISOString(),
      type: workout.type,
      subtype: workout.subtype,
      ...(isRun ? { distance: parseFloat(distance) || 0, duration: parseFloat(duration) || 0, pace, zone } : {}),
      ...(workout.type === 'gym' ? { duration: parseFloat(duration) || 0 } : {}),
    };
    const ok = saveLog(workout.date, data);
    setSaving(false);
    if (ok) onSave();
  }

  function handleDelete() {
    if (!confirm('Delete this log entry?')) return;
    deleteLog(workout.date);
    onDelete();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.borderLight}`,
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="px-5 pt-5 pb-4 flex items-start justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <WorkoutIcon type={workout.type} size={16} />
              <span
                className="text-[11px] tracking-widest"
                style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em' }}
              >
                {workout.day} · {formatDateDisplay(workout.date).toUpperCase()}
              </span>
            </div>
            <h3
              className="text-2xl truncate"
              style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 600, letterSpacing: '0.03em' }}
            >
              {workout.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center flex-shrink-0 -mr-2 -mt-2"
            style={{ width: 44, height: 44 }}
          >
            <X size={22} style={{ color: C.textDim }} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="overflow-y-auto flex-1">
          {/* PLANNED */}
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfaceLight }}>
            <div
              className="text-[10px] mb-2 tracking-widest"
              style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
            >
              PLANNED
            </div>
            <div className="text-sm mb-3 leading-relaxed" style={{ color: C.text, fontFamily: 'Manrope, sans-serif' }}>
              {workout.description}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {workout.plannedDistance > 0 && (
                <span className="text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: C.textDim }}>
                  {workout.plannedDistance} km
                </span>
              )}
              {workout.plannedTime > 0 && (
                <span className="text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: C.textDim }}>
                  ~{workout.plannedTime} min
                </span>
              )}
              {workout.zone && workout.zone !== '-' && <ZoneBadge zone={workout.zone} size="md" />}
            </div>
          </div>

          {/* ACTUAL FORM */}
          <div className="px-5 py-5 space-y-4">
            <div
              className="text-[10px] tracking-widest"
              style={{ color: C.primary, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
            >
              ACTUAL
            </div>

            {isRun && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
                      DISTANCE
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        className="w-full px-4 rounded-xl text-2xl"
                        style={{
                          height: 56,
                          backgroundColor: C.bg,
                          border: `1px solid ${C.borderLight}`,
                          color: C.text,
                          fontFamily: 'JetBrains Mono, monospace',
                          paddingRight: 35,
                        }}
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        km
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
                      TIME
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-4 rounded-xl text-2xl"
                        style={{
                          height: 56,
                          backgroundColor: C.bg,
                          border: `1px solid ${C.borderLight}`,
                          color: C.text,
                          fontFamily: 'JetBrains Mono, monospace',
                          paddingRight: 45,
                        }}
                      />
                      <span
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        min
                      </span>
                    </div>
                  </div>
                </div>

                {pace && (
                  <div
                    className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: C.bg, border: `1px solid ${C.primary}40` }}
                  >
                    <span
                      className="text-[10px] tracking-widest"
                      style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
                    >
                      AVG PACE
                    </span>
                    <span
                      className="text-2xl"
                      style={{ color: C.primary, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
                    >
                      {pace}<span className="text-xs" style={{ color: C.textDim }}>/km</span>
                    </span>
                  </div>
                )}

                {/* HR ZONE SELECTOR */}
                <div>
                  <label className="text-xs block mb-2" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
                    HR ZONE (dominant)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {HR_ZONES.map((z) => {
                      const active = zone === z.id;
                      return (
                        <button
                          key={z.id}
                          onClick={() => setZone(active ? null : z.id)}
                          className="rounded-xl flex flex-col items-center justify-center"
                          style={{
                            height: 60,
                            backgroundColor: active ? z.color : C.bg,
                            border: `1px solid ${active ? z.color : C.borderLight}`,
                            color: active ? C.bg : z.color,
                            fontFamily: 'Oswald, sans-serif',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                          }}
                        >
                          <span className="text-base leading-none">{z.id}</span>
                          <span
                            className="text-[9px] mt-1"
                            style={{ opacity: 0.8, fontFamily: 'JetBrains Mono, monospace', fontWeight: 400 }}
                          >
                            {zoneBpm(z).min}-{zoneBpm(z).max}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {workout.type === 'gym' && (
              <div>
                <label className="text-xs block mb-1.5" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
                  DURATION
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 rounded-xl text-2xl"
                    style={{
                      height: 56,
                      backgroundColor: C.bg,
                      border: `1px solid ${C.borderLight}`,
                      color: C.text,
                      fontFamily: 'JetBrains Mono, monospace',
                      paddingRight: 45,
                    }}
                  />
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    min
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs block mb-1.5" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
                NOTES
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={workout.type === 'rest' ? 'How was the rest? Sleep, recovery...' : 'How did it feel? Weather, conditions, energy...'}
                className="w-full px-4 py-3 rounded-xl resize-none text-sm"
                style={{
                  backgroundColor: C.bg,
                  border: `1px solid ${C.borderLight}`,
                  color: C.text,
                  fontFamily: 'Manrope, sans-serif',
                }}
              />
            </div>

            <button
              onClick={() => setCompleted(!completed)}
              className="w-full rounded-xl flex items-center justify-center gap-2"
              style={{
                height: 52,
                backgroundColor: completed ? C.primary + '20' : C.bg,
                border: `1px solid ${completed ? C.primary : C.borderLight}`,
                color: completed ? C.primary : C.textDim,
                fontFamily: 'Oswald, sans-serif',
                letterSpacing: '0.15em',
                fontWeight: 600,
              }}
            >
              <Check size={18} />
              <span className="text-sm">{completed ? 'COMPLETED' : 'MARK COMPLETE'}</span>
            </button>
          </div>
        </div>

        {/* FOOTER ACTIONS (THUMB ZONE) */}
        <div
          className="px-5 py-4 flex gap-2 flex-shrink-0"
          style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.surfaceLight }}
        >
          {existingLog && (
            <button
              onClick={handleDelete}
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                width: 56,
                height: 56,
                backgroundColor: 'transparent',
                border: `1px solid ${C.danger}40`,
                color: C.danger,
              }}
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl"
            style={{
              height: 56,
              backgroundColor: C.primary,
              color: C.bg,
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 700,
              letterSpacing: '0.2em',
              fontSize: '1rem',
            }}
          >
            {saving ? 'SAVING...' : (existingLog ? 'UPDATE' : 'SAVE')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WORKOUT ROW (BIGGER, CLEANER)
// ============================================================

function WorkoutRow({ workout, log, onClick }) {
  const today = isToday(workout.date);
  const past = isPast(workout.date);
  const completed = log?.completed;
  const isRest = workout.type === 'rest';
  const day = new Date(workout.date + 'T00:00:00').getDate();
  const displayZone = log?.zone || (workout.type === 'run' || workout.type === 'race' ? workout.zone : null);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl flex items-center gap-3 px-3 transition-colors text-left"
      style={{
        minHeight: 72,
        backgroundColor: today ? C.surfaceLight : C.surface,
        border: `1px solid ${today ? C.primary + '60' : C.border}`,
        opacity: isRest && !log ? 0.55 : 1,
      }}
    >
      {/* DATE COLUMN */}
      <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: 40 }}>
        <div
          className="text-[10px] tracking-widest"
          style={{ color: today ? C.primary : C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.15em', fontWeight: 600 }}
        >
          {workout.day}
        </div>
        <div
          className="leading-none mt-0.5"
          style={{ color: today ? C.primary : C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}
        >
          {day}
        </div>
      </div>

      {/* ICON */}
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          width: 44,
          height: 44,
          backgroundColor:
            workout.type === 'run' ? C.run + '15' :
            workout.type === 'gym' ? C.gym + '15' :
            workout.type === 'race' ? C.race + '15' :
            C.surfaceLight,
        }}
      >
        <WorkoutIcon type={workout.type} size={20} />
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="truncate"
            style={{
              color: C.text,
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 600,
              letterSpacing: '0.03em',
              fontSize: '0.95rem',
            }}
          >
            {workout.title}
          </span>
          {completed && (
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: 16, height: 16, backgroundColor: C.primary }}
            >
              <Check size={11} style={{ color: C.bg }} strokeWidth={3} />
            </div>
          )}
        </div>
        <div
          className="text-xs truncate"
          style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {log ? (
            (workout.type === 'run' || workout.type === 'race') ?
              `${log.distance || 0} km · ${log.duration || 0} min · ${log.pace || '—'}/km` :
              workout.type === 'gym' ? `${log.duration || 0} min · done` :
              log.notes ? 'noted' : 'logged'
          ) : (
            workout.plannedDistance > 0 ?
              `${workout.plannedDistance} km · ~${workout.plannedTime} min` :
              workout.plannedTime > 0 ? `~${workout.plannedTime} min` : 'recovery'
          )}
        </div>
      </div>

      {/* RIGHT INDICATORS */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {displayZone && displayZone !== '-' && <ZoneBadge zone={displayZone} size="sm" filled={!!log?.zone} />}
        {past && !log && !isRest && (
          <div
            className="text-[9px] px-1.5 py-0.5 rounded-sm"
            style={{
              color: C.warn,
              border: `1px solid ${C.warn}50`,
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.15em',
              fontWeight: 600,
            }}
          >
            MISSED
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({ plan, logs, weights, onWorkoutClick }) {
  const currentWeekNum = getCurrentWeekNumber();
  const currentWeek = plan.find((w) => w.weekNum === currentWeekNum) || plan[0];
  const today = formatDate(new Date());
  const todayWorkout = currentWeek.workouts.find((w) => w.date === today);
  const todayLog = logs.find((l) => l.date === today);

  const totalLogged = logs.filter((l) => l.completed).length;
  const totalPlanned = plan.flatMap((w) => w.workouts)
    .filter((w) => (isPast(w.date) || isToday(w.date)) && w.type !== 'rest').length;
  const completionRate = totalPlanned > 0 ? Math.round((totalLogged / totalPlanned) * 100) : 0;

  const totalDistance = logs.filter((l) => l.type === 'run' && l.distance).reduce((s, l) => s + (l.distance || 0), 0);
  const totalTime = logs.filter((l) => (l.type === 'run' || l.type === 'gym') && l.duration).reduce((s, l) => s + (l.duration || 0), 0);
  const daysToRace = Math.max(0, Math.ceil((new Date(RACE_DATE + 'T00:00:00') - new Date()) / 86400000));
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].kg : null;

  return (
    <div className="px-4 py-4 space-y-5">
      {/* HERO - COUNTDOWN */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.surface} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${C.race} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
        />
        <div
          className="text-[10px] tracking-widest mb-3"
          style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.3em', fontWeight: 600 }}
        >
          COPENHAGEN · 09 MAY 2027
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className="leading-none"
            style={{ color: C.race, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '5.5rem' }}
          >
            {daysToRace}
          </span>
          <span
            className="text-sm tracking-widest"
            style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 500 }}
          >
            DAYS<br />TO GO
          </span>
        </div>
        <div
          className="mt-3 pt-3 flex items-center gap-3 text-xs"
          style={{ borderTop: `1px solid ${C.border}`, color: C.textDim, fontFamily: 'JetBrains Mono, monospace' }}
        >
          <Target size={12} />
          <span>SUB-4:00 · 5:41/km</span>
        </div>
      </div>

      {/* TODAY (PROMINENT) */}
      {todayWorkout && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2
              className="tracking-widest"
              style={{
                color: C.primary,
                fontFamily: 'Oswald, sans-serif',
                letterSpacing: '0.3em',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              TODAY
            </h2>
            <PhaseBadge phase={currentWeek.phase} />
          </div>
          <WorkoutRow
            workout={todayWorkout}
            log={todayLog}
            onClick={() => onWorkoutClick(todayWorkout)}
          />
        </div>
      )}

      {/* BIG STATS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="WEEK" value={currentWeekNum} unit={`/ ${TOTAL_WEEKS}`} accent={C.primary} />
        <StatCard
          label="DONE"
          value={completionRate}
          unit="%"
          accent={completionRate >= 90 ? C.primary : completionRate >= 70 ? C.warn : C.danger}
          sub={`${totalLogged} sessions`}
        />
        <StatCard label="DISTANCE" value={totalDistance.toFixed(0)} unit="km" />
        <StatCard label="TIME" value={Math.floor(totalTime / 60)} unit={`h ${Math.round(totalTime % 60)}m`} />
      </div>

      {latestWeight && (
        <div
          className="rounded-xl px-4 flex items-center justify-between"
          style={{ height: 56, backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <Scale size={18} style={{ color: C.textDim }} />
            <span
              className="text-[11px] tracking-widest"
              style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
            >
              LATEST WEIGHT
            </span>
          </div>
          <span
            className="text-xl"
            style={{ color: C.text, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
          >
            {latestWeight} <span className="text-xs" style={{ color: C.textDim }}>kg</span>
          </span>
        </div>
      )}

      {/* THIS WEEK */}
      <div>
        <h2
          className="tracking-widest mb-2 px-1"
          style={{
            color: C.textDim,
            fontFamily: 'Oswald, sans-serif',
            letterSpacing: '0.3em',
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        >
          THIS WEEK
        </h2>
        <div className="space-y-2">
          {currentWeek.workouts.map((w) => (
            <WorkoutRow
              key={w.date}
              workout={w}
              log={logs.find((l) => l.date === w.date)}
              onClick={() => onWorkoutClick(w)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PLAN VIEW
// ============================================================

function PlanView({ plan, logs, onWorkoutClick }) {
  const [weekNum, setWeekNum] = useState(getCurrentWeekNumber());
  const week = plan.find((w) => w.weekNum === weekNum);
  if (!week) return null;

  const weekDistance = week.workouts.reduce((s, w) => s + (w.plannedDistance || 0), 0);
  const longRun = week.workouts.find((w) => w.subtype === 'long' || w.subtype === 'marathon');
  const weekLogged = week.workouts.filter((w) => logs.find((l) => l.date === w.date && l.completed)).length;
  const weekTrainingSessions = week.workouts.filter((w) => w.type !== 'rest').length;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* WEEK NAVIGATOR */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setWeekNum((n) => Math.max(1, n - 1))}
          disabled={weekNum === 1}
          className="rounded-xl flex items-center justify-center"
          style={{
            width: 48, height: 48,
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            opacity: weekNum === 1 ? 0.3 : 1,
          }}
        >
          <ChevronLeft size={22} style={{ color: C.text }} />
        </button>
        <div
          className="flex-1 rounded-xl flex flex-col items-center justify-center"
          style={{ height: 48, backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <div
            className="text-[10px] tracking-widest"
            style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.3em', fontWeight: 600 }}
          >
            WEEK {String(weekNum).padStart(2, '0')} / {TOTAL_WEEKS}
          </div>
          <div
            className="text-xs"
            style={{ color: C.text, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {formatDateDisplay(week.startDate)} — {formatDateDisplay(week.workouts[6].date)}
          </div>
        </div>
        <button
          onClick={() => setWeekNum((n) => Math.min(TOTAL_WEEKS, n + 1))}
          disabled={weekNum === TOTAL_WEEKS}
          className="rounded-xl flex items-center justify-center"
          style={{
            width: 48, height: 48,
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            opacity: weekNum === 51 ? 0.3 : 1,
          }}
        >
          <ChevronRight size={22} style={{ color: C.text }} />
        </button>
      </div>

      {/* PHASE INFO */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <PhaseBadge phase={week.phase} />
          <span
            className="text-xs"
            style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {weekLogged}/{weekTrainingSessions} done
          </span>
        </div>
        <div
          className="text-base mb-1"
          style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 600, letterSpacing: '0.05em' }}
        >
          {PHASE_DATA[week.phase].fullName.toUpperCase()}
        </div>
        <div className="text-xs mb-3" style={{ color: C.textDim, fontFamily: 'Manrope, sans-serif', lineHeight: 1.5 }}>
          {PHASE_DATA[week.phase].desc}
        </div>
        <div
          className="grid grid-cols-2 gap-4 pt-3"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div>
            <div
              className="text-[10px] tracking-widest mb-1"
              style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
            >
              VOLUME
            </div>
            <div
              className="leading-none"
              style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '1.75rem' }}
            >
              {weekDistance.toFixed(1)} <span className="text-xs" style={{ color: C.textDim }}>km</span>
            </div>
          </div>
          {longRun && longRun.plannedDistance > 0 && (
            <div>
              <div
                className="text-[10px] tracking-widest mb-1"
                style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
              >
                LONG RUN
              </div>
              <div
                className="leading-none"
                style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '1.75rem' }}
              >
                {longRun.plannedDistance} <span className="text-xs" style={{ color: C.textDim }}>km</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WORKOUTS */}
      <div className="space-y-2">
        {week.workouts.map((w) => (
          <WorkoutRow
            key={w.date}
            workout={w}
            log={logs.find((l) => l.date === w.date)}
            onClick={() => onWorkoutClick(w)}
          />
        ))}
      </div>

      {/* PHASE JUMP (THUMB ZONE) */}
      <div className="pt-2">
        <div
          className="text-[10px] mb-2 tracking-widest px-1"
          style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
        >
          JUMP TO PHASE
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { p: 'base', w: 1, range: [1, 8] },
            { p: 'build', w: 9, range: [9, 18] },
            { p: 'peak', w: 19, range: [19, 26] },
            { p: 'taper', w: 27, range: [27, 31] },
          ].map((b) => {
            const active = weekNum >= b.range[0] && weekNum <= b.range[1];
            return (
              <button
                key={b.p}
                onClick={() => setWeekNum(b.w)}
                className="rounded-xl text-xs"
                style={{
                  height: 48,
                  backgroundColor: active ? PHASE_DATA[b.p].color + '20' : C.surface,
                  border: `1px solid ${active ? PHASE_DATA[b.p].color : C.border}`,
                  color: active ? PHASE_DATA[b.p].color : C.textDim,
                  fontFamily: 'Oswald, sans-serif',
                  letterSpacing: '0.2em',
                  fontWeight: 600,
                }}
              >
                {PHASE_DATA[b.p].name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS VIEW (CHARTS)
// ============================================================

function Progress({ plan, logs, weights, onAddWeight }) {
  const currentWeekNum = getCurrentWeekNumber();

  const volumeData = useMemo(() => plan.map((week) => ({
    week: week.weekNum,
    planned: Math.round(week.workouts.reduce((s, w) => s + (w.plannedDistance || 0), 0) * 10) / 10,
    actual: Math.round(week.workouts.reduce((s, w) => {
      const log = logs.find((l) => l.date === w.date);
      return s + (log?.distance || 0);
    }, 0) * 10) / 10,
  })), [plan, logs]);

  const longRunData = useMemo(() => plan.map((week) => {
    const lr = week.workouts.find((w) => w.subtype === 'long' || w.subtype === 'marathon');
    const log = lr ? logs.find((l) => l.date === lr.date) : null;
    return { week: week.weekNum, planned: lr?.plannedDistance || 0, actual: log?.distance || null };
  }), [plan, logs]);

  const paceData = useMemo(() => logs
    .filter((l) => (l.type === 'run' || l.type === 'race') && l.pace && l.distance)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({
      date: l.date,
      dateLabel: formatDateDisplay(l.date),
      paceSec: paceToSec(l.pace),
      pace: l.pace,
      distance: l.distance,
    })), [logs]);

  // Zone distribution
  const zoneDistribution = useMemo(() => {
    const counts = HR_ZONES.map((z) => ({
      zone: z.id,
      name: z.name,
      color: z.color,
      count: logs.filter((l) => l.zone === z.id).length,
    }));
    const total = counts.reduce((s, c) => s + c.count, 0);
    return { data: counts.filter((c) => c.count > 0), total };
  }, [logs]);

  const completionStats = useMemo(() => {
    const phaseStats = {};
    Object.keys(PHASE_DATA).forEach((p) => { phaseStats[p] = { planned: 0, completed: 0 }; });
    plan.forEach((week) => {
      if (week.weekNum > currentWeekNum) return;
      week.workouts.forEach((w) => {
        if (w.type === 'rest') return;
        if (!isPast(w.date) && !isToday(w.date)) return;
        phaseStats[week.phase].planned += 1;
        const log = logs.find((l) => l.date === w.date);
        if (log?.completed) phaseStats[week.phase].completed += 1;
      });
    });
    return phaseStats;
  }, [plan, logs, currentWeekNum]);

  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <h1
          className="text-3xl"
          style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 700, letterSpacing: '0.03em' }}
        >
          PROGRESS
        </h1>
        <div
          className="text-xs mt-1"
          style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
        >
          Week {currentWeekNum} of {TOTAL_WEEKS} · {Math.round((currentWeekNum / TOTAL_WEEKS) * 100)}% through plan
        </div>
      </div>

      {/* COMPLETION BY PHASE */}
      <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <h3
          className="text-[11px] tracking-widest mb-4"
          style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
        >
          COMPLETION BY PHASE
        </h3>
        <div className="space-y-4">
          {Object.keys(PHASE_DATA).map((p) => {
            const stats = completionStats[p];
            const pct = stats.planned > 0 ? Math.round((stats.completed / stats.planned) * 100) : 0;
            const data = PHASE_DATA[p];
            return (
              <div key={p}>
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: data.color, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.2em', fontWeight: 600 }}>
                    {data.name}
                  </span>
                  <span style={{ color: C.textDim, fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.completed}/{stats.planned} · {pct}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: C.bg }}>
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: data.color, borderRadius: 8 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WEEKLY VOLUME */}
      <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <h3
          className="text-[11px] tracking-widest mb-3"
          style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
        >
          WEEKLY VOLUME · KM
        </h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={volumeData} margin={{ top: 10, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
              <XAxis dataKey="week" stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} interval={5} />
              <YAxis stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
              <Tooltip contentStyle={{ backgroundColor: C.bg, border: `1px solid ${C.borderLight}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, borderRadius: 8 }} labelStyle={{ color: C.textDim }} />
              <ReferenceLine x={currentWeekNum} stroke={C.primary} strokeDasharray="2 2" />
              <Bar dataKey="planned" fill={C.border} radius={[3, 3, 0, 0]} name="Planned" />
              <Bar dataKey="actual" fill={C.primary} radius={[3, 3, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LONG RUN */}
      <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <h3
          className="text-[11px] tracking-widest mb-3"
          style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
        >
          LONG RUN PROGRESSION · KM
        </h3>
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={longRunData} margin={{ top: 10, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
              <XAxis dataKey="week" stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} interval={5} />
              <YAxis stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
              <Tooltip contentStyle={{ backgroundColor: C.bg, border: `1px solid ${C.borderLight}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, borderRadius: 8 }} labelStyle={{ color: C.textDim }} />
              <ReferenceLine y={42.2} stroke={C.race} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="planned" stroke={C.borderLight} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="actual" stroke={C.primary} strokeWidth={2.5} dot={{ r: 3, fill: C.primary }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PACE */}
      <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <h3
          className="text-[11px] tracking-widest mb-3"
          style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
        >
          PACE PROGRESSION · MIN/KM
        </h3>
        {paceData.length === 0 ? (
          <div
            className="py-12 text-center text-xs"
            style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            LOG SOME RUNS TO SEE PROGRESSION
          </div>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={paceData} margin={{ top: 10, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                <XAxis dataKey="dateLabel" stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
                <YAxis
                  stroke={C.textMuted}
                  style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  reversed
                  tickFormatter={(v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}`}
                />
                <Tooltip contentStyle={{ backgroundColor: C.bg, border: `1px solid ${C.borderLight}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, borderRadius: 8 }} labelStyle={{ color: C.textDim }} formatter={(v, n, p) => [p.payload.pace + '/km', 'Pace']} />
                <ReferenceLine y={341} stroke={C.race} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="paceSec" stroke={C.primary} strokeWidth={2.5} dot={{ r: 4, fill: C.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ZONE DISTRIBUTION */}
      {zoneDistribution.total > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <h3
            className="text-[11px] tracking-widest mb-3"
            style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
          >
            HR ZONE DISTRIBUTION
          </h3>
          <div className="space-y-2.5">
            {HR_ZONES.map((z) => {
              const count = zoneDistribution.data.find((d) => d.zone === z.id)?.count || 0;
              const pct = zoneDistribution.total > 0 ? (count / zoneDistribution.total) * 100 : 0;
              return (
                <div key={z.id}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <ZoneBadge zone={z.id} size="sm" />
                      <span className="text-xs" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
                        {z.name}
                      </span>
                    </div>
                    <span style={{ color: C.textDim, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      {count} {count === 1 ? 'run' : 'runs'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.bg }}>
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: z.color, borderRadius: 8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEIGHT */}
      <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[11px] tracking-widest"
            style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
          >
            WEIGHT · KG
          </h3>
          <button
            onClick={onAddWeight}
            className="rounded-xl flex items-center gap-1.5 px-3"
            style={{
              height: 36,
              backgroundColor: C.primary + '20',
              border: `1px solid ${C.primary}50`,
              color: C.primary,
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.15em',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            <Plus size={14} /> LOG
          </button>
        </div>
        {weights.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>
            NO WEIGHT ENTRIES YET
          </div>
        ) : (
          <div style={{ height: 160 }}>
            <ResponsiveContainer>
              <AreaChart data={weights.map((w) => ({ date: formatDateDisplay(w.date), kg: w.kg }))} margin={{ top: 10, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
                <YAxis stroke={C.textMuted} style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ backgroundColor: C.bg, border: `1px solid ${C.borderLight}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="kg" stroke={C.primary} strokeWidth={2} fill="url(#weightFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// WEIGHT MODAL
// ============================================================

function WeightModal({ onClose, onSave }) {
  const [kg, setKg] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);

  function handleSave() {
    if (!kg || parseFloat(kg) <= 0) return;
    setSaving(true);
    saveWeight(date, parseFloat(kg));
    setSaving(false);
    onSave();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.borderLight}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <h3
            className="text-xl"
            style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 600, letterSpacing: '0.08em' }}
          >
            LOG WEIGHT
          </h3>
          <button onClick={onClose} className="flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <X size={22} style={{ color: C.textDim }} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
              DATE
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 rounded-xl"
              style={{
                height: 52,
                backgroundColor: C.bg,
                border: `1px solid ${C.borderLight}`,
                color: C.text,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1.5" style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.1em' }}>
              WEIGHT (KG)
            </label>
            <input
              type="number"
              step="0.1"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              autoFocus
              placeholder="70.5"
              className="w-full px-4 rounded-xl text-2xl"
              style={{
                height: 60,
                backgroundColor: C.bg,
                border: `1px solid ${C.borderLight}`,
                color: C.text,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </div>
        </div>

        <div
          className="px-5 py-4 flex gap-2"
          style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.surfaceLight }}
        >
          <button
            onClick={onClose}
            className="flex-1 rounded-xl"
            style={{
              height: 52,
              backgroundColor: C.bg,
              border: `1px solid ${C.borderLight}`,
              color: C.textDim,
              fontFamily: 'Oswald, sans-serif',
              letterSpacing: '0.2em',
              fontWeight: 600,
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !kg}
            className="flex-1 rounded-xl"
            style={{
              height: 52,
              backgroundColor: C.primary,
              color: C.bg,
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 700,
              letterSpacing: '0.2em',
              opacity: !kg ? 0.4 : 1,
            }}
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GUIDE (WITH HR ZONES)
// ============================================================

const GUIDE_TABS = [
  { id: 'zones', label: 'ZONES', icon: Heart, color: '#ef4444' },
  { id: 'nutrition', label: 'FUEL', icon: Apple, color: '#fb923c' },
  { id: 'sleep', label: 'SLEEP', icon: Moon, color: '#a78bfa' },
  { id: 'pacing', label: 'PACE', icon: Target, color: '#fbbf24' },
  { id: 'equipment', label: 'GEAR', icon: Footprints, color: '#a3e635' },
];

function ZoneCard({ zone }) {
  const range = zoneBpm(zone);
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: C.surface, border: `1px solid ${zone.color}30` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div
            className="leading-none mb-1"
            style={{ color: zone.color, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '2rem' }}
          >
            {zone.id}
          </div>
          <div
            className="text-xs tracking-widest"
            style={{ color: zone.color, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
          >
            {zone.name}
          </div>
        </div>
        <div className="text-right">
          <div
            className="leading-none"
            style={{ color: C.text, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.5rem' }}
          >
            {range.min}–{range.max}
          </div>
          <div
            className="text-[10px] mt-1"
            style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
          >
            bpm · {zone.minPct}–{zone.maxPct}%
          </div>
        </div>
      </div>

      {/* Visual bar */}
      <div className="relative h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: C.bg }}>
        <div
          className="absolute h-full"
          style={{
            left: `${zone.minPct}%`,
            width: `${zone.maxPct - zone.minPct}%`,
            backgroundColor: zone.color,
            borderRadius: 8,
          }}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Wind size={12} style={{ color: C.textMuted, marginTop: 3 }} />
          <span className="text-xs" style={{ color: C.textDim, fontFamily: 'Manrope, sans-serif' }}>
            <strong style={{ color: C.text }}>Feel:</strong> {zone.feel}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Target size={12} style={{ color: C.textMuted, marginTop: 3 }} />
          <span className="text-xs" style={{ color: C.textDim, fontFamily: 'Manrope, sans-serif' }}>
            <strong style={{ color: C.text }}>Use:</strong> {zone.use}
          </span>
        </div>
      </div>
    </div>
  );
}

const GUIDE_CONTENT = {
  nutrition: [
    {
      h: 'DAILY (NON-TRAINING)',
      items: [
        'Carbs: 5–7 g/kg body weight (whole grains, pasta, rice, oats, fruit)',
        'Protein: 1.6–2.0 g/kg (lean meat, fish, eggs, yogurt, legumes)',
        'Fats: 1–1.5 g/kg (olive oil, nuts, avocado, fatty fish)',
        'Hydration: 3–4 L water daily; more on training days',
      ],
    },
    {
      h: 'PRE-RUN',
      items: [
        'Light runs (≤8 km): no fuel needed',
        'Moderate runs (8–12 km): small snack 30–45 min before — banana + PB, oat bar',
        'Long runs (>15 km): real meal 1.5–2 h before — oatmeal + berries + honey',
        'Big pre-run meal (3–4 h before): pasta with light sauce',
      ],
    },
    {
      h: 'DURING RUN',
      items: [
        '< 10 km: water only',
        '10–20 km: 200–300 ml sports drink every 30 min',
        '20+ km: 30–60 g carbs/hour — gels every 30–45 min + water',
        'Electrolytes if >90 min: 300–500 mg sodium/hour',
        'Hydration: 500–750 ml fluid per hour',
      ],
    },
    {
      h: 'POST-RUN (30–60 MIN)',
      items: [
        'Carbs + protein in 3:1 ratio',
        '70 kg body: ~70–84 g carbs + 17–28 g protein',
        'Quick: chocolate milk, banana + yogurt, sandwich, rice bowl with chicken',
        'Rehydrate: 150% of fluid lost',
      ],
    },
    {
      h: 'RACE DAY',
      items: [
        'Breakfast 3–4 h before: toast + honey + banana',
        '30 min before: small snack + 200 ml sports drink',
        'During race (~4 h): 40–45 g carbs/hour = ~160–180 g total',
        'Every 30 min at aid stations: sports drink + water, or gel + water',
        'NEVER try anything new on race day',
      ],
    },
  ],
  sleep: [
    {
      h: 'YOUR CHALLENGE',
      items: [
        '6–7 hrs is suboptimal for this training intensity',
        'Ideal: 7–8 hrs minimum during Phase 2–3',
        'If sleep drops below 6 hrs → reduce intensity',
        'Sleep = when muscle repair and glycogen restoration happens',
      ],
    },
    {
      h: 'SLEEP HABITS',
      items: [
        'Same bedtime nightly (even weekends)',
        'No screens 30 min before bed',
        'Bedroom cool (16–18°C), dark, quiet',
        'No caffeine after 14:00',
        'No large meals 3 h before bed',
      ],
    },
    {
      h: 'OFF DAY RECOVERY',
      items: [
        '30–45 min walking: blood flow',
        '20–30 min yoga: flexibility, breath',
        '30–45 min swimming: low-impact',
        '15–20 min foam rolling',
        '15–20 min stretching',
      ],
    },
    {
      h: 'RED FLAGS',
      items: [
        'Resting HR elevated 7+ bpm above normal → reduce volume',
        'Sleep consistently below 6 hrs → adjust schedule',
        'Persistent soreness 48 h+ → extra recovery day',
        'Loss of motivation → take 3 days off',
        'Sharp pain that worsens → STOP, see physio',
      ],
    },
  ],
  pacing: [
    {
      h: 'GOAL: SUB-4:00 @ 5:41/KM',
      items: [
        'km 0–10: 5:45/km — controlled start (target 57:30)',
        'km 10–30: 5:41/km — goal pace (target 1:53:40)',
        'km 30–35: 5:38/km — push (target 28:10)',
        'km 35–42.2: 5:35/km — final push (target 40:12)',
        'Finish: 3:59:32',
      ],
    },
    {
      h: 'TARGET SPLITS',
      items: [
        '10 km: 57:30',
        '21.1 km (half): 2:00:30',
        '30 km: 2:51:10',
        '42.2 km (finish): 3:59:30',
      ],
    },
    {
      h: 'MENTAL CHECKPOINTS',
      items: [
        'km 10: "Warm-up done, pace controlled."',
        'km 15: "1/3 done, feeling strong."',
        'km 21: "Halfway! Half work done."',
        'km 30: "12 km left — real race starts now."',
        'km 35: "7 km left — dig deep."',
        'km 40: "2.2 km left — sprint to the finish!"',
      ],
    },
    {
      h: 'RACE DAY RULES',
      items: [
        'NEVER go out faster than 5:41/km in km 1–10',
        'Stick to fueling plan even if feeling great',
        'Don\'t chase other runners\' paces',
        'Walking aid stations is fine and often smart',
        'If you blow up at km 30+, walk-run to finish (4:1)',
      ],
    },
  ],
  equipment: [
    {
      h: 'RUNNING SHOES',
      items: [
        'Get gait analysis at specialty store before upgrade',
        'Replace every 800–1000 km (6–9 months)',
        'Race shoes need 200 km in training',
        'Rotate 2 pairs to extend life',
        'Budget: €100–150',
      ],
    },
    {
      h: 'TRAINING GEAR',
      items: [
        'Socks: merino wool or synthetic, NEVER cotton',
        'Shorts: breathable, with gel pocket',
        'Shirt: moisture-wicking polyester/nylon',
        'Winter CPH: tights, jacket, hat, gloves',
        'GPS watch: Garmin Forerunner 245+ recommended',
        'Anti-chafe: Vaseline, Body Glide, or Lube1',
      ],
    },
    {
      h: 'LONG-RUN EXTRAS',
      items: [
        'Hydration belt or vest for runs >15 km',
        'Handheld bottle (500 ml) for medium runs',
        'Gels in pocket or belt loops',
        'Sunscreen SPF 30+ sports-grade',
        'Foam roller at home',
      ],
    },
    {
      h: 'RACE DAY KIT',
      items: [
        'SAME outfit you\'ve trained in — never new',
        'Bib + timing chip + safety pins',
        'Vaseline on nipples, groin, feet',
        '2–3 backup gels in pocket',
        'GPS watch fully charged',
        'Throwaway warm-up layer for start corral',
      ],
    },
  ],
};

function Guide() {
  const [tab, setTab] = useState('zones');

  return (
    <div className="px-4 py-4">
      <h1
        className="text-3xl mb-1"
        style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 700, letterSpacing: '0.03em' }}
      >
        GUIDE
      </h1>
      <div
        className="text-xs mb-4"
        style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
      >
        Tap a section for details
      </div>

      {/* TAB BAR — scrolling row */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {GUIDE_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 rounded-xl flex-shrink-0"
              style={{
                height: 44,
                backgroundColor: active ? t.color + '20' : C.surface,
                border: `1px solid ${active ? t.color : C.border}`,
                color: active ? t.color : C.textDim,
              }}
            >
              <Icon size={16} />
              <span
                className="text-xs tracking-widest"
                style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.2em', fontWeight: 600 }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* HR ZONES TAB (SPECIAL) */}
      {tab === 'zones' && (
        <div className="space-y-3">
          {/* Max HR card */}
          <div
            className="rounded-xl p-5 relative overflow-hidden"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.danger}40` }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
              style={{ background: `radial-gradient(circle, ${C.danger} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
            />
            <div className="flex items-center gap-2 mb-2">
              <Heart size={14} style={{ color: C.danger }} />
              <span
                className="text-[10px] tracking-widest"
                style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.3em', fontWeight: 600 }}
              >
                YOUR MAX HR
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="leading-none"
                style={{ color: C.text, fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: '4rem' }}
              >
                {MAX_HR}
              </span>
              <span style={{ color: C.textDim, fontFamily: 'JetBrains Mono, monospace' }}>bpm</span>
            </div>
            <div
              className="text-xs mt-2"
              style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}
            >
              Tanaka formula · 208 − 0.7 × {USER_AGE}
            </div>
          </div>

          {/* Zone cards */}
          {HR_ZONES.map((z) => (
            <ZoneCard key={z.id} zone={z} />
          ))}

          {/* Tip card */}
          <div
            className="rounded-xl p-4 text-xs"
            style={{ backgroundColor: C.surfaceLight, border: `1px solid ${C.border}`, color: C.textDim, fontFamily: 'Manrope, sans-serif', lineHeight: 1.6 }}
          >
            <div
              className="text-[10px] mb-2 tracking-widest"
              style={{ color: C.primary, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 700 }}
            >
              ⚡ TIP
            </div>
            Aim for 80% of training in Z1–Z2 (easy) and 20% in Z3–Z5 (hard). This 80/20 rule prevents overtraining and builds your aerobic base — critical for the 5:41/km marathon goal.
          </div>
        </div>
      )}

      {/* OTHER TABS */}
      {tab !== 'zones' && GUIDE_CONTENT[tab] && (
        <div className="space-y-3">
          {GUIDE_CONTENT[tab].map((s, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            >
              <h3
                className="text-xs mb-3 tracking-widest"
                style={{ color: GUIDE_TABS.find((t) => t.id === tab).color, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 700 }}
              >
                {s.h}
              </h3>
              <ul className="space-y-2.5">
                {s.items.map((item, j) => (
                  <li
                    key={j}
                    className="text-sm flex gap-2.5"
                    style={{ color: C.text, fontFamily: 'Manrope, sans-serif', lineHeight: 1.5 }}
                  >
                    <span
                      className="flex-shrink-0 mt-1"
                      style={{
                        width: 5, height: 5, borderRadius: 5,
                        backgroundColor: GUIDE_TABS.find((t) => t.id === tab).color,
                      }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

const TABS = [
  { id: 'dashboard', label: 'HOME', icon: Flame },
  { id: 'plan', label: 'PLAN', icon: Calendar },
  { id: 'progress', label: 'STATS', icon: TrendingUp },
  { id: 'guide', label: 'GUIDE', icon: BookOpen },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const plan = useMemo(() => generateFullPlan(), []);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const refreshData = useCallback(() => {
    try {
      setLogs(listAllLogs());
      setWeights(listAllWeights());
    } catch (err) {
      console.error('Error loading data:', err);
      setLogs([]);
      setWeights([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    refreshData(); 
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: C.bg, color: C.text }}
      >
        <div
          className="text-xs tracking-widest"
          style={{ color: C.textDim, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.4em', fontWeight: 600 }}
        >
          LOADING...
        </div>
      </div>
    );
  }

  const existingLog = selectedWorkout ? logs.find((l) => l.date === selectedWorkout.date) : null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: C.bg, color: C.text, fontFamily: 'Manrope, sans-serif' }}
    >
      {/* TOP BAR (MINIMAL) */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          backgroundColor: C.bg + 'ee',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div
              className="text-xs tracking-widest"
              style={{ color: C.primary, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.35em', fontWeight: 700 }}
            >
              CPH/27
            </div>
            <div
              className="text-[9px] tracking-widest mt-0.5"
              style={{ color: C.textMuted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}
            >
              MARATHON · SUB-4:00
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.primary }} />
            <span
              className="text-[10px] tracking-widest"
              style={{ color: C.textMuted, fontFamily: 'Oswald, sans-serif', letterSpacing: '0.25em', fontWeight: 600 }}
            >
              LIVE
            </span>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ paddingBottom: 88 }}>
        {tab === 'dashboard' && <Dashboard plan={plan} logs={logs} weights={weights} onWorkoutClick={setSelectedWorkout} />}
        {tab === 'plan' && <PlanView plan={plan} logs={logs} onWorkoutClick={setSelectedWorkout} />}
        {tab === 'progress' && <Progress plan={plan} logs={logs} weights={weights} onAddWeight={() => setShowWeightModal(true)} />}
        {tab === 'guide' && <Guide />}
      </main>

      {/* BOTTOM NAV (THUMB ZONE, BIGGER) */}
      <nav
        className="fixed bottom-0 left-0 right-0 backdrop-blur"
        style={{
          backgroundColor: C.bg + 'f5',
          borderTop: `1px solid ${C.border}`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-col items-center justify-center gap-1 relative"
                style={{
                  height: 72,
                  color: active ? C.primary : C.textMuted,
                }}
              >
                {active && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2"
                    style={{ width: 32, height: 3, backgroundColor: C.primary, borderRadius: 8 }}
                  />
                )}
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                <span
                  className="text-[10px] tracking-widest"
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    letterSpacing: '0.2em',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODALS */}
      {selectedWorkout && (
        <LogModal
          workout={selectedWorkout}
          existingLog={existingLog}
          onClose={() => setSelectedWorkout(null)}
          onSave={() => { refreshData(); setSelectedWorkout(null); }}
          onDelete={() => { refreshData(); setSelectedWorkout(null); }}
        />
      )}
      {showWeightModal && (
        <WeightModal
          onClose={() => setShowWeightModal(false)}
          onSave={() => { refreshData(); setShowWeightModal(false); }}
        />
      )}
    </div>
  );
}
