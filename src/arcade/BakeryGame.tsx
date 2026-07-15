import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ArcadeGameProps } from './types'

type BakeryPhase = 'ingredients' | 'knead' | 'oven'

interface Ingredient {
  id: string
  emoji: string
  label: string
  shortLabel: string
  needed: boolean
}

interface DragOffset {
  x: number
  y: number
}

interface ActiveDrag {
  id: string
  pointerId: number
  startX: number
  startY: number
}

interface KneadPointer {
  pointerId: number
  x: number
  y: number
}

const INGREDIENTS: readonly Ingredient[] = [
  { id: 'flour-1', emoji: '🌾', label: 'こむぎこ 1カップ', shortLabel: 'こむぎこ', needed: true },
  { id: 'milk', emoji: '🥛', label: 'ミルク 1カップ', shortLabel: 'ミルク', needed: true },
  { id: 'egg', emoji: '🥚', label: 'たまご', shortLabel: 'たまご', needed: false },
  { id: 'flour-2', emoji: '🌾', label: 'こむぎこ 1カップ', shortLabel: 'こむぎこ', needed: true },
  { id: 'chocolate', emoji: '🍫', label: 'チョコレート', shortLabel: 'チョコ', needed: false },
  { id: 'yeast', emoji: '🟡', label: 'イースト 1ふくろ', shortLabel: 'イースト', needed: true },
]

const REQUIRED_INGREDIENTS = INGREDIENTS.filter((ingredient) => ingredient.needed)
const HOLD_TARGET_MS = 480

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const phaseNumber = (phase: BakeryPhase) => {
  if (phase === 'ingredients') return 1
  if (phase === 'knead') return 2
  return 3
}

