import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ArcadeGameProps, ArcadePerformance } from './types'

type GamePhase = 'playing' | 'feedback' | 'finished'
type FeedbackKind = 'great' | 'close' | 'bump'

interface Cone {
  id: string
  at: number
  x: number
}

interface StopDefinition {
  name: string
  passenger: string
  length: number
  laneX: number
  cones: Cone[]
}

interface StopFeedback {
  kind: FeedbackKind
  title: string
  detail: string
}

interface BusModel {
  phase: GamePhase
  stopIndex: number
  busX: number
  speed: number
  remaining: number
  braking: boolean
  score: number
  mistakes: number
  safeStops: number
  elapsed: number
  feedbackSeconds: number
  feedback: StopFeedback | null
  hitConeIds: string[]
  flashMessage: string
  flashSeconds: number
}

const STOPS: StopDefinition[] = [
  {
    name: 'にじいろ公園まえ',
    passenger: 'サッカーへ行く りくくん',
    length: 180,
    laneX: 61,
    cones: [
      { id: 'park-left', at: 128, x: 28 },
      { id: 'park-right', at: 72, x: 73 },
    ],
  },
  {
    name: 'まちの病院まえ',
    passenger: 'おみまいへ行く みおさん',
    length: 200,
    laneX: 42,
    cones: [
      { id: 'hospital-right', at: 152, x: 70 },
      { id: 'hospital-left', at: 88, x: 31 },
    ],
  },
  {
    name: 'えがお駅',
    passenger: '電車にのる 町のみんな',
    length: 220,
    laneX: 54,
    cones: [
      { id: 'station-left', at: 172, x: 30 },
      { id: 'station-middle', at: 112, x: 56 },
      { id: 'station-right', at: 52, x: 76 },
    ],
  },
]

const TICK_SECONDS = 0.05
const ROAD_LOOKAHEAD_METERS = 190
const BUS_BOTTOM_PERCENT = 12

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function createInitialModel(): BusModel {
  return {
    phase: 'playing',
    stopIndex: 0,
    busX: 50,
    speed: 28,
    remaining: STOPS[0].length,
    braking: false,
    score: 0,
    mistakes: 0,
    safeStops: 0,
    elapsed: 0,
    feedbackSeconds: 0,
    feedback: null,
    hitConeIds: [],
    flashMessage: `${STOPS[0].name}へ しゅっぱつ！`,
    flashSeconds: 1.8,
  }
}

