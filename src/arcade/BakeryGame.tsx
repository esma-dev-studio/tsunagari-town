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
import '../arcadeBakery.css'

type BakeryPhase = 'ingredients' | 'knead' | 'oven'
type FeedbackTone = 'guide' | 'success' | 'oops'

interface Ingredient {
  id: string
  emoji: string
  label: string
  shortLabel: string
  kind: 'flour' | 'milk' | 'yeast' | 'egg' | 'chocolate' | 'salt'
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

interface KneadTarget {
  x: number
  y: number
  label: string
  action: string
}

const INGREDIENTS: readonly Ingredient[] = [
  { id: 'flour-1', emoji: '🌾', label: 'こむぎこ 1カップ', shortLabel: 'こむぎこ', kind: 'flour', needed: true },
  { id: 'egg', emoji: '🥚', label: 'たまご 1こ', shortLabel: 'たまご', kind: 'egg', needed: false },
  { id: 'milk', emoji: '🥛', label: 'ミルク 1カップ', shortLabel: 'ミルク', kind: 'milk', needed: true },
  { id: 'chocolate', emoji: '🍫', label: 'チョコ 1まい', shortLabel: 'チョコ', kind: 'chocolate', needed: false },
  { id: 'flour-2', emoji: '🌾', label: 'こむぎこ 1カップ', shortLabel: 'こむぎこ', kind: 'flour', needed: true },
  { id: 'salt', emoji: '🧂', label: 'しお 1びん', shortLabel: 'しお', kind: 'salt', needed: false },
  { id: 'yeast', emoji: '🟡', label: 'イースト 1ふくろ', shortLabel: 'イースト', kind: 'yeast', needed: true },
]

const REQUIRED = INGREDIENTS.filter((ingredient) => ingredient.needed)
const KNEAD_TARGETS: readonly KneadTarget[] = [
  { x: 27, y: 34, label: 'ひだり上', action: 'ぎゅっ' },
  { x: 72, y: 34, label: 'みぎ上', action: 'たたむ' },
  { x: 72, y: 70, label: 'みぎ下', action: 'ぎゅっ' },
  { x: 29, y: 70, label: 'ひだり下', action: 'たたむ' },
  { x: 50, y: 51, label: 'まんなか', action: 'しあげ' },
]
const HOLD_MS = 500

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const phaseNumber = (phase: BakeryPhase) => phase === 'ingredients' ? 1 : phase === 'knead' ? 2 : 3

const storyText = (phase: BakeryPhase, finished: boolean) => {
  if (finished) return 'わあ！ おひさまみたい！ えんそくで みんなと食べるね！'
  if (phase === 'ingredients') return 'バスが来るまえに、弟の えんそくパンを おねがい！'
  if (phase === 'knead') return 'いいにおい！ ふわふわに なるかな？'
  return 'もうすぐ バスの時間。きれいな きつね色にしてね！'
}

export function BakeryGame({ skillLevel, onComplete }: ArcadeGameProps) {
  const safeSkill = clamp(Number.isFinite(skillLevel) ? skillLevel : 0, 0, 6)
  const [phase, setPhase] = useState<BakeryPhase>('ingredients')
  const [mistakes, setMistakes] = useState(0)
  const mistakesRef = useRef(0)
  const [combo, setCombo] = useState(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const [successes, setSuccesses] = useState(0)
  const [beat, setBeat] = useState(0)
  const startedAtRef = useRef(Date.now())
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  const [feedback, setFeedback] = useState('注文メモを見て、ぴったりの材料を えらぼう！')
  const [tone, setTone] = useState<FeedbackTone>('guide')
  const [accepted, setAccepted] = useState<string[]>([])
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>({})
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null)
  const [rejectedIngredient, setRejectedIngredient] = useState<string | null>(null)
  const dragRef = useRef<ActiveDrag | null>(null)
  const ingredientsLockedRef = useRef(false)
  const bowlRef = useRef<HTMLDivElement | null>(null)
  const firstIngredientRef = useRef<HTMLButtonElement | null>(null)
  const kneadBoardRef = useRef<HTMLButtonElement | null>(null)
  const ovenButtonRef = useRef<HTMLButtonElement | null>(null)
  const rejectTimerRef = useRef<number | null>(null)
  const rescueTimerRef = useRef<number | null>(null)

  const [kneadIndex, setKneadIndex] = useState(0)
  const [kneadPoint, setKneadPoint] = useState({ x: 50, y: 50 })
  const [isKneading, setIsKneading] = useState(false)
  const [kneadMisses, setKneadMisses] = useState(0)
  const kneadPointerRef = useRef<number | null>(null)
  const kneadHitRef = useRef(false)

  const [ovenPosition, setOvenPosition] = useState(12)
  const ovenPositionRef = useRef(12)
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdStartRef = useRef<number | null>(null)
  const holdMarkerRef = useRef<number | null>(null)
  const [ovenMisses, setOvenMisses] = useState(0)
  const ovenMissesRef = useRef(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [pendingResult, setPendingResult] = useState<Parameters<ArcadeGameProps['onComplete']>[0] | null>(null)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => () => {
    if (rejectTimerRef.current !== null) window.clearTimeout(rejectTimerRef.current)
    if (rescueTimerRef.current !== null) window.clearTimeout(rescueTimerRef.current)
  }, [])

  const success = useCallback((message: string) => {
    const next = comboRef.current + 1
    comboRef.current = next
    maxComboRef.current = Math.max(maxComboRef.current, next)
    setCombo(next)
    setSuccesses((current) => current + 1)
    setBeat((current) => current + 1)
    setTone('success')
    setFeedback(message)
  }, [])

  const mistake = useCallback((message: string) => {
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    comboRef.current = 0
    setCombo(0)
    setBeat((current) => current + 1)
    setTone('oops')
    setFeedback(message)
  }, [])

  const resetOffset = useCallback((id: string) => {
    setDragOffsets((current) => ({ ...current, [id]: { x: 0, y: 0 } }))
  }, [])

  const chooseIngredient = useCallback((ingredient: Ingredient) => {
    if (ingredientsLockedRef.current || accepted.includes(ingredient.id)) return
    resetOffset(ingredient.id)

    if (ingredient.needed) {
      const nextCount = accepted.length + 1
      setAccepted((current) => [...current, ingredient.id])
      if (nextCount === REQUIRED.length) ingredientsLockedRef.current = true
      success(nextCount === REQUIRED.length
        ? 'すごい！ 4つ ぜんぶ正解。注文どおりの生地になった！'
        : ingredient.shortLabel + '、ぴったり！ ' + nextCount + 'れんぞくを めざそう。')
      return
    }

    mistake(ingredient.shortLabel + 'は メモにないよ。今回は入れずに、元のたなへ もどしたよ。')
    setRejectedIngredient(ingredient.id)
    if (rejectTimerRef.current !== null) window.clearTimeout(rejectTimerRef.current)
    rejectTimerRef.current = window.setTimeout(() => setRejectedIngredient(null), 700)
  }, [accepted, mistake, resetOffset, success])

  const ingredientDown = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    if (event.button !== 0 || ingredientsLockedRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id: ingredient.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY }
    setActiveIngredient(ingredient.id)
  }

