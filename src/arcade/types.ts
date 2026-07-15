export interface ArcadePerformance {
  score: number
  mistakes: number
  stars: 1 | 2 | 3
  title: string
  detail: string
  seconds: number
}

export interface ArcadeGameProps {
  skillLevel: number
  onComplete: (performance: ArcadePerformance) => void
}
