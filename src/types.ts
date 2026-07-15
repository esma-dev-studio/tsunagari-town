export type Screen =
  | 'opening'
  | 'home'
  | 'town'
  | 'workplace'
  | 'map'
  | 'problem'
  | 'job'
  | 'mission'
  | 'payslip'
  | 'spend'
  | 'event'
  | 'budget'
  | 'flow'
  | 'day-end'
  | 'week-report'
  | 'reflection'
  | 'encyclopedia'
  | 'parent'

export type JobId = 'bakery' | 'bus' | 'nurse' | 'waste' | 'farmer' | 'library'

export interface Job {
  id: JobId
  name: string
  shortName: string
  description: string
  helpsWhom: string
  relatedJobs: string[]
  tools: string[]
  mission: string
  reward: number
  shared: number
  townEffect: string
  comment: string
  question: string
  color: string
  facilityId: string
}

export interface TownProblem {
  id: string
  title: string
  description: string
  relatedJobs: JobId[]
  affectedFacilities: string[]
  difficulty: 1 | 2 | 3
}

export interface ExpenseChoice {
  id: string
  name: string
  category: 'need' | 'want' | 'save' | 'help' | 'shop'
  cost: number
  effect: string
  childDescription: string
}

export interface EventResponse {
  id: string
  label: string
  consequence: string
  walletChange?: number
  savingsChange?: number
  energyChange?: number
  timeMinutesChange?: number
  trustChange?: number
  usesSupport?: boolean
}

export interface EventResourceSnapshot {
  wallet: number
  savings: number
  energy: number
  clockMinutes: number
  townTrust: number
}

export interface EventOutcome {
  responseId: string
  before: EventResourceSnapshot
  after: EventResourceSnapshot
}

export interface UnexpectedEvent {
  id: string
  title: string
  description: string
  availableResponses: EventResponse[]
}

export interface PublicService {
  id: string
  name: string
  description: string
  townEffects: string[]
}

export interface MoneyFlow {
  id: string
  from: string
  to: string
  amount: number
  purpose: string
  createdValue: string
}

export interface SpendingRecord {
  choiceId: string
  amount: number
}

export type MoneyRecordKind = 'carryover' | 'income' | 'tax' | 'spend' | 'save' | 'event'

export interface MoneyRecord {
  id: string
  source: string
  week: number
  kind: MoneyRecordKind
  label: string
  amount: number
  walletDelta: number
  savingsDelta: number
  sharedDelta: number
}

export type TownNeed = 'food' | 'transport' | 'cleanliness'

export type TaxAllocation = Record<TownNeed, number>

export type MoneyDecision = 'buy' | 'save' | 'keep' | 'mixed'

export interface ShiftResult {
  jobId: JobId
  basePay: number
  bonus: number
  demandBonus: number
  grossPay: number
  tax: number
  quality: 1 | 2 | 3
  mistakes: number
  timeMinutes: number
  energyUsed: number
}

export interface JobStat {
  shifts: number
  xp: number
  level: number
  bestQuality: number
}

export interface SimulationDayRecord {
  day: number
  jobId: JobId
  grossEarned: number
  taxPaid: number
  spent: number
  saved: number
  endingWallet: number
  endingSavings: number
  quality: number
  trustGained: number
  townNeed: TownNeed
  moneyDecision?: MoneyDecision
}

export interface SimulationState {
  schemaVersion: number
  day: number
  totalDays: number
  phase: 'morning' | 'after-work' | 'evening' | 'day-complete' | 'week-complete'
  clockMinutes: number
  energy: number
  maxEnergy: number
  townTrust: number
  town: Record<TownNeed, number>
  todayNeed: TownNeed
  jobStats: Record<JobId, JobStat>
  workedToday: boolean
  shoppedToday: boolean
  moneyDecision: MoneyDecision | null
  dayStartWallet: number
  dayStartSavings: number
  lastShift: ShiftResult | null
  history: SimulationDayRecord[]
}

export interface GameState {
  screen: Screen
  resumeScreen: Screen | null
  experienceVersion: number
  week: number
  hasStarted: boolean
  selectedProblemId: string | null
  selectedJobId: JobId | null
  activeProblemIds: string[]
  completedMissions: JobId[]
  simulation: SimulationState
  earnedJobCards: JobId[]
  grossEarned: number
  sharedPaid: number
  totalSharedPaid: number
  wallet: number
  savings: number
  ledger: MoneyRecord[]
  spending: SpendingRecord[]
  spendingReason: string
  eventId: string | null
  eventResponseId: string | null
  eventOutcome: EventOutcome | null
  budget: Record<string, number>
  reflections: Record<string, string>
  weekComplete: boolean
}
