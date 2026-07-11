import { useCallback, useEffect, useState } from 'react'
import { expenseChoices, jobs, problems, unexpectedEvents } from './data'
import type { GameState, JobId, MoneyRecord, Screen, SpendingRecord } from './types'

const STORAGE_KEY = 'tsunagari-town-progress-v1'

const defaultBudget = {
  learning: 0,
  transport: 0,
  health: 0,
  park: 0,
  waste: 0,
  disaster: 0,
}

const resumableScreens: Screen[] = [
  'map', 'problem', 'job', 'mission', 'payslip',
  'spend', 'event', 'budget', 'flow', 'reflection',
]

const isResumableScreen = (screen: Screen | null | undefined): screen is Screen => Boolean(screen && resumableScreens.includes(screen))

const totalsFromLedger = (ledger: MoneyRecord[]) => ledger.reduce((totals, record) => ({
  wallet: totals.wallet + record.walletDelta,
  savings: totals.savings + record.savingsDelta,
  totalSharedPaid: totals.totalSharedPaid + record.sharedDelta,
}), { wallet: 0, savings: 0, totalSharedPaid: 0 })

const withMoneyTotals = (state: GameState, ledger: MoneyRecord[]): GameState => {
  const totals = totalsFromLedger(ledger)
  return { ...state, ledger, ...totals }
}

const replaceMoneySource = (ledger: MoneyRecord[], source: string, records: MoneyRecord[]) => [
  ...ledger.filter((record) => record.source !== source),
  ...records,
]

const isMoneyRecord = (value: unknown): value is MoneyRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<MoneyRecord>
  return typeof record.id === 'string'
    && typeof record.source === 'string'
    && typeof record.week === 'number'
    && typeof record.kind === 'string'
    && typeof record.label === 'string'
    && typeof record.amount === 'number'
    && typeof record.walletDelta === 'number'
    && typeof record.savingsDelta === 'number'
    && typeof record.sharedDelta === 'number'
}

const isSpendingRecord = (value: unknown): value is SpendingRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<SpendingRecord>
  return typeof record.choiceId === 'string' && typeof record.amount === 'number'
}

const makeLegacyLedger = (stored: Partial<GameState>): MoneyRecord[] => {
  const week = Math.max(1, stored.week ?? 1)
  const wallet = typeof stored.wallet === 'number' ? stored.wallet : 0
  const savings = typeof stored.savings === 'number' ? stored.savings : 0
  const shared = typeof stored.totalSharedPaid === 'number'
    ? stored.totalSharedPaid
    : typeof stored.sharedPaid === 'number' ? stored.sharedPaid : 0

  if (stored.weekComplete === true) {
    return ([{
      id: 'legacy-opening', source: 'legacy-opening', week, kind: 'carryover',
      label: 'これまでの ざんだか', amount: wallet + savings,
      walletDelta: wallet, savingsDelta: savings, sharedDelta: shared,
    }] satisfies MoneyRecord[]).filter((record) => record.walletDelta !== 0 || record.savingsDelta !== 0 || record.sharedDelta !== 0)
  }

  const spending = Array.isArray(stored.spending) ? stored.spending.filter(isSpendingRecord) : []
  const savedThisWeek = spending
    .filter((record) => record.choiceId === 'savings')
    .reduce((sum, record) => sum + record.amount, 0)
  const event = unexpectedEvents.find((item) => item.id === stored.eventId)
  const response = event?.availableResponses.find((item) => item.id === stored.eventResponseId)
  const priorSavings = Math.max(0, savings - savedThisWeek - (response?.savingsChange ?? 0))

  return priorSavings > 0 ? [{
    id: 'legacy-opening', source: 'legacy-opening', week, kind: 'carryover',
    label: '前の週までの ちょきん', amount: priorSavings,
    walletDelta: 0, savingsDelta: priorSavings, sharedDelta: 0,
  }] : []
}

const makeProblemSet = (week: number) => {
  const offset = ((week - 1) * 3) % problems.length
  return Array.from({ length: 3 }, (_, index) => problems[(offset + index) % problems.length].id)
}