export function BusGame({ skillLevel, onComplete }: ArcadeGameProps) {
  const initialModelRef = useRef<BusModel | null>(null)
  if (initialModelRef.current === null) initialModelRef.current = createInitialModel()

  const modelRef = useRef<BusModel>(initialModelRef.current)
  const [view, setView] = useState<BusModel>(initialModelRef.current)
  const roadRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const completionSentRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const safeSpeed = 11 + Math.min(4, Math.max(0, skillLevel - 1))
  const centerTolerance = 12 + Math.min(5, Math.max(0, skillLevel - 1) * 1.5)
  const cruisingSpeed = 43

  const syncView = useCallback(() => {
    setView({ ...modelRef.current })
  }, [])

  const finishGame = useCallback(() => {
    const model = modelRef.current
    if (completionSentRef.current) return

    completionSentRef.current = true
    model.phase = 'finished'
    const finalScore = clamp(Math.round(model.score), 0, 900)
    const stars: 1 | 2 | 3 =
      model.safeStops === 3 && model.mistakes <= 1 && finalScore >= 790
        ? 3
        : model.safeStops >= 2 && finalScore >= 520
          ? 2
          : 1
    const performance: ArcadePerformance = {
      score: finalScore,
      mistakes: model.mistakes,
      stars,
      title:
        stars === 3
          ? 'やさしい運転のスター！'
          : stars === 2
            ? 'みんなをとどけたね！'
            : 'さいごまで運転できた！',
      detail:
        stars === 3
          ? '3つの停留所で、安全なスピードと場所をしっかり守れました。'
          : stars === 2
            ? '安全に止まれた停留所がありました。次は早めのブレーキにちょうせん！'
            : '失敗しても仕事をつづけ、みんなを目的地まで送りました。',
      seconds: Math.max(1, Math.round(model.elapsed)),
    }
    syncView()
    onCompleteRef.current(performance)
  }, [syncView])

  const prepareStop = useCallback((index: number) => {
    const model = modelRef.current
    const stop = STOPS[index]
    model.stopIndex = index
    model.phase = 'playing'
    model.remaining = stop.length
    model.speed = 28
    model.braking = false
    model.feedbackSeconds = 0
    model.feedback = null
    model.flashMessage = `${stop.name}へ しゅっぱつ！`
    model.flashSeconds = 1.8
  }, [])

  const finishStop = useCallback(() => {
    const model = modelRef.current
    if (model.phase !== 'playing') return

    const stop = STOPS[model.stopIndex]
    const speedOkay = model.speed <= safeSpeed
    const centered = Math.abs(model.busX - stop.laneX) <= centerTolerance
    const safe = speedOkay && centered
    const newMistakes = (speedOkay ? 0 : 1) + (centered ? 0 : 1)

    model.mistakes += newMistakes
    model.safeStops += safe ? 1 : 0
    model.score += safe ? 300 : speedOkay || centered ? 185 : 95
    model.speed = 0
    model.remaining = 0
    model.braking = false
    model.phase = 'feedback'
    model.feedbackSeconds = 2.25

    if (safe) {
      model.feedback = {
        kind: 'great',
        title: 'ぴったり！ 安全にとうちゃく',
        detail: `${stop.passenger}が「ありがとう！」`,
      }
    } else if (!speedOkay && !centered) {
      model.feedback = {
        kind: 'bump',
        title: 'だいじょうぶ。つぎでなおそう！',
        detail: `スピードは${safeSpeed}km/hいか、バスは光る場所へ。給料はへらないよ。`,
      }
    } else {
      model.feedback = {
        kind: 'close',
        title: 'おしい！ ちゃんと送りとどけたよ',
        detail: speedOkay
          ? 'スピードはばっちり。つぎは光る場所のまんなかへ！'
          : `場所はばっちり。つぎは早めにブレーキを長押ししよう！`,
      }
    }
  }, [centerTolerance, safeSpeed])

  const tick = useCallback(() => {
    const model = modelRef.current

    if (model.phase === 'playing') {
      model.elapsed += TICK_SECONDS
      model.flashSeconds = Math.max(0, model.flashSeconds - TICK_SECONDS)
      if (model.flashSeconds === 0) model.flashMessage = ''

      const previousRemaining = model.remaining
      const acceleration = model.braking ? -25 : 9
      model.speed = clamp(model.speed + acceleration * TICK_SECONDS, 0, cruisingSpeed)
      model.remaining -= (model.speed / 3.6) * TICK_SECONDS

      const stop = STOPS[model.stopIndex]
      for (const cone of stop.cones) {
        const alreadyHit = model.hitConeIds.includes(cone.id)
        const reachedCone = previousRemaining > cone.at && model.remaining <= cone.at
        if (!alreadyHit && reachedCone && Math.abs(model.busX - cone.x) < 11) {
          model.hitConeIds = [...model.hitConeIds, cone.id]
          model.mistakes += 1
          model.score = Math.max(0, model.score - 35)
          model.speed = Math.max(12, model.speed - 13)
          model.flashMessage = 'コーンにコツン！ ハンドルをゆっくり動かそう'
          model.flashSeconds = 1.8
        }
      }

      if (model.remaining <= 0) finishStop()
      syncView()
      return
    }

    if (model.phase === 'feedback') {
      model.elapsed += TICK_SECONDS
      model.feedbackSeconds = Math.max(0, model.feedbackSeconds - TICK_SECONDS)
      if (model.feedbackSeconds === 0) {
        if (model.stopIndex >= STOPS.length - 1) {
          finishGame()
          return
        }
        prepareStop(model.stopIndex + 1)
      }
      syncView()
    }
  }, [cruisingSpeed, finishGame, finishStop, prepareStop, syncView])

  useEffect(() => {
    const intervalId = window.setInterval(tick, TICK_SECONDS * 1000)
    return () => window.clearInterval(intervalId)
  }, [tick])


  const updateBusX = useCallback(
    (nextX: number) => {
      const model = modelRef.current
      if (model.phase !== 'playing') return
      model.busX = clamp(nextX, 13, 87)
      syncView()
    },
    [syncView],
  )

  const moveBus = useCallback(
    (amount: number) => {
      updateBusX(modelRef.current.busX + amount)
    },
    [updateBusX],
  )

  const setBraking = useCallback(
    (braking: boolean) => {
      const model = modelRef.current
      if (model.phase !== 'playing' || model.braking === braking) return
      model.braking = braking
      syncView()
    },
    [syncView],
  )

  useEffect(() => {
    const releaseBrake = () => setBraking(false)
    const handleVisibilityChange = () => {
      if (document.hidden) releaseBrake()
    }

    window.addEventListener('blur', releaseBrake)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', releaseBrake)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setBraking])

  const positionBusFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = roadRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0) return
    updateBusX(((event.clientX - bounds.left) / bounds.width) * 100)
  }

  const handleRoadPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (modelRef.current.phase !== 'playing') return
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    positionBusFromPointer(event)
  }

  const handleRoadPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    positionBusFromPointer(event)
  }

  const finishRoadDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (modelRef.current.phase !== 'playing') return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveBus(-5)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveBus(5)
    } else if (event.code === 'Space') {
      event.preventDefault()
      setBraking(true)
    }
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code !== 'Space') return
    event.preventDefault()
    setBraking(false)
  }

  const currentStop = STOPS[view.stopIndex]
  const distance = Math.max(0, Math.ceil(view.remaining))
  const speed = Math.round(view.speed)
  const shouldBrake = view.phase === 'playing' && distance <= 75
  const isCentered = Math.abs(view.busX - currentStop.laneX) <= centerTolerance
  const stoppedTooSoon = view.phase === 'playing' && speed <= 2 && distance > 8
  const upcomingCone = view.phase === 'playing'
    ? currentStop.cones
        .filter((cone) => !view.hitConeIds.includes(cone.id))
        .map((cone) => ({ ...cone, metersAhead: view.remaining - cone.at }))
        .filter((cone) => cone.metersAhead > 0 && cone.metersAhead <= 45)
        .sort((a, b) => a.metersAhead - b.metersAhead)[0]
    : undefined
  const laneDirection = currentStop.laneX < view.busX ? 'ひだり' : 'みぎ'
  const coneSide = upcomingCone && upcomingCone.x < 50 ? 'ひだり' : 'みぎ'
  const coneAvoidDirection = upcomingCone && upcomingCone.x <= view.busX ? 'みぎ' : 'ひだり'
  const guidance = view.phase !== 'playing'
    ? '停留所に とうちゃく。つぎの案内を 待とう。'
    : upcomingCone
      ? `もうすぐ ${coneSide}に コーン。${coneAvoidDirection}へ よけよう。`
      : stoppedTooSoon
        ? 'まだ手前だよ。ブレーキを はなそう。'
        : distance <= 30
          ? `停留所まで あと30メートルくらい。${safeSpeed}キロいかまで ゆっくり ブレーキ。`
          : shouldBrake
            ? '停留所まで あと70メートルくらい。いまから ブレーキを 長おし。'
            : isCentered
              ? '光るレーンに 入ったよ。そのまま あんぜん運転。'
              : `光るレーンは ${laneDirection}。${laneDirection}ボタンで 合わせよう。`
  const guidanceIsAlert = view.phase === 'playing' && (Boolean(upcomingCone) || stoppedTooSoon || shouldBrake)

  const roadPositionStyle = (x: number, metersAhead: number): CSSProperties => {
    const bottom = BUS_BOTTOM_PERCENT + (metersAhead / ROAD_LOOKAHEAD_METERS) * 76
    return {
      left: `${x}%`,
      bottom: `${clamp(bottom, BUS_BOTTOM_PERCENT, 92)}%`,
      opacity: metersAhead >= -12 && metersAhead <= ROAD_LOOKAHEAD_METERS ? 1 : 0,
    }
  }

  return (
    <section
      className={`arcade-game bus-game arcade-phase-${view.phase}`}
      aria-label="バスの安全運転ゲーム"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <header className="arcade-game-header bus-game-header">
        <div>
          <p className="arcade-eyebrow">バス運転士のおしごと</p>
          <h2>3つの停留所へ、安全にとどけよう！</h2>
        </div>
        <div className="arcade-score" aria-label={`スコア ${view.score}点`}>
          <span>スコア</span>
          <strong>{view.score}</strong>
        </div>
      </header>

      <ol className="bus-stop-progress" aria-label="停留所の進みぐあい">
        {STOPS.map((stop, index) => {
          const completed = index < view.stopIndex || (view.phase === 'finished' && index === view.stopIndex)
          const current = index === view.stopIndex && !completed
          return (
            <li
              key={stop.name}
              className={`bus-stop-dot${completed ? ' is-complete' : ''}${current ? ' is-current' : ''}`}
              aria-current={current ? 'step' : undefined}
            >
              <span aria-hidden="true">{completed ? '✓' : index + 1}</span>
              <strong>{stop.name}</strong>
            </li>
          )
        })}
      </ol>

      <div className="bus-guidance-status" role="status" aria-live="polite" aria-atomic="true">
        {view.phase === 'playing' ? guidance : ''}
      </div>

      <div className="bus-dashboard" aria-label="運転のメーター">
        <div className="bus-meter bus-speed-meter">
          <span>スピード</span>
          <strong>{speed}</strong>
          <small>km/h</small>
        </div>
        <div className="bus-meter bus-distance-meter">
          <span>あと</span>
          <strong>{distance}</strong>
          <small>m</small>
        </div>
        <div className={`bus-safety-callout${guidanceIsAlert ? ' is-alert' : ''}`}>
          {guidance}
        </div>
      </div>

      <div
        ref={roadRef}
        className={`bus-road${view.braking ? ' is-braking' : ''}`}
        role="application"
        tabIndex={0}
        aria-label="道路。ドラッグまたは左右の矢印キーでバスを動かします。スペースキーでブレーキをかけます。"
        onPointerDown={handleRoadPointerDown}
        onPointerMove={handleRoadPointerMove}
        onPointerUp={finishRoadDrag}
        onPointerCancel={finishRoadDrag}
      >
        <div className="bus-road-scenery bus-scenery-left" aria-hidden="true">
          <span>🌳</span><span>🏠</span><span>🌳</span>
        </div>
        <div className="bus-road-scenery bus-scenery-right" aria-hidden="true">
          <span>🏢</span><span>🌲</span><span>🏪</span>
        </div>
        <div className="bus-lane-lines" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>

        <div
          className={`bus-stop-lane${isCentered ? ' is-aligned' : ''}`}
          style={roadPositionStyle(currentStop.laneX, view.remaining)}
          aria-label={`停車する場所は道路の横位置 ${currentStop.laneX}パーセント`}
        >
          <span className="bus-stop-lane-label">ここに とまる</span>
        </div>

        {currentStop.cones.map((cone) => {
          const metersAhead = view.remaining - cone.at
          const hit = view.hitConeIds.includes(cone.id)
          return (
            <div
              key={cone.id}
              className={`bus-cone${hit ? ' is-hit' : ''}`}
              style={roadPositionStyle(cone.x, metersAhead)}
              aria-hidden="true"
            >
              ▲
            </div>
          )
        })}

        <div
          className={`bus-vehicle${view.braking ? ' is-braking' : ''}`}
          style={{ left: `${view.busX}%` }}
          aria-hidden="true"
        >
          <div className="bus-vehicle-window"><span /><span /><span /></div>
          <div className="bus-vehicle-body">まちバス</div>
          <div className="bus-brake-lights"><span /><span /></div>
          <div className="bus-wheels"><span /><span /></div>
        </div>

        {view.flashMessage && (
          <div className="bus-road-message" role="status">
            {view.flashMessage}
          </div>
        )}


        {view.phase === 'feedback' && view.feedback && (
          <div className={`arcade-feedback bus-stop-feedback is-${view.feedback.kind}`} role="status">
            <div className="arcade-feedback-icon" aria-hidden="true">
              {view.feedback.kind === 'great' ? '🌟' : view.feedback.kind === 'close' ? '👏' : '💪'}
            </div>
            <h3>{view.feedback.title}</h3>
            <p>{view.feedback.detail}</p>
            <p className="bus-next-stop-message">
              {view.stopIndex < STOPS.length - 1 ? `つぎは「${STOPS[view.stopIndex + 1].name}」` : '3つの停留所を走りきったよ！'}
            </p>
          </div>
        )}
      </div>

      <div className="bus-controls" aria-label="運転ボタン">
        <button
          type="button"
          className="bus-steer-button"
          disabled={view.phase !== 'playing'}
          onClick={() => moveBus(-7)}
          aria-label="バスを左へ動かす"
        >
          <span aria-hidden="true">←</span> ひだり
        </button>
        <button
          type="button"
          className={`bus-brake-button${view.braking ? ' is-pressed' : ''}`}
          disabled={view.phase !== 'playing'}
          aria-pressed={view.braking}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setBraking(true)
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            setBraking(false)
          }}
          onPointerCancel={() => setBraking(false)}
          onLostPointerCapture={() => setBraking(false)}
          onBlur={() => setBraking(false)}
        >
          <span className="bus-brake-icon" aria-hidden="true">●</span>
          {view.braking ? 'ブレーキ中！' : '長押し ブレーキ'}
          <small>スペースキーでもOK</small>
        </button>
        <button
          type="button"
          className="bus-steer-button"
          disabled={view.phase !== 'playing'}
          onClick={() => moveBus(7)}
          aria-label="バスを右へ動かす"
        >
          みぎ <span aria-hidden="true">→</span>
        </button>
      </div>

      <p className="bus-help-text">
        <span aria-hidden="true">💡</span> {skillLevel > 1 ? `レベル${skillLevel}の運転サポートで、停車エリアが少し広くなっています。` : '停留所の70mくらい前からブレーキを長押ししてみよう。'}
      </p>
    </section>
  )
}
