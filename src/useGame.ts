import { useCallback, useEffect, useState } from 'react'
import { jobs, problems, unexpectedEvents } from './data'
import type { GameState, JobId, Screen, SpendingRecord } from './types'

const STORAGE_KEY = 'tsunagari-town-progress-v1'

const defaultBudget = {
  learning: 2,
  transport: 2,
  health: 2,
  park: 1,
  waste: 2,
  disaster: 1,
}

const makeProblemSet = (week: number) => {
  const offset = ((week - 1) * 3) % problems.length
  return Array.from({ length: 3 }, (_, index) => problems[(offset + index) % problems.length].id)
}

export const initialState: GameState = {
  screen: 'opening',
  week: 1,
  hasStarted: false,
  selectedProblemId: null,
  selectedJobId: null,
  activeProblemIds: makeProblemSet(1),
  completedMissions: [],
  earnedJobCards: [],
  grossEarned: 0,
  sharedPaid: 0,
  wallet: 0,
  savings: 0,
  spending: [],
  spendingReason: '',
  eventId: null,
  eventResponseId: null,
  budget: defaultBudget,
  reflections: {},
  weekComplete: false,
}

const readState = (): GameState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const stored = JSON.parse(raw) as Partial<GameState>
    return {
      ...initialState,
      ...stored,
      screen: 'opening',
      budget: { ...defaultBudget, ...(stored.budget ?? {}) },
    }
  } catch {
    return initialState
  }
}

export function useGame() {
  const [state, setState] = useState<GameState>(readState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setScreen = useCallback((screen: Screen) => {
    setState((current) => ({ ...current, screen }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const startWeek = useCallback((continueSaved = false) => {
    setState((current) => {
      if (continueSaved && current.hasStarted && !current.weekComplete) {
        return { ...current, screen: current.selectedProblemId ? current.screen === 'opening' ? 'map' : current.screen : 'map' }
      }
      const week = current.weekComplete ? current.week + 1 : current.week
      return {
        ...current,
        screen: 'map',
        week,
        hasStarted: true,
        selectedProblemId: null,
        selectedJobId: null,
        activeProblemIds: makeProblemSet(week),
        grossEarned: 0,
        sharedPaid: 0,
        wallet: 0,
        spending: [],
        spendingReason: '',
        eventId: unexpectedEvents[(week - 1) % unexpectedEvents.length].id,
        eventResponseId: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
      }
    })
  }, [])

  const selectProblem = useCallback((problemId: string) => {
    setState((current) => ({ ...current, selectedProblemId: problemId, selectedJobId: null, screen: 'job' }))
  }, [])

  const selectJob = useCallback((jobId: JobId) => {
    setState((current) => ({ ...current, selectedJobId: jobId, screen: 'job' }))
  }, [])

  const beginMission = useCallback(() => setScreen('mission'), [setScreen])

  const completeMission = useCallback(() => {
    setState((current) => {
      const job = jobs.find((item) => item.id === current.selectedJobId)
      if (!job) return current
      return {
        ...current,
        screen: 'payslip',
        completedMissions: current.completedMissions.includes(job.id)
          ? current.completedMissions
          : [...current.completedMissions, job.id],
        earnedJobCards: current.earnedJobCards.includes(job.id)
          ? current.earnedJobCards
          : [...current.earnedJobCards, job.id],
        grossEarned: job.reward,
        sharedPaid: job.shared,
        wallet: job.reward - job.shared,
      }
    })
  }, [])

  const saveSpending = useCallback((spending: SpendingRecord[], reason: string) => {
    setState((current) => {
      const saved = spending.find((record) => record.choiceId === 'savings')?.amount ?? 0
      const previouslySaved = current.spending.find((record) => record.choiceId === 'savings')?.amount ?? 0
      const total = spending.reduce((sum, record) => sum + record.amount, 0)
      return {
        ...current,
        spending,
        spendingReason: reason,
        savings: Math.max(0, current.savings - previouslySaved + saved),
        wallet: Math.max(0, current.grossEarned - current.sharedPaid - total),
        screen: 'event',
      }
    })
  }, [])

  const chooseEventResponse = useCallback((responseId: string) => {
    setState((current) => {
      const event = unexpectedEvents.find((item) => item.id === current.eventId)
      const response = event?.availableResponses.find((item) => item.id === responseId)
      if (!response) return current
      return {
        ...current,
        eventResponseId: responseId,
        wallet: Math.max(0, current.wallet + (response.walletChange ?? 0)),
        savings: Math.max(0, current.savings + (response.savingsChange ?? 0)),
      }
    })
  }, [])

  const saveBudget = useCallback((budget: Record<string, number>) => {
    setState((current) => ({ ...current, budget, screen: 'flow' }))
  }, [])

  const saveReflections = useCallback((reflections: Record<string, string>) => {
    setState((current) => ({ ...current, reflections, weekComplete: true, screen: 'reflection' }))
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
  }, [])

  return {
    state,
    setScreen,
    startWeek,
    selectProblem,
    selectJob,
    beginMission,
    completeMission,
    saveSpending,
    chooseEventResponse,
    saveBudget,
    saveReflections,
    reset,
  }
}