  const ingredientMove = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    const drag = dragRef.current
    if (!drag || drag.id !== ingredient.id || drag.pointerId !== event.pointerId) return
    setDragOffsets((current) => ({
      ...current,
      [ingredient.id]: { x: event.clientX - drag.startX, y: event.clientY - drag.startY },
    }))
  }

  const ingredientUp = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    const drag = dragRef.current
    if (!drag || drag.id !== ingredient.id || drag.pointerId !== event.pointerId) return
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    const bowl = bowlRef.current?.getBoundingClientRect()
    const inBowl = Boolean(bowl && event.clientX >= bowl.left && event.clientX <= bowl.right && event.clientY >= bowl.top && event.clientY <= bowl.bottom)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setActiveIngredient(null)
    if (inBowl || distance < 9) chooseIngredient(ingredient)
    else resetOffset(ingredient.id)
  }

  const cancelIngredient = (event: ReactPointerEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setActiveIngredient(null)
    resetOffset(ingredient.id)
  }

  const ingredientKey = (event: React.KeyboardEvent<HTMLButtonElement>, ingredient: Ingredient) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return
    event.preventDefault()
    chooseIngredient(ingredient)
  }

  useEffect(() => {
    if (phase !== 'ingredients' || accepted.length !== REQUIRED.length) return
    const timer = window.setTimeout(() => {
      setPhase('knead')
      setTone('guide')
      setFeedback('光る丸へ 手を動かして、順番に ぎゅっ！ 5回できたら ふわふわだよ。')
    }, 1050)
    return () => window.clearTimeout(timer)
  }, [accepted.length, phase])

  const activeTarget = KNEAD_TARGETS[Math.min(kneadIndex, KNEAD_TARGETS.length - 1)]
  const targetRadius = 12 + safeSkill * 1.25 + Math.min(9, kneadMisses * 2.2)

  const finishKneadStep = useCallback((fromKeyboard = false) => {
    if (kneadIndex >= KNEAD_TARGETS.length || kneadHitRef.current) return
    kneadHitRef.current = true
    const next = kneadIndex + 1
    setKneadIndex(next)
    success(next === KNEAD_TARGETS.length
      ? '5回 きれいに こねられた！ 生地が ぷるんと ふくらんだよ。'
      : KNEAD_TARGETS[kneadIndex].action + '、せいこう！ 次の光へ つなげよう' + (fromKeyboard ? '。' : '！'))
  }, [kneadIndex, success])

  const updateKneadPosition = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const point = {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 3, 97),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 5, 95),
    }
    setKneadPoint(point)
    if (Math.hypot(point.x - activeTarget.x, point.y - activeTarget.y) <= targetRadius) finishKneadStep()
  }

  const kneadDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || kneadIndex >= KNEAD_TARGETS.length) return
    event.currentTarget.setPointerCapture(event.pointerId)
    kneadPointerRef.current = event.pointerId
    kneadHitRef.current = false
    setIsKneading(true)
    updateKneadPosition(event)
  }

  const kneadMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (kneadPointerRef.current !== event.pointerId || kneadHitRef.current) return
    updateKneadPosition(event)
  }

  const kneadUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (kneadPointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const hit = kneadHitRef.current
    kneadPointerRef.current = null
    setIsKneading(false)
    if (!hit) {
      setKneadMisses((current) => current + 1)
      mistake('おしい！ 「' + activeTarget.label + '」の 光る丸を めざそう。丸を少し大きくしたよ。')
    }
  }

  const cancelKnead = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (kneadPointerRef.current !== event.pointerId) return
    kneadPointerRef.current = null
    kneadHitRef.current = false
    setIsKneading(false)
  }

  const kneadWithKeyboard = () => {
    if (kneadIndex >= KNEAD_TARGETS.length) return
    kneadHitRef.current = false
    finishKneadStep(true)
  }

  const kneadKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return
    event.preventDefault()
    kneadWithKeyboard()
  }

  useEffect(() => {
    if (phase !== 'knead' || kneadIndex < KNEAD_TARGETS.length) return
    const timer = window.setTimeout(() => {
      setPhase('oven')
      setTone('guide')
      setFeedback('パンの色を見よう。メーターが「きつね色」で、ミトンを長おしして はなそう！')
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [kneadIndex, phase])

  useEffect(() => {
    let target: HTMLButtonElement | null = null
    if (phase === 'ingredients' && accepted.length > 0 && accepted.length < REQUIRED.length) {
      target = firstIngredientRef.current
    } else if (phase === 'knead') {
      target = kneadBoardRef.current
    } else if (phase === 'oven') {
      target = ovenButtonRef.current
    }
    if (!target) return
    const frame = window.requestAnimationFrame(() => target?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [accepted.length, phase])

  useEffect(() => {
    if (phase !== 'oven') return
    let frame = 0
    let previous = performance.now()
    let marker = reducedMotion ? 65 : ovenPositionRef.current
    let direction: 1 | -1 = 1
    const oneWayMs = 2450 + safeSkill * 140

    if (reducedMotion) {
      ovenPositionRef.current = marker
      setOvenPosition(marker)
    }

    const tick = (now: number) => {
      const elapsed = Math.min(80, now - previous)
      previous = now
      if (!reducedMotion && holdStartRef.current === null && !completedRef.current) {
        marker += direction * (elapsed / oneWayMs) * 100
        if (marker >= 100) {
          marker = 200 - marker
          direction = -1
        } else if (marker <= 0) {
          marker = -marker
          direction = 1
        }
        ovenPositionRef.current = marker
        setOvenPosition(marker)
      }
      if (holdStartRef.current !== null) {
        setHoldProgress(clamp(((now - holdStartRef.current) / HOLD_MS) * 100, 0, 100))
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [phase, reducedMotion, safeSkill])

  const ovenBounds = useMemo(() => {
    const skillAssist = Math.min(6, safeSkill * 1.15)
    const retryAssist = Math.min(12, ovenMisses * 4)
    return { start: 51 - skillAssist - retryAssist, end: 78 + skillAssist + retryAssist }
  }, [ovenMisses, safeSkill])

  const rescuePendingRef = useRef(false)

  const resetOvenHold = () => {
    holdStartRef.current = null
    holdMarkerRef.current = null
    setIsHolding(false)
    setHoldProgress(0)
  }

  const completeBakery = useCallback((message: string) => {
    if (completedRef.current) return
    completedRef.current = true
    const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    const timePenalty = Math.max(0, seconds - 72) * 0.22
    const score = Math.round(clamp(94 + Math.min(6, maxComboRef.current) - mistakesRef.current * 7 - timePenalty, 45, 100))
    const stars: 1 | 2 | 3 = score >= 88 ? 3 : score >= 68 ? 2 : 1
    const title = stars === 3 ? '朝の パンマスター！' : stars === 2 ? 'ふわふわ パンしょくにん！' : 'よろこびを とどけた！'
    const correction = mistakesRef.current === 0
      ? '注文も こね方も 焼き色も、ぜんぶ ぴったり！'
      : mistakesRef.current + '回 コツを見つけて、おいしく しあげたよ。'

    setTone('success')
    setFeedback(message)
    setBeat((current) => current + 1)
    setPendingResult({
      score,
      mistakes: mistakesRef.current,
      stars,
      title,
      detail: 'あおいさんの えんそくパンが完成！ ' + correction + ' 最高 ' + maxComboRef.current + 'れんぞくだったね。',
      seconds,
    })
  }, [])

  const judgeOven = (marker: number, heldLongEnough: boolean) => {
    if (completedRef.current || rescuePendingRef.current) return
    const inGoldenZone = marker >= ovenBounds.start - 3 && marker <= ovenBounds.end + 3
    if (heldLongEnough && inGoldenZone) {
      success('大せいこう！ きつね色のパンが ふっくら ふくらんだ！')
      completeBakery('やきたて完成！ あおいさんの顔が ぱっと明るくなったよ！')
      return
    }

    const nextMisses = ovenMissesRef.current + 1
    ovenMissesRef.current = nextMisses
    setOvenMisses(nextMisses)
    if (!heldLongEnough) {
      mistake('手をはなすのが すこし早かったよ。黄色が いっぱいになるまで 長おし！')
    } else if (marker < ovenBounds.start - 3) {
      mistake('まだ白いパンだよ。右へ進んで「きつね色」になるのを待とう！')
    } else {
      mistake('ちょっと こんがり。次は「きつね色」の中で はなそう！')
    }

    if (nextMisses >= 3) {
      rescuePendingRef.current = true
      rescueTimerRef.current = window.setTimeout(() => {
        rescueTimerRef.current = null
        completeBakery('3回で 焼き色のコツを発見！ 先ぱいといっしょに おいしく焼けたよ！')
      }, 650)
    }
  }

  const beginOvenHold = () => {
    if (holdStartRef.current !== null || completedRef.current || rescuePendingRef.current) return
    holdMarkerRef.current = ovenPositionRef.current
    holdStartRef.current = performance.now()
    setIsHolding(true)
    setHoldProgress(0)
    setTone('guide')
    setFeedback('そのまま 長おし……黄色が いっぱいになったら はなしてね！')
  }

  const finishOvenHold = () => {
    const holdStart = holdStartRef.current
    if (holdStart === null || completedRef.current) return
    const heldFor = performance.now() - holdStart
    const marker = holdMarkerRef.current ?? ovenPositionRef.current
    resetOvenHold()
    judgeOven(marker, heldFor >= HOLD_MS * 0.82)
  }

  const ovenDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    beginOvenHold()
  }

  const ovenUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishOvenHold()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const ovenKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return
    event.preventDefault()
    beginOvenHold()
  }

  const ovenKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    finishOvenHold()
  }

  useEffect(() => {
    if (!pendingResult) return
    const timer = window.setTimeout(() => onCompleteRef.current(pendingResult), 1500)
    return () => window.clearTimeout(timer)
  }, [pendingResult])

  const activePhase = phaseNumber(phase)
  const ingredientsComplete = accepted.length === REQUIRED.length
  const available = INGREDIENTS.filter((ingredient) => !accepted.includes(ingredient.id))
  const acceptedObjects = accepted
    .map((id) => INGREDIENTS.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
  const kindCount = (kind: Ingredient['kind']) => acceptedObjects.filter((ingredient) => ingredient.kind === kind).length
  const rank = successes >= 9 ? '朝のパンマスター' : successes >= 6 ? 'ふわふわ職人' : successes >= 3 ? 'こねこね見習い' : 'パン屋さんの新人'
  const ovenLook = ovenPosition < ovenBounds.start ? 'pale' : ovenPosition <= ovenBounds.end ? 'golden' : 'toasty'

  return (
    <section className="arcade-game bakery-v2" aria-labelledby="b100-title">
      <div className="b100-ambience" aria-hidden="true"><i /><i /><i /></div>

      <header className="b100-header">
        <div className="b100-brand">
          <span className="b100-brand-mark" aria-hidden="true">🥐</span>
          <div>
            <p>あさ6じ30ぷん・ひだまりベーカリー</p>
            <h2 id="b100-title">おひさまパンを とどけよう！</h2>
          </div>
        </div>
        <div className="b100-live-stats" aria-label={'れんぞく成功 ' + combo + '、やりなおし ' + mistakes + '回'}>
          <span className={combo >= 3 ? 'is-hot' : ''}>🔥 <b>{combo}</b> れんぞく</span>
          <span>🧰 <b>{mistakes}</b> おなおし</span>
        </div>
      </header>

      <section className="b100-story" aria-label="注文したお客さんのようす">
        <div className="b100-shop-scene" aria-hidden="true">
          <span className="b100-sun">☀️</span>
          <span className="b100-awning" />
          <span className="b100-counter" />
          <span className="b100-customer">👧🏻<small>あおい</small></span>
          <span className="b100-bus">🚌</span>
        </div>
        <div className="b100-story-copy">
          <p className="b100-story-label">きょうの おきゃくさん</p>
          <strong>あおいさんの えんそく朝ごはん</strong>
          <p>「{storyText(phase, Boolean(pendingResult))}」</p>
        </div>
        <div className="b100-rank"><small>いまの うでまえ</small><strong>🏅 {rank}</strong></div>
      </section>

      <ol className="b100-stepper" aria-label="パンづくりの3工程">
        {[
          { number: 1, icon: '🥣', label: '材料を はかる' },
          { number: 2, icon: '👐', label: '順番に こねる' },
          { number: 3, icon: '🔥', label: '色を見て やく' },
        ].map((step) => (
          <li
            key={step.number}
            className={step.number === activePhase ? 'is-current' : step.number < activePhase ? 'is-done' : ''}
            aria-current={step.number === activePhase ? 'step' : undefined}
          >
            <span aria-hidden="true">{step.number < activePhase ? '✓' : step.icon}</span>
            <b>{step.number}</b>
            <small>{step.label}</small>
          </li>
        ))}
      </ol>

      <div key={beat} className={'b100-feedback is-' + tone} role="status" aria-live="polite">
        <span aria-hidden="true">{tone === 'success' ? '✨' : tone === 'oops' ? '💡' : '👩‍🍳'}</span>
        <p>{feedback}</p>
        {tone === 'success' && <i className="b100-success-pop" aria-hidden="true">+1</i>}
      </div>

      {phase === 'ingredients' && (
        <div className="b100-stage b100-ingredients-stage">
          <aside className="b100-order-ticket">
            <div className="b100-ticket-top">
              <span aria-hidden="true">📌</span>
              <div><small>ORDER 01</small><h3>おひさまミルクロール 4こ</h3></div>
            </div>
            <p>メモと同じものを、同じ数だけ入れてね。</p>
            <ul>
              <li className={kindCount('flour') >= 2 ? 'is-ready' : ''}><span>🌾 こむぎこ</span><strong>{kindCount('flour')} / 2</strong></li>
              <li className={kindCount('milk') >= 1 ? 'is-ready' : ''}><span>🥛 ミルク</span><strong>{kindCount('milk')} / 1</strong></li>
              <li className={kindCount('yeast') >= 1 ? 'is-ready' : ''}><span>🟡 イースト</span><strong>{kindCount('yeast')} / 1</strong></li>
            </ul>
            <div className="b100-ticket-note"><span aria-hidden="true">✏️</span><b>たまご・チョコ・しおは 入れない</b></div>
          </aside>

          <div className="b100-pantry">
            <div className="b100-section-title">
              <div><small>STEP 1</small><h3>材料を えらんで はかろう</h3></div>
              <p>ドラッグ または タップ</p>
            </div>
            <div className="b100-ingredient-grid">
              {available.map((ingredient, index) => {
                const offset = dragOffsets[ingredient.id] ?? { x: 0, y: 0 }
                const style: CSSProperties = { transform: 'translate3d(' + offset.x + 'px,' + offset.y + 'px,0)', touchAction: 'none' }
                return (
                  <button
                    key={ingredient.id}
                    ref={index === 0 ? firstIngredientRef : undefined}
                    type="button"
                    className={'b100-ingredient ' + (activeIngredient === ingredient.id ? 'is-dragging ' : '') + (rejectedIngredient === ingredient.id ? 'is-rejected' : '')}
                    style={style}
                    aria-label={ingredient.label + '。ボウルへドラッグ、またはタップ。キーボードは Enter'}
                    onPointerDown={(event) => ingredientDown(event, ingredient)}
                    onPointerMove={(event) => ingredientMove(event, ingredient)}
                    onPointerUp={(event) => ingredientUp(event, ingredient)}
                    onPointerCancel={(event) => cancelIngredient(event, ingredient)}
                    onLostPointerCapture={(event) => cancelIngredient(event, ingredient)}
                    onKeyDown={(event) => ingredientKey(event, ingredient)}
                    onClick={(event) => {
                      if (event.detail === 0) chooseIngredient(ingredient)
                    }}
                    onDragStart={(event) => event.preventDefault()}
                    disabled={ingredientsComplete}
                  >
                    <span className="b100-ingredient-art" aria-hidden="true">{ingredient.emoji}</span>
                    <strong>{ingredient.label}</strong>
                    <small>つかむ / タップ</small>
                  </button>
                )
              })}
            </div>
          </div>

          <div
            ref={bowlRef}
            className={'b100-bowl-zone ' + (activeIngredient ? 'is-ready ' : '') + (ingredientsComplete ? 'is-complete' : '')}
            aria-label={'ボウル。正しい材料が ' + accepted.length + 'つ入っています'}
          >
            <p>{activeIngredient ? 'ここで はなす！' : 'ボウルへ はこぼう'}</p>
            <div className="b100-bowl" aria-hidden="true">
              <span className="b100-bowl-mix">{acceptedObjects.map((ingredient) => <i key={ingredient.id}>{ingredient.emoji}</i>)}</span>
            </div>
            <strong>{accepted.length} / {REQUIRED.length}</strong>
          </div>
        </div>
      )}

      {phase === 'knead' && (
        <div className="b100-stage b100-knead-stage">
          <div className="b100-knead-guide">
            <div className="b100-section-title"><div><small>STEP 2</small><h3>光る場所を 順番に こねよう</h3></div></div>
            <div className="b100-next-action">
              <span>{kneadIndex + 1}</span>
              <div><small>つぎの手</small><strong>{activeTarget.label}を {activeTarget.action}！</strong></div>
            </div>
            <p>光る丸まで 指をすべらせるか、丸をタップ。順番どおりで 生地がなめらかになるよ。</p>
            <div className="b100-knead-sequence" aria-label={kneadIndex + '回成功、全部で' + KNEAD_TARGETS.length + '回'}>
              {KNEAD_TARGETS.map((target, index) => (
                <span key={target.label} className={index < kneadIndex ? 'is-done' : index === kneadIndex ? 'is-current' : ''}>
                  {index < kneadIndex ? '✓' : index + 1}
                </span>
              ))}
            </div>
            {kneadMisses >= 2 && <div className="b100-help-note">💡 光る丸を 大きくしたよ。ゆっくりで だいじょうぶ！</div>}
          </div>

          <div className="b100-dough-wrap">
            <button
              ref={kneadBoardRef}
              type="button"
              className={'b100-dough-board ' + (isKneading ? 'is-pressing' : '')}
              aria-label={'生地をこねる台。' + activeTarget.label + 'の光る丸を押す。' + kneadIndex + '回成功。Enter または Space でも進める'}
              onPointerDown={kneadDown}
              onPointerMove={kneadMove}
              onPointerUp={kneadUp}
              onPointerCancel={cancelKnead}
              onLostPointerCapture={cancelKnead}
              onKeyDown={kneadKey}
              onClick={(event) => {
                if (event.detail === 0) kneadWithKeyboard()
              }}
              disabled={kneadIndex >= KNEAD_TARGETS.length}
              style={{ touchAction: 'none' }}
            >
              <span className="b100-flour b100-flour-one" aria-hidden="true" />
              <span className="b100-flour b100-flour-two" aria-hidden="true" />
              <span className="b100-dough" style={{ '--knead-level': kneadIndex } as CSSProperties} aria-hidden="true"><i /><i /><i /></span>
              {KNEAD_TARGETS.slice(0, kneadIndex).map((target) => (
                <span key={target.label} className="b100-knead-stamp" style={{ left: target.x + '%', top: target.y + '%' }} aria-hidden="true">✓</span>
              ))}
              <span
                className="b100-knead-target"
                style={{ left: activeTarget.x + '%', top: activeTarget.y + '%', '--target-size': targetRadius * 2 + '%' } as CSSProperties}
                aria-hidden="true"
              >
                <b>{kneadIndex + 1}</b><small>{activeTarget.action}</small>
              </span>
              <span className="b100-hand" style={{ left: kneadPoint.x + '%', top: kneadPoint.y + '%' }} aria-hidden="true">{isKneading ? '✊' : '👆'}</span>
            </button>
            <button type="button" className="b100-key-helper" onClick={kneadWithKeyboard} disabled={kneadIndex >= KNEAD_TARGETS.length}>
              <span aria-hidden="true">⌨️</span>
              <span><b>キーで こねる</b><small>Enter / SpaceでもOK</small></span>
            </button>
          </div>
        </div>
      )}

      {phase === 'oven' && (
        <div className={'b100-stage b100-oven-stage ' + (pendingResult ? 'is-finished' : '')}>
          <div className="b100-oven-visual" aria-hidden="true">
            <div className="b100-oven-lamp"><i /> HEATING</div>
            <div className={'b100-oven-window is-' + ovenLook}>
              <span className="b100-heat-wave" /><span className="b100-heat-wave second" />
              <div className="b100-tray"><i /><i /><i /><i /></div>
              {pendingResult && <div className="b100-baked-burst">✨ やきたて！ ✨</div>}
            </div>
            <div className="b100-oven-knobs"><i /><i /><i /></div>
          </div>

          <div className="b100-oven-controls">
            <div className="b100-section-title"><div><small>STEP 3</small><h3>いちばん おいしい色で 取りだそう</h3></div></div>
            <div className={'b100-bread-preview is-' + ovenLook}>
              <span aria-hidden="true">🍞</span>
              <div><small>いまの 焼き色</small><strong>{ovenLook === 'pale' ? 'まだ白い' : ovenLook === 'golden' ? 'きつね色！' : 'こんがり'}</strong></div>
            </div>

            <div className="b100-gauge" role="progressbar" aria-label="パンの焼き色" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ovenPosition)}>
              <div className="b100-gauge-labels" aria-hidden="true"><span>まだ</span><span>きつね色</span><span>こんがり</span></div>
              <div className="b100-gauge-track">
                <span className="b100-gauge-zone" style={{ left: ovenBounds.start + '%', width: ovenBounds.end - ovenBounds.start + '%' }}><b>ここ！</b></span>
                <span className="b100-gauge-marker" style={{ left: ovenPosition + '%' }}><i /></span>
              </div>
            </div>

            {ovenMisses > 0 && (
              <div className="b100-help-note">💡 {ovenMisses >= 2 ? 'きつね色の はばを広くしたよ！' : 'メーターは 何度でももどってくるよ。'} あわてなくてOK。</div>
            )}

            <button
              ref={ovenButtonRef}
              type="button"
              className={'b100-oven-button ' + (isHolding ? 'is-holding' : '')}
              onPointerDown={ovenDown}
              onPointerUp={ovenUp}
              onPointerCancel={resetOvenHold}
              onLostPointerCapture={resetOvenHold}
              onKeyDown={ovenKeyDown}
              onKeyUp={ovenKeyUp}
              onClick={(event) => {
                if (event.detail === 0) judgeOven((ovenBounds.start + ovenBounds.end) / 2, true)
              }}
              onBlur={resetOvenHold}
              disabled={Boolean(pendingResult)}
              style={{ touchAction: 'none' }}
            >
              <span className="b100-mitt" aria-hidden="true">🧤</span>
              <span>
                <b>{pendingResult ? 'やきあがり！' : isHolding ? 'そのまま おして！' : 'ミトンを 長おし'}</b>
                <small>{pendingResult ? 'おきゃくさんへ とどけよう' : '黄色が いっぱいで はなす'}</small>
              </span>
              <span className="b100-hold-meter" aria-hidden="true"><i style={{ height: holdProgress + '%' }} /></span>
            </button>
            <button
              type="button"
              className="b100-tap-helper"
              onClick={() => judgeOven((ovenBounds.start + ovenBounds.end) / 2, true)}
              disabled={Boolean(pendingResult)}
            >
              見えにくい・長おしが むずかしいとき：おたすけで 取りだす
            </button>
          </div>

          {pendingResult && (
            <div className="b100-finale" role="status">
              <span aria-hidden="true">🥐</span>
              <div><small>ORDER 01</small><strong>おひさまミルクロール 完成！</strong><p>あおいさんの えんそくに、朝の元気が とどいたよ。</p></div>
              <span aria-hidden="true">🌞</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
