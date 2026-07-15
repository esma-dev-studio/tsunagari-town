import { useCallback, useEffect, useState } from 'react'
import { expenseChoices, jobs, problems, unexpectedEvents } from './data'
import { clearAllShiftProgress, clearShiftProgressForWeek } from './shiftProgress'
import { chooseNextNeed, createInitialSimulation, mergeSimulation, simulationJobNeeds } from './simulationData'
import type { EventOutcome, GameState, JobId, MoneyDecision, MoneyRecord, Screen, ShiftResult, SpendingRecord, TaxAllocation, TownNeed } from './types'

const STORAGE_KEY = 'tsunagari-town-progress-v1'
const SPEND_DRAFT_PREFIX = 'tsunagari-town-spend-draft-v1-'
const PLAYABLE_JOB_IDS: JobId[] = ['bakery', 'bus', 'waste']
const isPlayableJob = (jobId: JobId | null | undefined): jobId is JobId => (
  Boolean(jobId && PLAYABLE_JOB_IDS.includes(jobId))
)

const clearSpendDrafts = (week?: number) => {
  const prefix = week === undefined ? SPEND_DRAFT_PREFIX : `${SPEND_DRAFT_PREFIX}${week}-`
  Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => localStorage.removeItem(key))
}

const defaultBudget = {
  learning: 0,
  transport: 0,
  health: 0,
  park: 0,
  waste: 0,
  disaster: 0,
}

const emptyTaxAllocation = (): TaxAllocation => ({ food: 0, transport: 0, cleanliness: 0 })
const isTownNeedValue = (value: unknown): value is TownNeed => value === 'food' || value === 'transport' || value === 'cleanliness'
const clampTaxCoins = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(3, Math.floor(value)))
  : 0
const normalizeTaxAllocation = (value: TaxAllocation | TownNeed | undefined): TaxAllocation | null => {
  if (!value) return null
  if (isTownNeedValue(value)) return { ...emptyTaxAllocation(), [value]: 3 }
  if (typeof value !== 'object') return null
  const partial = value as Partial<TaxAllocation>
  return {
    food: clampTaxCoins(partial.food),
    transport: clampTaxCoins(partial.transport),
    cleanliness: clampTaxCoins(partial.cleanliness),
  }
}
const townBoostForTaxCoins = (coins: number) => coins >= 3 ? 2 : coins >= 1 ? 1 : 0

const resumableScreens: Screen[] = [
  'town', 'workplace', 'map', 'problem', 'job', 'mission', 'payslip',
  'spend', 'event', 'day-end', 'week-report', 'budget', 'flow', 'reflection',
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

const isEventOutcome = (value: unknown): value is EventOutcome => {
  if (!value || typeof value !== 'object') return false
  const outcome = value as Partial<EventOutcome>
  const validSnapshot = (snapshot: unknown) => {
    if (!snapshot || typeof snapshot !== 'object') return false
    const resource = snapshot as Record<string, unknown>
    return ['wallet', 'savings', 'energy', 'clockMinutes', 'townTrust']
      .every((key) => typeof resource[key] === 'number' && Number.isFinite(resource[key]))
  }
  return typeof outcome.responseId === 'string' && validSnapshot(outcome.before) && validSnapshot(outcome.after)
}

const safeEventDelta = (value: number | undefined) => Number.isFinite(value) ? Math.trunc(value ?? 0) : 0
const clampEventResource = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

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
  const playableProblems = problems.filter((problem) => problem.relatedJobs.some(isPlayableJob))
  if (!playableProblems.length) return []
  const offset = ((week - 1) * 3) % playableProblems.length
  return Array.from({ length: Math.min(3, playableProblems.length) }, (_, index) => playableProblems[(offset + index) % playableProblems.length].id)
}

