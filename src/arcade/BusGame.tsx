import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ArcadeGameProps, ArcadePerformance } from './types'

type GamePhase = 'playing' | 'feedback' | 'finished'
type FeedbackKind = 'great' | 'close' | 'bump'
type FlashKind = 'info' | 'success' | 'warning' | 'danger'
type PassengerMood = 'calm' | 'happy' | 'worried'
type LaneIndex = 0 | 1 | 2

interface RoadObstacle { id: string; at: number; lane: LaneIndex }
interface StopDefinition {
  name: string; passenger: string; avatar: string; destination: string
  mission: string; difficulty: string; length: number; startLane: LaneIndex
  targetLane: LaneIndex; safeSpeed: number; maxSpeed: number
  missionTarget: number; obstacles: RoadObstacle[]
}
interface StopFeedback {
  kind: FeedbackKind; title: string; detail: string; rating: 1 | 2 | 3
  speedOkay: boolean; laneOkay: boolean; positionOkay: boolean; missionSuccess: boolean
}
interface BusModel {
  phase: GamePhase; stopIndex: number; busLane: LaneIndex; speed: number
  remaining: number; braking: boolean; score: number; mistakes: number
  safety: number; combo: number; maxCombo: number; safeStops: number
  elapsed: number; feedback: StopFeedback | null
  hitObstacleIds: string[]; passedObstacleIds: string[]; stopRatings: Array<1 | 2 | 3>
  stopHitCount: number; stopNearMisses: number; stopCleanPasses: number
  lastLaneChangeRemaining: number | null; passengerMood: PassengerMood
  reactionSeconds: number; stalledSeconds: number
  flashMessage: string; flashKind: FlashKind; flashSeconds: number
}

const LANES = [29, 50, 71] as const
const LANE_NAMES = ['ひだり', 'まんなか', 'みぎ'] as const
const STOPS: StopDefinition[] = [
  {
    name: 'にじいろ公園まえ', passenger: 'りくくん', avatar: '⚽',
    destination: 'サッカーの れんしゅう', mission: 'コーンを よけて、あおい のりばへ！',
    difficulty: 'はじめてコース', length: 155, startLane: 1, targetLane: 2,
    safeSpeed: 10, maxSpeed: 39, missionTarget: 1,
    obstacles: [{ id: 'park-center', at: 105, lane: 1 }, { id: 'park-left', at: 55, lane: 0 }],
  },
  {
    name: 'まちの病院まえ', passenger: 'みおさん', avatar: '🎂',
    destination: 'おみまい', mission: 'ケーキを まもろう。ぶつからず 2れんぞく！',
    difficulty: 'くねくねコース', length: 180, startLane: 2, targetLane: 0,
    safeSpeed: 9, maxSpeed: 42, missionTarget: 2,
    obstacles: [
      { id: 'hospital-right', at: 137, lane: 2 },
      { id: 'hospital-center', at: 91, lane: 1 },
      { id: 'hospital-left', at: 46, lane: 0 },
    ],
  },
  {
    name: 'えがお駅', passenger: '町のみんな', avatar: '🚉',
    destination: 'えがお駅', mission: '3れんぞく セーフで、電車に まにあおう！',
    difficulty: 'チャレンジコース', length: 205, startLane: 0, targetLane: 1,
    safeSpeed: 8, maxSpeed: 44, missionTarget: 3,
    obstacles: [
      { id: 'station-left-one', at: 166, lane: 0 },
      { id: 'station-right', at: 124, lane: 2 },
      { id: 'station-center', at: 79, lane: 1 },
      { id: 'station-left-two', at: 38, lane: 0 },
    ],
  },
]

const TICK_SECONDS = 0.05
const ROAD_LOOKAHEAD_METERS = 210
const LATE_CHANGE_METERS = 12
function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, value)) }
function laneFromNumber(value: number): LaneIndex { return clamp(Math.round(value), 0, 2) as LaneIndex }
function createInitialModel(): BusModel {
  const first = STOPS[0]
  return {
    phase: 'playing', stopIndex: 0, busLane: first.startLane, speed: 28, remaining: first.length,
    braking: false, score: 0, mistakes: 0, safety: 100, combo: 0, maxCombo: 0,
    safeStops: 0, elapsed: 0, feedback: null,
    hitObstacleIds: [], passedObstacleIds: [], stopRatings: [], stopHitCount: 0,
    stopNearMisses: 0, stopCleanPasses: 0, lastLaneChangeRemaining: null,
    passengerMood: 'calm', reactionSeconds: 0, stalledSeconds: 0,
    flashMessage: `${first.passenger}を のせて、しゅっぱつ！`, flashKind: 'info', flashSeconds: 2.2,
  }
}

