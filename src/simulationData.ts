import type { JobId, SimulationState, TownNeed } from './types'

export const simulationJobNeeds: Partial<Record<JobId, TownNeed>> = {
  bakery: 'food',
  bus: 'transport',
  waste: 'cleanliness',
}

export const townNeedInfo: Record<TownNeed, { label: string; shortLabel: string; place: string; good: string; warning: string }> = {
  food: {
    label: '食べもの', shortLabel: 'ごはん', place: 'パン屋',
    good: 'お店に パンが ならんでいる', warning: 'パンが 足りなくなっている',
  },
  transport: {
    label: 'いどう', shortLabel: 'バス', place: 'バス営業所',
    good: 'バスが 時間どおり はしっている', warning: 'バスていに 人が ならんでいる',
  },
  cleanliness: {
    label: 'きれいさ', shortLabel: 'きれい', place: 'しゅうしゅう所',
    good: '道と 公園が きれい', warning: '公園に ごみが ふえている',
  },
}

const emptyJobStats = () => ({
  bakery: { shifts: 0, xp: 0, level: 1, bestQuality: 0 },
  bus: { shifts: 0, xp: 0, level: 1, bestQuality: 0 },
  nurse: { shifts: 0, xp: 0, level: 1, bestQuality: 0 },
  waste: { shifts: 0, xp: 0, level: 1, bestQuality: 0 },
  farmer: { shifts: 0, xp: 0, level: 1, bestQuality: 0 },
  library: { shifts: 0, xp: 0, level: 1, bestQuality: 0 },
})

export function createInitialSimulation(wallet = 0, savings = 0): SimulationState {
  return {
    schemaVersion: 3,
    day: 1,
    totalDays: 3,
    phase: 'morning',
    clockMinutes: 8 * 60,
    energy: 5,
    maxEnergy: 5,
    townTrust: 0,
    town: { food: 1, transport: 2, cleanliness: 2 },
    todayNeed: 'food',
    jobStats: emptyJobStats(),
    workedToday: false,
    shoppedToday: false,
    moneyDecision: null,
    dayStartWallet: wallet,
    dayStartSavings: savings,
    lastShift: null,
    history: [],
  }
}

export function mergeSimulation(stored: Partial<SimulationState> | undefined, wallet: number, savings: number): SimulationState {
  const initial = createInitialSimulation(wallet, savings)
  return {
    ...initial,
    ...stored,
    town: { ...initial.town, ...(stored?.town ?? {}) },
    jobStats: Object.fromEntries(Object.entries(initial.jobStats).map(([jobId, value]) => [jobId, { ...value, ...(stored?.jobStats?.[jobId as JobId] ?? {}) }])) as SimulationState['jobStats'],
    history: Array.isArray(stored?.history) ? stored.history : [],
  }
}

export function formatGameTime(minutes: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, minutes))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function chooseNextNeed(town: Record<TownNeed, number>, day: number): TownNeed {
  const rotation: TownNeed[] = ['food', 'transport', 'cleanliness']
  return [...rotation].sort((a, b) => town[a] - town[b] || ((rotation.indexOf(a) - day + 3) % 3) - ((rotation.indexOf(b) - day + 3) % 3))[0]
}

export const demandBonusFor = (simulation: SimulationState, jobId: JobId) => simulationJobNeeds[jobId] === simulation.todayNeed ? 2 : 0