export const initialState: GameState = {
  screen: 'opening',
  resumeScreen: null,
  experienceVersion: 3,
  week: 1,
  hasStarted: false,
  selectedProblemId: null,
  selectedJobId: null,
  activeProblemIds: makeProblemSet(1),
  completedMissions: [],
  earnedJobCards: [],
  grossEarned: 0,
  sharedPaid: 0,
  simulation: createInitialSimulation(),
  totalSharedPaid: 0,
  wallet: 0,
  savings: 0,
  ledger: [],
  spending: [],
  spendingReason: '',
  eventId: null,
  eventResponseId: null,
  eventOutcome: null,
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
    const originalLedger = isLegacy ? makeLegacyLedger(stored) : storedLedger
    const legacyRestart = isLegacy && stored.weekComplete !== true
    const simulationRestart = (stored.experienceVersion ?? 1) < 3 && stored.weekComplete !== true
    const restartJourney = legacyRestart || simulationRestart
    const storedWeek = Math.max(1, stored.week ?? 1)
    const ledger = simulationRestart
      ? originalLedger.filter((record) => record.week !== storedWeek || record.source === 'legacy-opening')
      : originalLedger
    const eventOutcome = restartJourney || !isEventOutcome(stored.eventOutcome) ? null : stored.eventOutcome
    const restored: GameState = {
      ...initialState,
      ...stored,
      screen: 'opening',
      experienceVersion: 3,
      activeProblemIds: makeProblemSet(storedWeek),
      selectedProblemId: restartJourney ? null : (stored.selectedProblemId ?? null),
      selectedJobId: restartJourney || !isPlayableJob(stored.selectedJobId) ? null : stored.selectedJobId,
      grossEarned: restartJourney ? 0 : (stored.grossEarned ?? 0),
      sharedPaid: restartJourney ? 0 : (stored.sharedPaid ?? 0),
      spending: restartJourney ? [] : (stored.spending ?? []),
      spendingReason: restartJourney ? '' : (stored.spendingReason ?? ''),
      eventId: restartJourney
        ? unexpectedEvents[(storedWeek - 1) % unexpectedEvents.length].id
        : (stored.eventId ?? null),
      eventResponseId: eventOutcome ? (stored.eventResponseId ?? null) : null,
      eventOutcome,
      budget: restartJourney ? { ...defaultBudget } : { ...defaultBudget, ...(stored.budget ?? {}) },
      reflections: restartJourney ? {} : (stored.reflections ?? {}),
      weekComplete: restartJourney ? false : (stored.weekComplete ?? false),
      resumeScreen: restartJourney ? 'town' : (stored.resumeScreen ?? null),
      simulation: mergeSimulation(restartJourney ? undefined : stored.simulation, totalsFromLedger(ledger).wallet, totalsFromLedger(ledger).savings),
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

  const setScreen = useCallback((screen: Screen, preserveResume = false) => {
    setState((current) => ({
      ...current,
      screen,
      resumeScreen: preserveResume ? current.resumeScreen
        : screen === 'home' && isResumableScreen(current.screen)
        ? current.screen
        : isResumableScreen(screen) ? screen : current.resumeScreen,
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const startWeek = useCallback((continueSaved = false, taxChoice?: TaxAllocation | TownNeed) => {
    const taxAllocation = normalizeTaxAllocation(taxChoice)
    setState((current) => {
      if (taxAllocation && !current.weekComplete) return current
      if (current.weekComplete && current.resumeScreen === 'week-report' && !taxAllocation) {
        return { ...current, screen: 'week-report', resumeScreen: 'week-report' }
      }
      if (continueSaved && current.hasStarted && !current.weekComplete) {
        const screen = isResumableScreen(current.resumeScreen) ? current.resumeScreen : 'town'
        return { ...current, screen, resumeScreen: screen }
      }
      const week = current.weekComplete ? current.week + 1 : current.week
      clearShiftProgressForWeek(current.week)
      clearSpendDrafts(current.week)
      if (week !== current.week) clearShiftProgressForWeek(week)
      if (week !== current.week) clearSpendDrafts(week)
      const ledger = current.weekComplete
        ? current.ledger
        : current.ledger.filter((record) => record.week !== current.week || record.source === 'legacy-opening')
      const carried = totalsFromLedger(ledger)
      const simulation = createInitialSimulation(carried.wallet, carried.savings)
      if (current.weekComplete) {
        simulation.town = {
          food: Math.max(0, current.simulation.town.food - 1),
          transport: Math.max(0, current.simulation.town.transport - 1),
          cleanliness: Math.max(0, current.simulation.town.cleanliness - 1),
        }
        simulation.townTrust = current.simulation.townTrust
        simulation.jobStats = Object.fromEntries(
          Object.entries(current.simulation.jobStats).map(([jobId, stat]) => [jobId, { ...stat }]),
        ) as typeof simulation.jobStats
        const bought = (choiceId: string) => current.spending.some((item) => item.choiceId === choiceId)
        const hasMeal = bought('meal')
        const maxEnergy = hasMeal ? 6 : 5
        const overnightRecovery = hasMeal ? 3 : 2
        simulation.maxEnergy = maxEnergy
        simulation.energy = clampEventResource(current.simulation.energy + overnightRecovery, 1, maxEnergy)
        if (bought('local-shop')) simulation.town.food = Math.min(3, simulation.town.food + 1)
        if (bought('share')) simulation.townTrust += 1
        const previousJobId = current.simulation.lastShift?.jobId
        if (bought('notebook') && previousJobId) {
          const stat = simulation.jobStats[previousJobId]
          const xp = stat.xp + 1
          simulation.jobStats[previousJobId] = {
            ...stat,
            xp,
            level: Math.min(3, 1 + Math.floor(xp / 3)),
          }
        }
      }
      if (current.weekComplete && taxAllocation) {
        for (const need of Object.keys(taxAllocation) as TownNeed[]) {
          const boost = townBoostForTaxCoins(taxAllocation[need])
          simulation.town[need] = Math.min(3, simulation.town[need] + boost)
        }
      }
      simulation.todayNeed = chooseNextNeed(simulation.town, week)
      return withMoneyTotals({
        ...current,
        screen: 'town',
        resumeScreen: 'town',
        week,
        hasStarted: true,
        selectedProblemId: null,
        selectedJobId: null,
        activeProblemIds: makeProblemSet(week),
        grossEarned: 0,
        simulation,
        sharedPaid: 0,
        spending: [],
        spendingReason: '',
        eventId: unexpectedEvents[(week - 1) % unexpectedEvents.length].id,
        eventResponseId: null,
        eventOutcome: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
      }, ledger)
    })
  }, [])

  const selectProblem = useCallback((problemId: string) => {
    setState((current) => {
      if (current.weekComplete) return { ...current, screen: 'week-report', resumeScreen: 'week-report' }
      const problem = problems.find((item) => item.id === problemId)
      const jobId = problem?.relatedJobs.find(isPlayableJob)
      if (!jobId) return { ...current, selectedProblemId: null, selectedJobId: null, screen: 'map', resumeScreen: 'map' }
      return {
        ...current,
        hasStarted: true,
        selectedProblemId: problemId,
        selectedJobId: jobId,
        eventId: current.eventId ?? unexpectedEvents[(current.week - 1) % unexpectedEvents.length].id,
        screen: 'job',
        resumeScreen: 'job',
      }
    })
  }, [])

  const selectJob = useCallback((jobId: JobId) => {
    setState((current) => {
      if (current.weekComplete) return { ...current, screen: 'week-report', resumeScreen: 'week-report' }
      if (!isPlayableJob(jobId)) return { ...current, selectedJobId: null, screen: 'workplace', resumeScreen: 'workplace' }
      if (current.simulation.workedToday) return { ...current, screen: 'town', resumeScreen: 'town' }
      return {
        ...current,
        hasStarted: true,
        selectedJobId: jobId,
        eventId: current.eventId ?? unexpectedEvents[(current.week - 1) % unexpectedEvents.length].id,
        screen: 'job',
        resumeScreen: 'job',
      }
    })
  }, [])

  const beginMission = useCallback((jobId?: JobId) => {
    setState((current) => {
      const selectedJobId = jobId ?? current.selectedJobId
      if (current.weekComplete) return { ...current, screen: 'week-report', resumeScreen: 'week-report' }
      if (!isPlayableJob(selectedJobId)) return { ...current, selectedJobId: null, screen: 'workplace', resumeScreen: 'workplace' }
      if (current.simulation.workedToday) return { ...current, screen: 'town', resumeScreen: 'town' }
      return { ...current, hasStarted: true, selectedJobId, screen: 'mission', resumeScreen: 'mission' }
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const completeMission = useCallback((result?: ShiftResult) => {
    setState((current) => {
      if (current.simulation.workedToday) return current
      const job = jobs.find((item) => item.id === current.selectedJobId)
      if (!job) return current
      const need = simulationJobNeeds[job.id] ?? current.simulation.todayNeed
      const fallbackDemandBonus = need === current.simulation.todayNeed ? 2 : 0
      const shift: ShiftResult = result ?? {
        jobId: job.id, basePay: job.reward, bonus: 0, demandBonus: fallbackDemandBonus,
        grossPay: job.reward + fallbackDemandBonus, tax: job.shared, quality: 2,
        mistakes: 0, timeMinutes: 300, energyUsed: 2,
      }
      const quality = Math.max(1, Math.min(3, shift.quality)) as 1 | 2 | 3
      const source = `week-${current.week}-day-${current.simulation.day}-work`
      const downstreamSources = new Set([
        `week-${current.week}-day-${current.simulation.day}-spend`,
        `week-${current.week}-day-${current.simulation.day}-event`,
      ])
      const baseLedger = current.ledger.filter((record) => !downstreamSources.has(record.source))
      const ledger = replaceMoneySource(baseLedger, source, [
        {
          id: `${source}-income`, source, week: current.week, kind: 'income',
          label: `${job.shortName}の おきゅうりょう`, amount: shift.grossPay,
          walletDelta: shift.grossPay, savingsDelta: 0, sharedDelta: 0,
        },
        {
          id: `${source}-tax`, source, week: current.week, kind: 'tax',
          label: '街で いっしょに つかう お金', amount: -shift.tax,
          walletDelta: -shift.tax, savingsDelta: 0, sharedDelta: shift.tax,
        },
      ])
      const previousStat = current.simulation.jobStats[job.id]
      const xpGain = quality === 3 ? 2 : 1
      const nextXp = previousStat.xp + xpGain
      const trustGained = quality + (need === current.simulation.todayNeed ? 1 : 0)
      const town = { ...current.simulation.town }
      if (need) town[need] = Math.min(3, town[need] + (quality === 3 ? 2 : 1))
      return withMoneyTotals({
        ...current,
        screen: 'payslip',
        resumeScreen: 'payslip',
        simulation: {
          ...current.simulation,
          phase: 'after-work',
          clockMinutes: Math.min(18 * 60, current.simulation.clockMinutes + shift.timeMinutes + 60),
          energy: Math.max(0, current.simulation.energy - shift.energyUsed),
          townTrust: current.simulation.townTrust + trustGained,
          town,
          workedToday: true,
          lastShift: { ...shift, jobId: job.id, quality },
          jobStats: {
            ...current.simulation.jobStats,
            [job.id]: {
              shifts: previousStat.shifts + 1,
              xp: nextXp,
              level: Math.min(3, 1 + Math.floor(nextXp / 3)),
              bestQuality: Math.max(previousStat.bestQuality, quality),
            },
          },
        },
        completedMissions: current.completedMissions.includes(job.id)
          ? current.completedMissions
          : [...current.completedMissions, job.id],
        earnedJobCards: current.earnedJobCards.includes(job.id)
          ? current.earnedJobCards
          : [...current.earnedJobCards, job.id],
        grossEarned: shift.grossPay,
        sharedPaid: shift.tax,
        spending: [],
        spendingReason: '',
        eventResponseId: null,
        eventOutcome: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
      }, ledger)
    })
  }, [])

  const saveSpending = useCallback((spending: SpendingRecord[], reason: string) => {
    setState((current) => {
      if (!current.simulation.workedToday || current.simulation.shoppedToday) return current
      const source = `week-${current.week}-day-${current.simulation.day}-spend`
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
      const ledgerWithoutEvent = current.ledger.filter((record) => record.source !== `week-${current.week}-day-${current.simulation.day}-event`)
      const ledger = replaceMoneySource(ledgerWithoutEvent, source, ledgerRecords)
      const totals = totalsFromLedger(ledger)
      if (totals.wallet < 0) return current
      const boughtSomething = spending.some((record) => record.choiceId !== 'savings' && record.amount > 0)
      const savedSomething = spending.some((record) => record.choiceId === 'savings' && record.amount > 0)
      const moneyDecision: MoneyDecision = boughtSomething && savedSomething
        ? 'mixed'
        : boughtSomething ? 'buy'
        : savedSomething ? 'save'
        : 'keep'
      return withMoneyTotals({
        ...current,
        spending,
        spendingReason: reason,
        eventResponseId: null,
        eventOutcome: null,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
        screen: 'town',
        resumeScreen: 'town',
        simulation: {
          ...current.simulation,
          phase: 'evening',
          shoppedToday: true,
          moneyDecision,
          clockMinutes: Math.min(18 * 60, current.simulation.clockMinutes + 90),
        },
      }, ledger)
    })
  }, [])

  const chooseEventResponse = useCallback((responseId: string) => {
    setState((current) => {
      if (current.eventResponseId) return current
      const event = unexpectedEvents.find((item) => item.id === current.eventId)
      const response = event?.availableResponses.find((item) => item.id === responseId)
      if (!response) return current
      const walletDelta = safeEventDelta(response.walletChange)
      const savingsDelta = safeEventDelta(response.savingsChange)
      const energyDelta = safeEventDelta(response.energyChange)
      const timeDelta = safeEventDelta(response.timeMinutesChange)
      const trustDelta = safeEventDelta(response.trustChange)
      if (current.wallet + walletDelta < 0 || current.savings + savingsDelta < 0) return current
      const source = `week-${current.week}-day-${current.simulation.day}-event`
      const eventRecords: MoneyRecord[] = walletDelta === 0 && savingsDelta === 0 ? [] : [{
        id: `${source}-${response.id}`, source, week: current.week, kind: 'event',
        label: response.label, amount: walletDelta || savingsDelta,
        walletDelta, savingsDelta, sharedDelta: 0,
      }]
      const ledger = replaceMoneySource(current.ledger, source, eventRecords)
      const totals = totalsFromLedger(ledger)
      const nextEnergy = clampEventResource(
        current.simulation.energy + energyDelta,
        0,
        Math.max(0, current.simulation.maxEnergy),
      )
      const nextClockMinutes = clampEventResource(current.simulation.clockMinutes + timeDelta, 0, 23 * 60 + 59)
      const nextTownTrust = clampEventResource(current.simulation.townTrust + trustDelta, 0, 99)
      const eventOutcome: EventOutcome = {
        responseId,
        before: {
          wallet: current.wallet,
          savings: current.savings,
          energy: current.simulation.energy,
          clockMinutes: current.simulation.clockMinutes,
          townTrust: current.simulation.townTrust,
        },
        after: {
          wallet: totals.wallet,
          savings: totals.savings,
          energy: nextEnergy,
          clockMinutes: nextClockMinutes,
          townTrust: nextTownTrust,
        },
      }
      return withMoneyTotals({
        ...current,
        eventResponseId: responseId,
        eventOutcome,
        budget: { ...defaultBudget },
        reflections: {},
        weekComplete: false,
        simulation: {
          ...current.simulation,
          energy: nextEnergy,
          clockMinutes: nextClockMinutes,
          townTrust: nextTownTrust,
        },
      }, ledger)
    })
  }, [])

  const goHome = useCallback(() => {
    setState((current) => {
      if (!current.simulation.workedToday || !current.simulation.shoppedToday) return current
      const eventId = unexpectedEvents[(current.week + current.simulation.day - 2) % unexpectedEvents.length].id
      const sameEvent = current.eventId === eventId
      return {
        ...current,
        screen: 'event',
        resumeScreen: 'event',
        eventId,
        eventResponseId: sameEvent ? current.eventResponseId : null,
        eventOutcome: sameEvent ? current.eventOutcome : null,
        simulation: {
          ...current.simulation,
          phase: 'evening',
          clockMinutes: sameEvent && current.eventResponseId ? current.simulation.clockMinutes : 18 * 60,
        },
      }
    })
  }, [])

  const completeDay = useCallback(() => {
    setState((current) => {
      if (
        !current.simulation.workedToday
        || !current.simulation.shoppedToday
        || !current.eventResponseId
        || current.simulation.phase !== 'evening'
      ) return current
      const shift = current.simulation.lastShift
      if (!shift) return current
      const dayPrefix = `week-${current.week}-day-${current.simulation.day}`
      const dayMoney = current.ledger.filter((record) => record.source.startsWith(dayPrefix))
      const spent = dayMoney
        .filter((record) => record.kind === 'spend' || record.kind === 'event')
        .reduce((sum, record) => sum + Math.max(0, -record.walletDelta) + Math.max(0, -record.savingsDelta), 0)
      const saved = dayMoney.filter((record) => record.kind === 'save').reduce((sum, record) => sum + record.savingsDelta, 0)
      const moneyDecision: MoneyDecision = current.simulation.moneyDecision
        ?? (spent > 0 && saved > 0 ? 'mixed' : spent > 0 ? 'buy' : saved > 0 ? 'save' : 'keep')
      const townNeed = simulationJobNeeds[shift.jobId] ?? current.simulation.todayNeed
      const trustGained = shift.quality + (townNeed === current.simulation.todayNeed ? 1 : 0)
      const record = {
        day: current.simulation.day,
        jobId: shift.jobId,
        grossEarned: shift.grossPay,
        taxPaid: shift.tax,
        spent,
        saved,
        endingWallet: current.wallet,
        endingSavings: current.savings,
        quality: shift.quality,
        trustGained,
        townNeed,
        moneyDecision,
      }
      const history = [...current.simulation.history.filter((item) => item.day !== record.day), record].sort((a, b) => a.day - b.day)
      const isLast = current.simulation.day >= current.simulation.totalDays
      return {
        ...current,
        screen: 'day-end',
        resumeScreen: 'day-end',
        simulation: { ...current.simulation, history, phase: isLast ? 'week-complete' : 'day-complete' },
      }
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const startNextDay = useCallback(() => {
    setState((current) => {
      if (
        current.simulation.phase !== 'day-complete'
        || current.simulation.day >= current.simulation.totalDays
      ) return current
      const nextDay = current.simulation.day + 1
      const town = {
        food: Math.max(0, current.simulation.town.food - 1),
        transport: Math.max(0, current.simulation.town.transport - 1),
        cleanliness: Math.max(0, current.simulation.town.cleanliness - 1),
      }
      if (current.spending.some((item) => item.choiceId === 'local-shop')) town.food = Math.min(3, town.food + 1)
      const hasMeal = current.spending.some((item) => item.choiceId === 'meal')
      const shared = current.spending.some((item) => item.choiceId === 'share')
      const notebook = current.spending.some((item) => item.choiceId === 'notebook')
      const jobId = current.simulation.lastShift?.jobId
      const jobStats = { ...current.simulation.jobStats }
      if (notebook && jobId) {
        const stat = jobStats[jobId]
        const xp = stat.xp + 1
        jobStats[jobId] = { ...stat, xp, level: Math.min(3, 1 + Math.floor(xp / 3)) }
      }
      const maxEnergy = hasMeal ? 6 : 5
      const overnightRecovery = hasMeal ? 3 : 2
      const energy = clampEventResource(current.simulation.energy + overnightRecovery, 1, maxEnergy)
      return {
        ...current,
        screen: 'town',
        resumeScreen: 'town',
        selectedProblemId: null,
        selectedJobId: null,
        grossEarned: 0,
        sharedPaid: 0,
        spending: [],
        spendingReason: '',
        eventId: unexpectedEvents[(current.week + nextDay - 2) % unexpectedEvents.length].id,
        eventResponseId: null,
        eventOutcome: null,
        simulation: {
          ...current.simulation,
          day: nextDay,
          phase: 'morning',
          clockMinutes: 8 * 60,
          maxEnergy,
          energy,
          townTrust: current.simulation.townTrust + (shared ? 1 : 0),
          town,
          todayNeed: chooseNextNeed(town, nextDay),
          jobStats,
          workedToday: false,
          shoppedToday: false,
          moneyDecision: null,
          dayStartWallet: current.wallet,
          dayStartSavings: current.savings,
          lastShift: null,
        },
      }
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openWeekReport = useCallback(() => {
    setState((current) => ({
      ...current,
      screen: 'week-report',
      resumeScreen: 'week-report',
      weekComplete: true,
      simulation: { ...current.simulation, phase: 'week-complete' },
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    clearAllShiftProgress()
    clearSpendDrafts()
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
    goHome,
    completeDay,
    startNextDay,
    openWeekReport,
    saveBudget,
    saveReflections,
    reset,
  }
}