export function BusGame({ skillLevel, onComplete }: ArcadeGameProps) {
  const initialModelRef = useRef<BusModel | null>(null)
  if (initialModelRef.current === null) initialModelRef.current = createInitialModel()
  const modelRef = useRef<BusModel>(initialModelRef.current)
  const [view, setView] = useState<BusModel>(initialModelRef.current)
  const roadRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<number | null>(null)
  const completionSentRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  const speedAssist = Math.min(2, Math.max(0, skillLevel - 1))

  const syncView = useCallback(() => {
    const model = modelRef.current
    setView({ ...model, hitObstacleIds: [...model.hitObstacleIds], passedObstacleIds: [...model.passedObstacleIds], stopRatings: [...model.stopRatings] })
  }, [])
  const showFlash = useCallback((message: string, kind: FlashKind, seconds = 1.7) => {
    Object.assign(modelRef.current, { flashMessage: message, flashKind: kind, flashSeconds: seconds })
  }, [])
  const finishGame = useCallback(() => {
    const model = modelRef.current
    if (completionSentRef.current) return
    completionSentRef.current = true
    model.phase = 'finished'
    const finalScore = clamp(Math.round(model.score), 0, 900)
    const allStopsPerfect = model.stopRatings.length === STOPS.length && model.stopRatings.every((rating) => rating === 3)
    const stars: 1 | 2 | 3 = allStopsPerfect
      ? 3 : model.safeStops >= 2 || (model.safety >= 64 && finalScore >= 430) ? 2 : 1
    const performance: ArcadePerformance = {
      score: finalScore, mistakes: model.mistakes, stars,
      title: stars === 3 ? 'まちの安全運転スター！' : stars === 2 ? 'みんなを ぶじに とどけた！' : 'さいごまで はしりきった！',
      detail: stars === 3
        ? `安全ど ${model.safety}！ 早めのレーン変更と、やさしい停車ができました。`
        : stars === 2 ? `安全ど ${model.safety}。つぎはコーンの少し手前でレーンをかえよう！`
          : 'ぶつかっても運転をやめず、3つの停留所へみんなを送りました。',
      seconds: Math.max(1, Math.round(model.elapsed)),
    }
    syncView()
    onCompleteRef.current(performance)
  }, [syncView])
  const prepareStop = useCallback((index: number) => {
    const model = modelRef.current
    const stop = STOPS[index]
    Object.assign(model, {
      stopIndex: index, phase: 'playing', busLane: stop.startLane, remaining: stop.length,
      speed: 28 + index * 2, braking: false, feedback: null,
      stopHitCount: 0, stopNearMisses: 0, stopCleanPasses: 0,
      lastLaneChangeRemaining: null, passengerMood: 'calm', reactionSeconds: 0, stalledSeconds: 0,
    })
    showFlash(`${stop.passenger}を のせて、しゅっぱつ！`, 'info', 2.2)
  }, [showFlash])

  const advanceFromFeedback = useCallback(() => {
    const model = modelRef.current
    if (model.phase !== 'feedback') return
    if (model.stopIndex >= STOPS.length - 1) finishGame()
    else {
      prepareStop(model.stopIndex + 1)
      syncView()
      window.requestAnimationFrame(() => roadRef.current?.focus())
    }
  }, [finishGame, prepareStop, syncView])

  useEffect(() => {
    if (view.phase !== 'feedback') return
    const frameId = window.requestAnimationFrame(() => roadRef.current?.querySelector<HTMLButtonElement>('.bus-next-button')?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [view.phase, view.stopIndex])

  const finishStop = useCallback(() => {
    const model = modelRef.current
    if (model.phase !== 'playing') return
    const stop = STOPS[model.stopIndex]
    const safeSpeed = stop.safeSpeed + speedAssist
    const speedOkay = model.speed <= safeSpeed
    const laneOkay = model.busLane === stop.targetLane
    const positionOkay = model.speed <= 0.6 && model.remaining >= -2 && model.remaining <= 7
    const missionSuccess = model.stopHitCount === 0 && model.stopCleanPasses >= stop.missionTarget
    const checks = [speedOkay, laneOkay, positionOkay, missionSuccess].filter(Boolean).length
    const rating: 1 | 2 | 3 = checks === 4 ? 3 : checks >= 2 ? 2 : 1
    const stopMistakes = Number(!speedOkay) + Number(!laneOkay) + Number(!positionOkay)
    model.mistakes += stopMistakes
    model.safety = clamp(model.safety - (speedOkay ? 0 : 10) - (laneOkay ? 0 : 7) - (positionOkay ? 0 : 5), 0, 100)
    model.safeStops += speedOkay && laneOkay && positionOkay ? 1 : 0
    model.score = clamp(model.score + (rating === 3 ? 210 : rating === 2 ? 135 : 80), 0, 900)
    model.stopRatings = [...model.stopRatings, rating]
    Object.assign(model, { speed: 0, remaining: Math.max(-2, model.remaining), braking: false, phase: 'feedback', passengerMood: rating === 1 ? 'worried' : 'happy' })
    model.feedback = {
      kind: rating === 3 ? 'great' : rating === 2 ? 'close' : 'bump', rating, speedOkay, laneOkay, positionOkay, missionSuccess,
      title: rating === 3 ? 'ぴったり停車！ すごい！' : rating === 2 ? 'とうちゃく！ つぎはもっと上手に' : 'だいじょうぶ。ちゃんと とどけたよ',
      detail: rating === 3 ? `${stop.passenger}が「ゆれなくて あんしん！」`
        : !speedOkay ? `${stop.passenger}が「つぎは もう少し早くブレーキだね」`
          : !laneOkay ? `光る「${LANE_NAMES[stop.targetLane]}」のりばに合わせると満点！`
            : 'コーンの30mくらい手前で、先にレーンをかえてみよう。',
    }
    if (speedOkay && laneOkay && !positionOkay) model.feedback.detail = '\u30d0\u30b9\u3066\u3044\u3092\u901a\u308a\u3059\u304e\u305f\u3088\u300230m\u624b\u524d\u304b\u3089\u30d6\u30ec\u30fc\u30ad\u3092\u9577\u304a\u3057\u3057\u3088\u3046\u3002'
    syncView()
  }, [speedAssist, syncView])

  const evaluateObstacle = useCallback((obstacle: RoadObstacle) => {
    const model = modelRef.current
    if (model.passedObstacleIds.includes(obstacle.id)) return
    model.passedObstacleIds = [...model.passedObstacleIds, obstacle.id]
    const laneDistance = Math.abs(model.busLane - obstacle.lane)
    const changeDistance = model.lastLaneChangeRemaining === null ? Number.POSITIVE_INFINITY : model.lastLaneChangeRemaining - obstacle.at
    const changedTooLate = changeDistance >= 0 && changeDistance <= LATE_CHANGE_METERS
    if (laneDistance === 0) {
      model.hitObstacleIds = [...model.hitObstacleIds, obstacle.id]
      model.stopHitCount += 1
      model.mistakes += 1
      model.safety = clamp(model.safety - 18, 0, 100)
      model.combo = 0
      model.stopCleanPasses = 0
      model.speed = Math.max(13, model.speed - 11)
      model.passengerMood = 'worried'
      model.reactionSeconds = 1.8
      showFlash('コーンに コツン！ でも つづけられるよ', 'danger', 2)
    } else if (changedTooLate) {
      model.stopNearMisses += 1
      model.mistakes += 1
      model.safety = clamp(model.safety - 6, 0, 100)
      model.combo = 0
      model.stopCleanPasses = 0
      model.score = clamp(model.score + 8, 0, 900)
      model.passengerMood = 'worried'
      model.reactionSeconds = 1.5
      showFlash('ニアミス！ つぎは もう少し早く よけよう', 'warning', 2)
    } else {
      model.stopCleanPasses += 1
      model.combo += 1
      model.maxCombo = Math.max(model.maxCombo, model.combo)
      model.safety = clamp(model.safety + 1, 0, 100)
      model.score = clamp(model.score + 24 + Math.min(24, model.combo * 4), 0, 900)
      model.passengerMood = 'happy'
      model.reactionSeconds = 1.35
      showFlash(model.combo >= 2 ? `ナイス回避！ ${model.combo}れんぞく！` : 'ナイス回避！ +ポイント', 'success', 1.55)
    }
    model.lastLaneChangeRemaining = null
  }, [showFlash])

  const tick = useCallback(() => {
    const model = modelRef.current
    if (model.phase === 'playing') {
      model.elapsed += TICK_SECONDS
      model.flashSeconds = Math.max(0, model.flashSeconds - TICK_SECONDS)
      model.reactionSeconds = Math.max(0, model.reactionSeconds - TICK_SECONDS)
      if (model.flashSeconds === 0) model.flashMessage = ''
      if (model.reactionSeconds === 0) model.passengerMood = 'calm'
      const stop = STOPS[model.stopIndex]
      const previousRemaining = model.remaining
      model.speed = clamp(model.speed + (model.braking ? -12.5 : 5.8) * TICK_SECONDS, 0, stop.maxSpeed)
      if (model.speed <= 0.6 && model.remaining > 7) {
        model.stalledSeconds += TICK_SECONDS
        if (model.stalledSeconds >= 1.6) {
          model.braking = false
          model.speed = 8
          model.stalledSeconds = 0
          showFlash('サポート発進！ ブレーキは バスていの近くで', 'warning', 2)
        }
      } else model.stalledSeconds = 0
      model.remaining -= (model.speed / 3.6) * TICK_SECONDS
      for (const obstacle of stop.obstacles) {
        if (previousRemaining > obstacle.at && model.remaining <= obstacle.at) evaluateObstacle(obstacle)
      }
      const stoppedInZone = model.remaining <= 7 && model.remaining >= 0 && model.speed <= 0.6
      if (model.remaining <= 0 || stoppedInZone) finishStop()
      else syncView()
      return
    }
  }, [evaluateObstacle, finishStop, syncView])
  useEffect(() => {
    const intervalId = window.setInterval(tick, TICK_SECONDS * 1000)
    return () => window.clearInterval(intervalId)
  }, [tick])

  const setLane = useCallback((nextLane: LaneIndex) => {
    const model = modelRef.current
    if (model.phase !== 'playing' || model.busLane === nextLane) return
    model.busLane = nextLane
    model.lastLaneChangeRemaining = model.remaining
    syncView()
  }, [syncView])
  const moveLane = useCallback((amount: -1 | 1) => setLane(laneFromNumber(modelRef.current.busLane + amount)), [setLane])
  const setBraking = useCallback((braking: boolean) => {
    const model = modelRef.current
    if (model.phase === 'playing' && model.braking !== braking) {
      model.braking = braking
      syncView()
    }
  }, [syncView])
  useEffect(() => {
    const release = () => {
      draggingRef.current = null
      setBraking(false)
    }
    const hide = () => { if (document.hidden) release() }
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [setBraking])

  const laneFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = roadRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0) return
    const position = ((event.clientX - bounds.left) / bounds.width) * 100
    const nearest = LANES.reduce((best, laneX, index) => Math.abs(laneX - position) < Math.abs(LANES[best] - position) ? index as LaneIndex : best, 0 as LaneIndex)
    setLane(nearest)
  }
  const handleRoadPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (modelRef.current.phase !== 'playing') return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    draggingRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    laneFromPointer(event)
  }
  const finishRoadDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== event.pointerId) return
    draggingRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const handleRoadPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== event.pointerId) return
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      finishRoadDrag(event)
      return
    }
    laneFromPointer(event)
  }
  const handleRoadKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (modelRef.current.phase !== 'playing') return
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveLane(-1) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); moveLane(1) }
    else if (event.code === 'Space') { event.preventDefault(); setBraking(true) }
  }
  const handleRoadKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code === 'Space') { event.preventDefault(); setBraking(false) }
  }

  const currentStop = STOPS[view.stopIndex]
  const safeSpeed = currentStop.safeSpeed + speedAssist
  const distance = Math.max(0, Math.ceil(view.remaining))
  const speed = Math.round(view.speed)
  const isTargetLane = view.busLane === currentStop.targetLane
  const stoppedTooSoon = view.phase === 'playing' && speed <= 1 && distance > 7
  const upcomingObstacle = view.phase === 'playing' ? currentStop.obstacles
    .filter((obstacle) => !view.passedObstacleIds.includes(obstacle.id))
    .map((obstacle) => ({ ...obstacle, metersAhead: view.remaining - obstacle.at }))
    .filter((obstacle) => obstacle.metersAhead > 0)
    .sort((a, b) => a.metersAhead - b.metersAhead)[0] : undefined
  const obstacleIsInLane = upcomingObstacle?.lane === view.busLane
  const shouldBrake = view.phase === 'playing' && distance <= 38
  const guidance = view.phase !== 'playing' ? '停留所に とうちゃく！ おきゃくさまの声を見よう。'
    : stoppedTooSoon ? 'まだ手前だよ。ブレーキを はなすと進むよ。'
      : upcomingObstacle && upcomingObstacle.metersAhead <= 20 && obstacleIsInLane ? `すぐ前にコーン！ ${LANE_NAMES[upcomingObstacle.lane]}から よけて！`
        : upcomingObstacle && upcomingObstacle.metersAhead <= 55 && obstacleIsInLane ? '前のレーンにコーン。いま レーンをかえよう！'
          : distance <= 38 ? `${LANE_NAMES[currentStop.targetLane]}の青いのりばへ。ブレーキを長おし！`
            : distance <= 70 && !isTargetLane ? `のりばは ${LANE_NAMES[currentStop.targetLane]}。そろそろ合わせよう。`
              : view.combo >= 2 ? `${view.combo}れんぞく中！ 早めに見て、早めによけよう。` : currentStop.mission
  const guidanceIsAlert = Boolean(stoppedTooSoon || shouldBrake || (upcomingObstacle && upcomingObstacle.metersAhead <= 55 && obstacleIsInLane))
  const roadPositionStyle = (lane: LaneIndex, metersAhead: number): CSSProperties => {
    const depth = clamp(1 - metersAhead / ROAD_LOOKAHEAD_METERS, 0, 1)
    return {
      left: `${50 + (LANES[lane] - 50) * (0.42 + depth * 0.58)}%`,
      bottom: `${clamp(10 + (metersAhead / ROAD_LOOKAHEAD_METERS) * 68, 10, 78)}%`,
      opacity: metersAhead >= -13 && metersAhead <= ROAD_LOOKAHEAD_METERS ? 1 : 0,
      '--bus-scale': clamp(1.04 - metersAhead / 300, 0.38, 1.04),
    } as CSSProperties
  }
  const speedFill = `${clamp((speed / currentStop.maxSpeed) * 100, 0, 100)}%`
  const routeFill = `${clamp((1 - view.remaining / currentStop.length) * 100, 0, 100)}%`

  return (
    <section className={`arcade-game bus-game arcade-phase-${view.phase}`} aria-label="まちバス安全運転ゲーム">
      <header className="arcade-game-header bus-game-header">
        <div><p className="arcade-eyebrow">バス運転士のおしごと</p><h2>見て、よけて、やさしく止まろう！</h2></div>
        <div className="arcade-score" aria-label={`スコア ${Math.round(view.score)}点`}><span>スコア</span><strong>{Math.round(view.score)}</strong></div>
      </header>

      <ol className="bus-stop-progress" aria-label="3つの停留所の進みぐあい">
        {STOPS.map((stop, index) => {
          const rating = view.stopRatings[index]
          const current = index === view.stopIndex && view.phase !== 'finished' && !rating
          return (
            <li key={stop.name} className={`${rating ? 'is-complete' : ''}${current ? ' is-current' : ''}`} aria-current={current ? 'step' : undefined}>
              <span aria-hidden="true">{rating ? `${rating}★` : index + 1}</span><strong>{stop.name}</strong>
            </li>
          )
        })}
      </ol>

      <div className="bus-passenger-mission">
        <div className={`bus-passenger-avatar mood-${view.passengerMood}`} aria-hidden="true"><span>{currentStop.avatar}</span><i /><i /></div>
        <div><small>おきゃくさま ミッション</small><strong>{currentStop.passenger} → {currentStop.destination}</strong><p>{currentStop.mission}</p></div>
        <span className="bus-difficulty">{view.stopIndex + 1}/3<br /><b>{currentStop.difficulty}</b></span>
      </div>

      <div className="bus-guidance-status" role="status" aria-live="polite" aria-atomic="true">{guidance}</div>
      <div className="bus-dashboard" aria-label="運転のようす">
        <div className={`bus-meter bus-speed-meter${speed <= safeSpeed ? ' is-safe' : ''}`} aria-label={`スピード ${speed}キロ。停車は${safeSpeed}キロ以下`}>
          <span>スピード</span><strong>{speed}<small>km/h</small></strong>
          <div className="bus-meter-track" aria-hidden="true"><i style={{ width: speedFill }} /></div><em>停車は {safeSpeed}いか</em>
        </div>
        <div className="bus-meter bus-distance-meter" aria-label={`停留所まで あと${distance}メートル`}>
          <span>バスていまで</span><strong>{distance}<small>m</small></strong>
          <div className="bus-meter-track" aria-hidden="true"><i style={{ width: routeFill }} /></div><em>{shouldBrake ? 'いま ブレーキ！' : 'すすんでいます'}</em>
        </div>
        <div className={`bus-safety-meter${view.safety < 65 ? ' is-low' : ''}`} aria-label={`安全ど ${view.safety}`}>
          <span aria-hidden="true">🛡️</span><div><small>安全ど</small><strong>{view.safety}</strong></div>
          <div className="bus-safety-track" aria-hidden="true"><i style={{ width: `${view.safety}%` }} /></div>
        </div>
        <div className={`bus-combo-meter${view.combo >= 2 ? ' is-hot' : ''}`} aria-label={`${view.combo}れんぞく安全回避`}>
          <small>れんぞく回避</small><strong>{view.combo}<span>コンボ</span></strong>
        </div>
        <div className={`bus-safety-callout${guidanceIsAlert ? ' is-alert' : ''}`}><span aria-hidden="true">{guidanceIsAlert ? '🚦' : '🚌'}</span><strong>{guidance}</strong></div>
      </div>

      <div ref={roadRef} className={`bus-road mood-${view.passengerMood}${view.braking ? ' is-braking' : ''}`}
        role="application" tabIndex={0}
        aria-label={`3レーンの道路。いま${LANE_NAMES[view.busLane]}レーン。左右の矢印キーでレーン変更、スペースキー長押しでブレーキ。`}
        onKeyDown={handleRoadKeyDown} onKeyUp={handleRoadKeyUp}
        onPointerDown={handleRoadPointerDown} onPointerMove={handleRoadPointerMove}
        onPointerUp={finishRoadDrag} onPointerCancel={finishRoadDrag} onLostPointerCapture={finishRoadDrag}>
        <div className="bus-skyline" aria-hidden="true">
          <i className="bus-cloud cloud-one" /><i className="bus-cloud cloud-two" />
          <span className="building-one" /><span className="building-two" /><span className="building-three" />
          <b className="bus-horizon-tree tree-one" /><b className="bus-horizon-tree tree-two" /><b className="bus-horizon-tree tree-three" />
        </div>
        <div className="bus-road-plane" aria-hidden="true" /><div className="bus-road-edge edge-left" aria-hidden="true" /><div className="bus-road-edge edge-right" aria-hidden="true" />
        <div className="bus-lane-lines" aria-hidden="true"><span /><span /></div>
        <div className="bus-lane-labels" aria-hidden="true">{LANE_NAMES.map((name, index) => <span key={name} className={view.busLane === index ? 'is-current' : ''}>{name}</span>)}</div>

        <div className={`bus-stop-lane${isTargetLane ? ' is-aligned' : ''}`} style={roadPositionStyle(currentStop.targetLane, view.remaining)} aria-hidden="true">
          <span className="bus-stop-sign"><b>BUS</b><i /></span><span className="bus-stop-lane-label">ここに ゆっくり</span>
        </div>
        {currentStop.obstacles.map((obstacle) => {
          const metersAhead = view.remaining - obstacle.at
          const hit = view.hitObstacleIds.includes(obstacle.id)
          const passed = view.passedObstacleIds.includes(obstacle.id)
          return (
            <div key={obstacle.id} className={`bus-cone${hit ? ' is-hit' : ''}${passed && !hit ? ' is-cleared' : ''}`} style={roadPositionStyle(obstacle.lane, metersAhead)} aria-hidden="true">
              <span /><i /><b />
            </div>
          )
        })}

        <div className={`bus-vehicle mood-${view.passengerMood}${view.braking ? ' is-braking' : ''}`} style={{ left: `${LANES[view.busLane]}%` }} aria-hidden="true">
          {view.combo >= 2 && <div className="bus-combo-sparks"><i>✦</i><i>✦</i><i>✦</i></div>}
          {view.reactionSeconds > 0 && <div className="bus-passenger-reaction">{view.passengerMood === 'happy' ? 'いいね！' : 'おっと！'}</div>}
          <div className="bus-route-sign">3 えがお駅</div>
          <div className="bus-vehicle-window"><span>•ᴗ•</span><span>{view.passengerMood === 'worried' ? '•△•' : '•ᴗ•'}</span><span>•ᴗ•</span></div>
          <div className="bus-mirrors"><i /><i /></div>
          <div className="bus-vehicle-body"><b>つながり</b><small>TOWN BUS</small></div>
          <div className="bus-brake-lights"><span /><span /></div><div className="bus-bumper" /><div className="bus-wheels"><span /><span /></div>
        </div>

        {view.flashMessage && <div className={`bus-road-message is-${view.flashKind}`} role="status">{view.flashMessage}</div>}
        {view.phase === 'feedback' && view.feedback && (
          <div className={`arcade-feedback bus-stop-feedback is-${view.feedback.kind}`} role="status">
            <div className="bus-feedback-confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <span className="bus-arrival-label">{currentStop.name} とうちゃく</span>
            <div className="bus-feedback-stars" aria-label={`停車評価 星${view.feedback.rating}こ`}>
              {[1, 2, 3].map((star) => <span key={star} className={star <= view.feedback!.rating ? 'is-earned' : ''} aria-hidden="true">★</span>)}
            </div>
            <h3>{view.feedback.title}</h3>
            <p className="bus-passenger-quote"><span aria-hidden="true">{currentStop.avatar}</span>{view.feedback.detail}</p>
            <ul className="bus-stop-checks" aria-label="今回の運転チェック">
              <li className={view.feedback.speedOkay ? 'is-good' : 'is-try'}><span>{view.feedback.speedOkay ? '✓' : '→'}</span>やさしい速さ</li>
              <li className={view.feedback.laneOkay ? 'is-good' : 'is-try'}><span>{view.feedback.laneOkay ? '✓' : '→'}</span>のりばの場所</li>
              <li className={view.feedback.missionSuccess ? 'is-good' : 'is-try'}><span>{view.feedback.missionSuccess ? '✓' : '→'}</span>乗客ミッション</li>
              <li className={view.feedback.positionOkay ? 'is-good' : 'is-try'}><span>{view.feedback.positionOkay ? '\u2713' : '\u2192'}</span>{'\u3074\u3063\u305f\u308a\u505c\u8eca'}</li>
            </ul>
            <button type="button" className="bus-next-button" onClick={advanceFromFeedback}>{view.stopIndex < STOPS.length - 1 ? 'つぎの バスていへ →' : 'うんてん かんりょう！'}</button>
          </div>
        )}
      </div>

      <div className="bus-controls" aria-label="運転ボタン">
        <button type="button" className="bus-steer-button" disabled={view.phase !== 'playing' || view.busLane === 0} onClick={() => moveLane(-1)} aria-label="左のレーンへ移動">
          <span aria-hidden="true">←</span><strong>ひだりへ</strong><small>レーン変更</small>
        </button>
        <button type="button" className={`bus-brake-button${view.braking ? ' is-pressed' : ''}`} disabled={view.phase !== 'playing'} aria-pressed={view.braking}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
              event.preventDefault()
              setBraking(!modelRef.current.braking)
            }
          }}
          onClick={(event) => { if (event.detail === 0) setBraking(!modelRef.current.braking) }}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setBraking(true) }}
          onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setBraking(false) }}
          onPointerCancel={() => setBraking(false)} onLostPointerCapture={() => setBraking(false)} onBlur={() => setBraking(false)} onContextMenu={(event) => event.preventDefault()}>
          <span className="bus-brake-icon" aria-hidden="true">STOP</span><strong>{view.braking ? 'ブレーキ中！' : '長おし ブレーキ'}</strong><small>スペースキーでもOK</small>
        </button>
        <button type="button" className="bus-steer-button" disabled={view.phase !== 'playing' || view.busLane === 2} onClick={() => moveLane(1)} aria-label="右のレーンへ移動">
          <span aria-hidden="true">→</span><strong>みぎへ</strong><small>レーン変更</small>
        </button>
      </div>
      <p className="bus-help-text"><span aria-hidden="true">💡</span> コーンの <b>少し手前</b>でレーン変更。バスていの <b>30m前</b>からブレーキ！
        {skillLevel > 1 && <small> ごはんパワーで停車できる速さが +{speedAssist}km/h</small>}
      </p>
    </section>
  )
}
