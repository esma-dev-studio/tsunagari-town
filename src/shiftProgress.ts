import type { JobId } from './types'

export type SavedShiftPhase = 'arrival' | 'work' | 'handoff' | 'clockout'

export interface SavedShiftProgress {
  phase: SavedShiftPhase
  uniformOn: boolean
  orderIndex: number
  taskIndex: number
  effortDone: number
  activeStation: string | null
  delivered: boolean
  message: string
  decisionId?: string | null
  mistakes?: number
}

const SHIFT_STORAGE_PREFIX = 'tsunagari-town-shift-v1'

const progressKey = (week: number, day: number, jobId: JobId) => `${SHIFT_STORAGE_PREFIX}-${week}-${day}-${jobId}`

export function readShiftProgress(week: number, day: number, jobId: JobId): SavedShiftProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(week, day, jobId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SavedShiftProgress>
    if (!['arrival', 'work', 'handoff', 'clockout'].includes(value.phase ?? '')) return null
    if (typeof value.uniformOn !== 'boolean' || typeof value.delivered !== 'boolean') return null
    if (![value.orderIndex, value.taskIndex, value.effortDone].every((item) => Number.isInteger(item) && Number(item) >= 0)) return null
    if (value.activeStation !== null && typeof value.activeStation !== 'string') return null
    if (typeof value.message !== 'string') return null
    if (value.decisionId !== undefined && value.decisionId !== null && typeof value.decisionId !== 'string') return null
    if (value.mistakes !== undefined && (!Number.isInteger(value.mistakes) || Number(value.mistakes) < 0)) return null
    return value as SavedShiftProgress
  } catch {
    return null
  }
}

export function saveShiftProgress(week: number, day: number, jobId: JobId, progress: SavedShiftProgress) {
  localStorage.setItem(progressKey(week, day, jobId), JSON.stringify(progress))
}

export function clearShiftProgress(week: number, day: number, jobId: JobId) {
  localStorage.removeItem(progressKey(week, day, jobId))
}

export function clearShiftProgressForWeek(week: number) {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`${SHIFT_STORAGE_PREFIX}-${week}-`))
    .forEach((key) => localStorage.removeItem(key))
}

export function clearAllShiftProgress() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`${SHIFT_STORAGE_PREFIX}-`))
    .forEach((key) => localStorage.removeItem(key))
}