export function BakeryGame({ skillLevel, onComplete }: ArcadeGameProps) {
  const safeSkill = clamp(Number.isFinite(skillLevel) ? skillLevel : 0, 0, 6)
  const [phase, setPhase] = useState<BakeryPhase>('ingredients')
  const [mistakes, setMistakes] = useState(0)
  const mistakesRef = useRef(0)
  const startedAtRef = useRef(Date.now())
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  const [feedback, setFeedback] = useState('注文カードと おなじ材料を、ボウルへ はこぼう！')
  const [acceptedIngredients, setAcceptedIngredients] = useState<string[]>([])
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>({})
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null)
  const [rejectedIngredient, setRejectedIngredient] = useState<string | null>(null)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const ingredientsLockedRef = useRef(false)
  const bowlRef = useRef<HTMLDivElement | null>(null)
  const rejectTimerRef = useRef<number | null>(null)

  const [kneadProgress, setKneadProgress] = useState(0)
  const [isKneading, setIsKneading] = useState(false)
  const [kneadPoint, setKneadPoint] = useState({ x: 50, y: 54 })
  const kneadPointerRef = useRef<KneadPointer | null>(null)

  const [ovenPosition, setOvenPosition] = useState(0)
  const ovenPositionRef = useRef(0)
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdStartRef = useRef<number | null>(null)
  const holdMarkerRef = useRef<number | null>(null)
  const ovenMissesRef = useRef(0)
  const [pendingResult, setPendingResult] = useState<Parameters<ArcadeGameProps['onComplete']>[0] | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => () => {
    if (rejectTimerRef.current !== null) window.clearTimeout(rejectTimerRef.current)
  }, [])

  const addMistake = useCallback(() => {
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
  }, [])

  const resetIngredientOffset = useCallback((id: string) => {
    setDragOffsets((current) => ({ ...current, [id]: { x: 0, y: 0 } }))
  }, [])

  const placeIngredient = useCallback((ingredient: Ingredient) => {
    if (ingredientsLockedRef.current) return
    resetIngredientOffset(ingredient.id)

    if (ingredient.needed) {
      setAcceptedIngredients((current) => {
        if (current.includes(ingredient.id)) return current
        const next = [...current, ingredient.id]
        if (next.length === REQUIRED_INGREDIENTS.length) ingredientsLockedRef.current = true
        return next
      })
      setFeedback(`${ingredient.shortLabel}、せいかい！ ボウルに入ったよ。`)
      return
    }

    addMistake()
    setRejectedIngredient(ingredient.id)
    setFeedback(`おっと！ ${ingredient.shortLabel}は 今回のパンには つかわないよ。もどしておくね。`)
    if (rejectTimerRef.current !== null) window.clearTimeout(rejectTimerRef.current)
    rejectTimerRef.current = window.setTimeout(() => setRejectedIngredient(null), 650)
  }, [addMistake, resetIngredientOffset])

  const handleIngredientPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    if (event.button !== 0 || phase !== 'ingredients' || ingredientsLockedRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    activeDragRef.current = {
      id: ingredient.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    setActiveIngredient(ingredient.id)
  }

  const handleIngredientPointerMove = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    const drag = activeDragRef.current
    if (!drag || drag.id !== ingredient.id || drag.pointerId !== event.pointerId) return
    setDragOffsets((current) => ({
      ...current,
      [ingredient.id]: {
        x: event.clientX - drag.startX,
        y: event.clientY - drag.startY,
      },
    }))
  }

  const handleIngredientPointerUp = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    const drag = activeDragRef.current
    if (!drag || drag.id !== ingredient.id || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    activeDragRef.current = null
    setActiveIngredient(null)

    const bowlRect = bowlRef.current?.getBoundingClientRect()
    const isInsideBowl = Boolean(
      bowlRect
      && event.clientX >= bowlRect.left
      && event.clientX <= bowlRect.right
      && event.clientY >= bowlRect.top
      && event.clientY <= bowlRect.bottom,
    )

    if (isInsideBowl) placeIngredient(ingredient)
    else resetIngredientOffset(ingredient.id)
  }

  const cancelIngredientDrag = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    const drag = activeDragRef.current
    if (!drag || drag.id !== ingredient.id || drag.pointerId !== event.pointerId) return
    activeDragRef.current = null
    setActiveIngredient(null)
    resetIngredientOffset(ingredient.id)
  }

  const handleIngredientKeyDown = (event: KeyboardEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat || ingredientsLockedRef.current) return
    event.preventDefault()
    placeIngredient(ingredient)
  }

  useEffect(() => {
    if (phase !== 'ingredients' || acceptedIngredients.length !== REQUIRED_INGREDIENTS.length) return
    setFeedback('ぜんぶ そろった！ つぎは 生地をこねるよ。')
    const timer = window.setTimeout(() => {
      setPhase('knead')
      setFeedback('生地の上を、おおきく ぐるぐる なぞってこねよう！')
    }, 850)
    return () => window.clearTimeout(timer)
  }, [acceptedIngredients.length, phase])

  const kneadDistanceNeeded = Math.max(430, 760 - safeSkill * 48)
  const addKneadDistance = useCallback((distance: number) => {
    setKneadProgress((current) => clamp(current + (distance / kneadDistanceNeeded) * 100, 0, 100))
  }, [kneadDistanceNeeded])

  const updateKneadPoint = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setKneadPoint({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 7, 93),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 88),
    })
  }

  const handleKneadPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || kneadProgress >= 100) return
    event.currentTarget.setPointerCapture(event.pointerId)
    kneadPointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setIsKneading(true)
    updateKneadPoint(event)
  }

  const handleKneadPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = kneadPointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
    if (distance > 1) addKneadDistance(Math.min(distance, 64))
    kneadPointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    updateKneadPoint(event)
  }

  const finishKneadingGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = kneadPointerRef.current
    if (!pointer || pointer.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    kneadPointerRef.current = null
    setIsKneading(false)
  }

  const cancelKneadingGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (kneadPointerRef.current?.pointerId !== event.pointerId) return
    kneadPointerRef.current = null
    setIsKneading(false)
  }

  const kneadWithKeyboard = () => {
    addKneadDistance(66 + safeSkill * 3)
    setFeedback('いいリズム！ スペースキーを 何回かおして ふわふわにしよう。')
  }

  const handleKneadKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key) || event.repeat) return
    event.preventDefault()
    kneadWithKeyboard()
  }

  useEffect(() => {
    if (phase !== 'knead' || kneadProgress < 100) return
    setIsKneading(false)
    setFeedback('つるつる生地の できあがり！ さいごは オーブンだよ。')
    const timer = window.setTimeout(() => {
      setPhase('oven')
      setFeedback('メーターが みどりのところで、ミトンを長おしして はなそう！')
    }, 850)
    return () => window.clearTimeout(timer)
  }, [kneadProgress, phase])

  useEffect(() => {
    if (phase !== 'oven') return
    let frame = 0
    let previousFrame = performance.now()
    let markerPosition = ovenPositionRef.current
    let markerDirection: 1 | -1 = 1
    const oneWayMs = 2350 + safeSkill * 130

    const tick = (now: number) => {
      const elapsed = Math.min(80, now - previousFrame)
      previousFrame = now

      if (holdStartRef.current === null && !completedRef.current) {
        markerPosition += markerDirection * (elapsed / oneWayMs) * 100
        if (markerPosition >= 100) {
          markerPosition = 200 - markerPosition
          markerDirection = -1
        } else if (markerPosition <= 0) {
          markerPosition = -markerPosition
          markerDirection = 1
        }
        ovenPositionRef.current = markerPosition
        setOvenPosition(markerPosition)
      }

      if (holdStartRef.current !== null) {
        setHoldProgress(clamp(((now - holdStartRef.current) / HOLD_TARGET_MS) * 100, 0, 100))
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [phase, safeSkill])

  const ovenBounds = useMemo(() => {
    const skillAssist = Math.min(7, safeSkill * 1.15)
    const retryAssist = mistakes >= 2 ? Math.min(12, (mistakes - 1) * 4) : 0
    return {
      start: 52 - skillAssist - retryAssist,
      end: 81 + skillAssist + retryAssist,
    }
  }, [mistakes, safeSkill])

  const beginOvenHold = () => {
    if (holdStartRef.current !== null || completedRef.current) return
    holdMarkerRef.current = ovenPositionRef.current
    holdStartRef.current = performance.now()
    setIsHolding(true)
    setHoldProgress(0)
    setFeedback('そのまま 長おし……みどりで はなしてね！')
  }

  const resetOvenHold = () => {
    holdStartRef.current = null
    holdMarkerRef.current = null
    setIsHolding(false)
    setHoldProgress(0)
  }

  const completeBakery = (completionFeedback = 'ふっくらパンの やきあがり！ おきゃくさんが よろこんでいるよ！') => {
    if (completedRef.current) return
    completedRef.current = true
    const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    const timePenalty = Math.max(0, seconds - 42) * 0.35
    const score = Math.round(clamp(100 - mistakesRef.current * 9 - timePenalty, 42, 100))
    const stars: 1 | 2 | 3 = score >= 85 ? 3 : score >= 65 ? 2 : 1
    const title = stars === 3 ? 'パンの まほうつかい！' : stars === 2 ? 'すてきな パンしょくにん！' : 'さいごまで やりきった！'
    const correctionText = mistakesRef.current === 0
      ? 'おなおしなしで、注文どおりにできたよ。'
      : `${mistakesRef.current}回 おなおしして、ちゃんと おいしくできたよ。`

    setFeedback(completionFeedback)
    setPendingResult({
      score,
      mistakes: mistakesRef.current,
      stars,
      title,
      detail: `材料をはかって、生地をこねて、ちょうどよく焼けたね。${correctionText}`,
      seconds,
    })
  }

  const finishOvenHold = () => {
    const holdStart = holdStartRef.current
    if (holdStart === null || completedRef.current) return

    const heldFor = performance.now() - holdStart
    const marker = holdMarkerRef.current ?? ovenPositionRef.current
    resetOvenHold()

    if (
      heldFor >= HOLD_TARGET_MS * 0.8
      && marker >= ovenBounds.start - 4
      && marker <= ovenBounds.end + 4
    ) {
      completeBakery()
      return
    }

    addMistake()
    ovenMissesRef.current += 1
    if (ovenMissesRef.current >= 3) {
      completeBakery('3回チャレンジして コツをつかんだね！ ふっくらパンの やきあがり！')
      return
    }

    if (heldFor < HOLD_TARGET_MS * 0.8) {
      setFeedback('もうちょっと 長くもとう！ 丸いメーターが いっぱいになったら はなすよ。')
    } else if (marker < ovenBounds.start - 4) {
      setFeedback('まだ すこし白いみたい。メーターは またもどってくるよ。だいじょうぶ！')
    } else {
      setFeedback('ちょっぴり こんがり！ つぎは みどりの中で はなしてみよう。')
    }
  }

  const handleOvenPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    beginOvenHold()
  }

  const handleOvenPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishOvenHold()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleOvenPointerCancel = () => resetOvenHold()

  const handleOvenKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return
    event.preventDefault()
    beginOvenHold()
  }

  const handleOvenKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    finishOvenHold()
  }

  useEffect(() => {
    if (!pendingResult) return
    const timer = window.setTimeout(() => onCompleteRef.current(pendingResult), 900)
    return () => window.clearTimeout(timer)
  }, [pendingResult])

  const activePhaseNumber = phaseNumber(phase)
  const ingredientsComplete = acceptedIngredients.length === REQUIRED_INGREDIENTS.length
  const availableIngredients = INGREDIENTS.filter((ingredient) => !acceptedIngredients.includes(ingredient.id))
  const acceptedObjects = acceptedIngredients
    .map((id) => INGREDIENTS.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))

  return (
    <section className="arcade-game bakery-game" aria-labelledby="bakery-game-title">
      <header className="arcade-game-header bakery-game-header">
        <div className="bakery-title-group">
          <span className="bakery-job-badge" aria-hidden="true">🥖</span>
          <div>
            <p className="arcade-eyebrow">パンやさんの おしごと</p>
            <h2 id="bakery-game-title">ふわふわパンを とどけよう！</h2>
          </div>
        </div>
        <div className="arcade-correction-counter" aria-label={`おなおし ${mistakes}回`}>
          <span aria-hidden="true">🛠️</span> おなおし <strong>{mistakes}</strong>
        </div>
      </header>

      <ol className="arcade-stepper" aria-label="パンづくりの手順">
        {[
          { number: 1, emoji: '🥣', label: 'はかる' },
          { number: 2, emoji: '👐', label: 'こねる' },
          { number: 3, emoji: '🔥', label: 'やく' },
        ].map((step) => (
          <li
            key={step.number}
            className={[
              'arcade-step',
              step.number === activePhaseNumber ? 'arcade-step-current' : '',
              step.number < activePhaseNumber ? 'arcade-step-done' : '',
            ].filter(Boolean).join(' ')}
            aria-current={step.number === activePhaseNumber ? 'step' : undefined}
          >
            <span className="arcade-step-icon" aria-hidden="true">{step.number < activePhaseNumber ? '✓' : step.emoji}</span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <div className="arcade-feedback bakery-feedback" role="status" aria-live="polite">
        <span className="bakery-chef-face" aria-hidden="true">👩‍🍳</span>
        <p>{feedback}</p>
      </div>

      {phase === 'ingredients' && (
        <div className="bakery-stage bakery-ingredients-stage">
          <article className="bakery-order-card">
            <span className="bakery-order-pin" aria-hidden="true">📌</span>
            <div>
              <p className="bakery-order-label">きょうの ちゅうもん</p>
              <h3>ふわふわミルクパン 4こ</h3>
              <p><strong>こむぎこ 2</strong>・<strong>ミルク 1</strong>・<strong>イースト 1</strong></p>
            </div>
          </article>

          <div className="bakery-workbench">
            <div className="bakery-pantry" aria-label="材料だな">
              <h3><span aria-hidden="true">🧺</span> ざいりょう</h3>
              <p className="bakery-small-help">カードをつかんで、ボウルへはこぼう。キーボードは Enter。</p>
              <div className="bakery-ingredient-grid">
                {availableIngredients.map((ingredient) => {
                  const offset = dragOffsets[ingredient.id] ?? { x: 0, y: 0 }
                  const ingredientStyle: CSSProperties = {
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                    touchAction: 'none',
                  }
                  return (
                    <button
                      key={ingredient.id}
                      type="button"
                      className={[
                        'bakery-ingredient-card',
                        activeIngredient === ingredient.id ? 'bakery-ingredient-dragging' : '',
                        rejectedIngredient === ingredient.id ? 'bakery-ingredient-rejected' : '',
                      ].filter(Boolean).join(' ')}
                      style={ingredientStyle}
                      aria-label={`${ingredient.label}。ボウルへドラッグ。キーボードでは Enter で入れる`}
                      onPointerDown={(event) => handleIngredientPointerDown(event, ingredient)}
                      onPointerMove={(event) => handleIngredientPointerMove(event, ingredient)}
                      onPointerUp={(event) => handleIngredientPointerUp(event, ingredient)}
                      onPointerCancel={(event) => cancelIngredientDrag(event, ingredient)}
                      onLostPointerCapture={(event) => cancelIngredientDrag(event, ingredient)}
                      onKeyDown={(event) => handleIngredientKeyDown(event, ingredient)}
                      onDragStart={(event) => event.preventDefault()}
                      disabled={ingredientsComplete}
                    >
                      <span className="bakery-ingredient-emoji" aria-hidden="true">{ingredient.emoji}</span>
                      <span>{ingredient.label}</span>
                      <span className="bakery-grab-label" aria-hidden="true">つかむ</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              ref={bowlRef}
              className={[
                'bakery-bowl-zone',
                activeIngredient ? 'bakery-bowl-ready' : '',
                acceptedIngredients.length === REQUIRED_INGREDIENTS.length ? 'bakery-bowl-complete' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`ボウル。正しい材料が ${acceptedIngredients.length}こ入っています`}
            >
              <div className="bakery-bowl-rim">
                {acceptedObjects.length === 0 ? (
                  <span className="bakery-bowl-arrow" aria-hidden="true">ここへ<br />↓</span>
                ) : (
                  <div className="bakery-bowl-contents" aria-hidden="true">
                    {acceptedObjects.map((ingredient) => <span key={ingredient.id}>{ingredient.emoji}</span>)}
                  </div>
                )}
              </div>
              <div className="bakery-bowl-body" aria-hidden="true">🥣</div>
              <div className="bakery-count-chip">{acceptedIngredients.length} / {REQUIRED_INGREDIENTS.length}</div>
            </div>
          </div>
        </div>
      )}

      {phase === 'knead' && (
        <div className="bakery-stage bakery-knead-stage">
          <div className="bakery-knead-copy">
            <span className="bakery-action-number">2</span>
            <div>
              <h3>手で ぐるぐる、しっかり こねよう！</h3>
              <p>生地の上を おしたまま、大きな丸を かいてね。</p>
            </div>
          </div>

          <button
            type="button"
            className={['bakery-dough-surface', isKneading ? 'bakery-dough-kneading' : ''].filter(Boolean).join(' ')}
            aria-label={`生地をこねる場所。できあがり ${Math.round(kneadProgress)}パーセント。ドラッグ、またはスペースキーでこねる`}
            onPointerDown={handleKneadPointerDown}
            onPointerMove={handleKneadPointerMove}
            onPointerUp={finishKneadingGesture}
            onPointerCancel={cancelKneadingGesture}
            onKeyDown={handleKneadKeyDown}
            disabled={kneadProgress >= 100}
            style={{ touchAction: 'none' }}
          >
            <span className="bakery-flour-cloud bakery-flour-cloud-one" aria-hidden="true">✦</span>
            <span className="bakery-flour-cloud bakery-flour-cloud-two" aria-hidden="true">✦</span>
            <span className="bakery-dough-blob" aria-hidden="true">
              <span className="bakery-dough-fold bakery-dough-fold-one" />
              <span className="bakery-dough-fold bakery-dough-fold-two" />
            </span>
            <span
              className="bakery-kneading-hand"
              aria-hidden="true"
              style={{ left: `${kneadPoint.x}%`, top: `${kneadPoint.y}%` }}
            >
              {isKneading ? '👐' : '👆'}
            </span>
            <span className="bakery-trace-hint" aria-hidden="true">↻ ぐるぐる</span>
          </button>

          <div className="bakery-progress-group">
            <div className="bakery-progress-label">
              <span>生地の ふわふわ</span>
              <strong>{Math.round(kneadProgress)}%</strong>
            </div>
            <div
              className="arcade-progress-track bakery-knead-progress"
              role="progressbar"
              aria-label="生地のできあがり"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(kneadProgress)}
            >
              <span className="arcade-progress-fill" style={{ width: `${kneadProgress}%` }} />
            </div>
          </div>

          <button type="button" className="bakery-keyboard-helper" onClick={kneadWithKeyboard}>
            <span aria-hidden="true">⌨️</span>
            キーボードなら、ここで Space / Enter
          </button>
        </div>
      )}

      {phase === 'oven' && (
        <div className={['bakery-stage', 'bakery-oven-stage', pendingResult ? 'bakery-oven-success' : ''].join(' ')}>
          <div className="bakery-oven-scene" aria-hidden="true">
            <div className="bakery-oven-top">🔥 オーブン 🔥</div>
            <div className="bakery-oven-window">
              <span className="bakery-bread bakery-bread-one">🥖</span>
              <span className="bakery-bread bakery-bread-two">🥐</span>
              <span className="bakery-oven-glow" />
            </div>
          </div>

          <div className="bakery-timing-panel">
            <div className="bakery-timing-title">
              <span className="bakery-action-number">3</span>
              <div>
                <h3>みどりで 取りだそう！</h3>
                <p>ミトンを長おし。丸がいっぱいに なったら、みどりの中で はなすよ。</p>
              </div>
            </div>

            <div className="bakery-oven-gauge" aria-label={`焼きぐあい ${Math.round(ovenPosition)}パーセント`}>
              <div className="bakery-gauge-labels" aria-hidden="true">
                <span>まだ</span><span>ちょうど！</span><span>こんがり</span>
              </div>
              <div className="bakery-gauge-track">
                <span
                  className="bakery-gauge-good-zone"
                  style={{ left: `${ovenBounds.start}%`, width: `${ovenBounds.end - ovenBounds.start}%` }}
                />
                <span className="bakery-gauge-marker" style={{ left: `${ovenPosition}%` }}>
                  <span aria-hidden="true">🍞</span>
                </span>
              </div>
            </div>

            {mistakes >= 2 && (
              <p className="bakery-retry-hint"><span aria-hidden="true">💡</span> みどりを ひろくしたよ。メーターは行ったり来たりするから、あわてなくてOK！</p>
            )}

            <button
              type="button"
              className={['bakery-oven-button', isHolding ? 'bakery-oven-button-holding' : ''].filter(Boolean).join(' ')}
              onPointerDown={handleOvenPointerDown}
              onPointerUp={handleOvenPointerUp}
              onPointerCancel={handleOvenPointerCancel}
              onLostPointerCapture={resetOvenHold}
              onKeyDown={handleOvenKeyDown}
              onKeyUp={handleOvenKeyUp}
              onBlur={resetOvenHold}
              disabled={Boolean(pendingResult)}
              style={{ touchAction: 'none' }}
            >
              <span className="bakery-mitt" aria-hidden="true">🧤</span>
              <span>{pendingResult ? 'やきあがり！' : isHolding ? 'そのまま おして！' : 'ミトンで 長おし'}</span>
              <span className="bakery-hold-ring" aria-hidden="true">
                <span style={{ height: `${holdProgress}%` }} />
              </span>
            </button>
          </div>

          {pendingResult && (
            <div className="bakery-celebration" role="status">
              <span aria-hidden="true">✨</span>
              <strong>ふっくら やきあがり！</strong>
              <span aria-hidden="true">✨</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