export const initialState: GameState = {
  screen: 'opening',
  resumeScreen: null,
  week: 1,
  hasStarted: false,
  selectedProblemId: null,
  selectedJobId: null,
  activeProblemIds: makeProblemSet(1),
  completedMissions: [],
  earnedJobCards: [],
  grossEarned: 0,
  sharedPaid: 0,
  totalSharedPaid: 0,
  wallet: 0,
  savings: 0,
  ledger: [],
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
    const isLegacy = !Array.isArray(stored.ledger)
    const storedLedger = Array.isArray(stored.ledger) ? stored.ledger.filter(isMoneyRecord) : []
    const ledger = isLegacy ? makeLegacyLedger(stored) : storedLedger
    const legacyRestart = isLegacy && stored.weekComplete !== true
    const restored: GameState = {
      ...initialState,
      ...stored,
      screen: 'opening',
      selectedProblemId: legacyRestart ? null : (stored.selectedProblemId ?? null),
      selectedJobId: legacyRestart ? null : (stored.selectedJobId ?? null),
      grossEarned: legacyRestart ? 0 : (stored.grossEarned ?? 0),
      sharedPaid: legacyRestart ? 0 : (stored.sharedPaid ?? 0),
      spending: legacyRestart ? [] : (stored.spending ?? []),
      spendingReason: legacyRestart ? '' : (stored.spendingReason ?? ''),
      eventId: legacyRestart
        ? unexpectedEvents[(Math.max(1, stored.week ?? 1) - 1) % unexpectedEvents.length].id
        : (stored.eventId ?? null),
      eventResponseId: legacyRestart ? null : (stored.eventResponseId ?? null),
      budget: legacyRestart ? { ...defaultBudget } : { ...defaultBudget, ...(stored.budget ?? {}) },
      reflections: legacyRestart ? {} : (stored.reflections ?? {}),
      weekComplete: legacyRestart ? false : (stored.weekComplete ?? false),
      resumeScreen: legacyRestart ? 'map' : (stored.resumeScreen ?? null),
      ledger,
    }
    return withMoneyTotals(restored, ledger)
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
    setState((current) => ({
      ...current,
      screen,
      resumeScreen: screen === 'home' && isResumableScreen(current.screen)
        ? current.screen
        : isResumableScreen(screen) ? screen : current.resumeScreen,
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const startWeek = useCallback((continueSaved = false) => {
    setState((current) => {
      if (continueSaved && current.hasStarted && !current.weekComplete) {
        const screen = isResumableScreen(current.resumeScreen) ? current.resumeScreen : 'map'
        return { ...current, screen, resumeScreen: screen }
      }
      const week = current.weekComplete ? current.week + 1 : current.week
      const ledger = current.weekComplete
        ? current.ledger
        : current.ledger.filter((record) => record.week !== current.week || record.source === 'legacy-opening')
      return withMoneyTotals({
        ...current,
        screen: 'map',
        resumeScreen: 'map',
        week,
        hasStarted: true,
        selectedProblemId: null,
        selectedJobId: null,
        activeProblemIds: makeProblemSet(week),
        grossEarned: 0,
        sharedPaid: 0,
        spending: [],
        spendingReason: '',
        eventId: unexpectedEvents[(week - 1) % unexpectedEvents.length].id,
        eventResponseId: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
      }, ledger)
    })
  }, [])

  const selectProblem = useCallback((problemId: string) => {
    setState((current) => ({ ...current, selectedProblemId: problemId, selectedJobId: null, screen: 'job', resumeScreen: 'job' }))
  }, [])

  const selectJob = useCallback((jobId: JobId) => {
    setState((current) => ({ ...current, selectedJobId: jobId, screen: 'job', resumeScreen: 'job' }))
  }, [])

  const beginMission = useCallback(() => setScreen('mission'), [setScreen])

  const completeMission = useCallback(() => {
    setState((current) => {
      const job = jobs.find((item) => item.id === current.selectedJobId)
      if (!job) return current
      const source = `week-${current.week}-work`
      const downstreamSources = new Set([`week-${current.week}-spend`, `week-${current.week}-event`])
      const baseLedger = current.ledger.filter((record) => !downstreamSources.has(record.source))
      const ledger = replaceMoneySource(baseLedger, source, [
        {
          id: `${source}-income`, source, week: current.week, kind: 'income',
          label: `${job.shortName}の おきゅうりょう`, amount: job.reward,
          walletDelta: job.reward, savingsDelta: 0, sharedDelta: 0,
        },
        {
          id: `${source}-tax`, source, week: current.week, kind: 'tax',
          label: '街で いっしょに つかう お金', amount: -job.shared,
          walletDelta: -job.shared, savingsDelta: 0, sharedDelta: job.shared,
        },
      ])
      return withMoneyTotals({
        ...current,
        screen: 'payslip',
        resumeScreen: 'payslip',
        completedMissions: current.completedMissions.includes(job.id)
          ? current.completedMissions
          : [...current.completedMissions, job.id],
        earnedJobCards: current.earnedJobCards.includes(job.id)
          ? current.earnedJobCards
          : [...current.earnedJobCards, job.id],
        grossEarned: job.reward,
        sharedPaid: job.shared,
        spending: [],
        spendingReason: '',
        eventResponseId: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
      }, ledger)
    })
  }, [])

  const saveSpending = useCallback((spending: SpendingRecord[], reason: string) => {
    setState((current) => {
      const source = `week-${current.week}-spend`
      const ledgerRecords: MoneyRecord[] = spending.flatMap((record, index) => {
        const choice = expenseChoices.find((item) => item.id === record.choiceId)
        if (!choice) return []
        return [{
          id: `${source}-${record.choiceId}-${index}`,
          source,
          week: current.week,
          kind: record.choiceId === 'savings' ? 'save' : 'spend',
          label: choice.name,
          amount: record.choiceId === 'savings' ? record.amount : -record.amount,
          walletDelta: -record.amount,
          savingsDelta: record.choiceId === 'savings' ? record.amount : 0,
          sharedDelta: 0,
        }]
      })
      const ledgerWithoutEvent = current.ledger.filter((record) => record.source !== `week-${current.week}-event`)
      const ledger = replaceMoneySource(ledgerWithoutEvent, source, ledgerRecords)
      const totals = totalsFromLedger(ledger)
      if (totals.wallet < 0) return current
      return withMoneyTotals({
        ...current,
        spending,
        spendingReason: reason,
        eventResponseId: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
        screen: 'event',
        resumeScreen: 'event',
      }, ledger)
    })
  }, [])

  const chooseEventResponse = useCallback((responseId: string) => {
    setState((current) => {
      const event = unexpectedEvents.find((item) => item.id === current.eventId)
      const response = event?.availableResponses.find((item) => item.id === responseId)
      if (!response) return current
      const walletDelta = response.walletChange ?? 0
      const savingsDelta = response.savingsChange ?? 0
      if (current.wallet + walletDelta < 0 || current.savings + savingsDelta < 0) return current
      const source = `week-${current.week}-event`
      const eventRecords: MoneyRecord[] = walletDelta === 0 && savingsDelta === 0 ? [] : [{
        id: `${source}-${response.id}`, source, week: current.week, kind: 'event',
        label: response.label, amount: walletDelta || savingsDelta,
        walletDelta, savingsDelta, sharedDelta: 0,
      }]
      const ledger = replaceMoneySource(current.ledger, source, eventRecords)
      return withMoneyTotals({
        ...current,
        eventResponseId: responseId,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
      }, ledger)
    })
  }, [])

  const saveBudget = useCallback((budget: Record<string, number>) => {
    setState((current) => ({
      ...current,
      budget,
      reflections: {},
      weekComplete: false,
      screen: 'flow',
      resumeScreen: 'flow',
    }))
  }, [])

  const saveReflections = useCallback((reflections: Record<string, string>) => {
    setState((current) => ({ ...current, reflections, weekComplete: true, screen: 'reflection', resumeScreen: 'reflection' }))
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
