export type Screen =
  | 'opening'
  | 'home'
  | 'map'
  | 'problem'
  | 'job'
  | 'mission'
  | 'payslip'
  | 'spend'
  | 'event'
  | 'budget'
  | 'flow'
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
  usesSupport?: boolean
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

export interface GameState {
  screen: Screen
  resumeScreen: Screen | null
  week: number
  hasStarted: boolean
  selectedProblemId: string | null
  selectedJobId: JobId | null
  activeProblemIds: string[]
  completedMissions: JobId[]
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
  budget: Record<string, number>
  reflections: Record<string, string>
  weekComplete: boolean
}
