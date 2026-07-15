import { useEffect, useMemo, useRef, useState } from 'react'
import { BakeryGame } from './arcade/BakeryGame'
import { BusGame } from './arcade/BusGame'
import { WasteGame } from './arcade/WasteGame'
import type { ArcadePerformance } from './arcade/types'
import { Icon } from './Icon'
import { getShiftScenario } from './shiftData'
import { clearShiftProgress } from './shiftProgress'
import type { Job, ShiftResult } from './types'
import './arcadeBus.css'
import './arcadeGames.css'
import './arcadePolish.css'
import './arcadeShift.css'
import './arcadeWaste.css'
import './missionFocus.css'

type ArcadePhase = 'ready' | 'countdown' | 'playing' | 'result'

const jobCopy = {
  bakery: {
    title: 'まちの朝ごはんを まにあわせよう！',
    mission: '材料をはかって、こねて、いちばんおいしい時にパンを出そう。',
    controls: ['ドラッグして はかる', 'ぐるぐる こねる', 'いい色で 長おし'],
    icon: '🥐',
  },
  bus: {
    title: 'みんなを あんぜんに とどけよう！',
    mission: 'バスを動かしてコーンをよけ、バスていの前でゆっくり止まろう。',
    controls: ['左右に ドラッグ', 'コーンを よける', 'ブレーキを 長おし'],
    icon: '🚌',
  },
  waste: {
    title: 'ごみを分けて まちをピカピカに！',
    mission: '落ちているものを正しい箱へ運び、しゅうしゅう車にのせよう。',
    controls: ['ごみを ドラッグ', 'しゅるいを 見分ける', 'レバーを 長おし'],
    icon: '♻️',
  },
} as const

export function ArcadeShift({
  job,
  week,
  day,
  skillLevel = 1,
  energyAssist = false,
  demandBonus = 0,
  onComplete,
}: {
  job: Job
  week: number
  day: number
  skillLevel?: number
  energyAssist?: boolean
  demandBonus?: number
  onComplete: (result: ShiftResult) => void
}) {
  const scenario = getShiftScenario(job)
  const copy = jobCopy[job.id as keyof typeof jobCopy] ?? jobCopy.bakery
  const [phase, setPhase] = useState<ArcadePhase>('ready')
  const [countdown, setCountdown] = useState(3)
  const [performance, setPerformance] = useState<ArcadePerformance | null>(null)
  const playingRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    clearShiftProgress(week, day, job.id)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [day, job.id, week])

  useEffect(() => {
    if (phase !== 'countdown') return
    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          window.setTimeout(() => setPhase('playing'), 350)
          return 0
        }
        return current - 1
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    const frame = window.requestAnimationFrame(() => {
      const region = playingRegionRef.current
      if (!region) return
      region.scrollIntoView({ block: 'start', behavior: 'auto' })
      region.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase])

  const result = useMemo<ShiftResult | null>(() => {
    if (!performance) return null
    const bonus = performance.stars === 3 ? 2 : performance.stars === 2 ? 1 : 0
    const grossPay = job.reward + bonus + demandBonus
    return {
      jobId: job.id,
      basePay: job.reward,
      bonus,
      demandBonus,
      grossPay,
      tax: job.shared,
      quality: performance.stars,
      mistakes: performance.mistakes,
      timeMinutes: 270 + Math.min(30, performance.mistakes * 5),
      energyUsed: performance.stars === 1 ? 3 : 2,
    }
  }, [demandBonus, job, performance])

  const finishGame = (nextPerformance: ArcadePerformance) => {
    setPerformance(nextPerformance)
    setPhase('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const start = () => {
    setCountdown(3)
    setPhase('countdown')
  }

  const effectiveSkillLevel = Math.min(3, Math.max(1, skillLevel) + (energyAssist ? 1 : 0))
  const game = job.id === 'bus'
    ? <BusGame skillLevel={effectiveSkillLevel} onComplete={finishGame} />
    : job.id === 'waste'
      ? <WasteGame skillLevel={effectiveSkillLevel} onComplete={finishGame} />
      : <BakeryGame skillLevel={effectiveSkillLevel} onComplete={finishGame} />

  return (
    <main
      className={`arcade-shift arcade-${job.id} phase-${phase}`}
      style={{ '--arcade-color': job.color } as React.CSSProperties}
    >
      <header className="arcade-job-bar">
        <div className="arcade-job-sign"><span aria-hidden="true">{copy.icon}</span><div><small>{scenario.workplace}</small><strong>{job.shortName}の シフト</strong></div></div>
        <div className="arcade-shift-status"><span>レベル <b>{skillLevel}</b></span>{energyAssist && <span className="arcade-energy-assist">ごはんパワー <b>+1</b></span>}<span>きほんきゅう <b>{job.reward}コイン</b></span></div>
      </header>

      {phase === 'ready' && (
        <section className="arcade-ready">
          <div className="arcade-ready-scene" aria-hidden="true">
            <div className="arcade-sky"><i /><i /><i /></div>
            <div className="arcade-building"><span>{copy.icon}</span><strong>{scenario.workplace}</strong><i /></div>
            <div className="arcade-worker"><i className="head" /><i className="body" /><i className="arm" /><i className="leg left" /><i className="leg right" /></div>
            <div className="arcade-customer"><span>たすけて！</span><i className="head" /><i className="body" /></div>
          </div>
          <div className="arcade-ready-copy">
            <span className="arcade-kid-label">きょうの ミッション</span>
            <h1>{copy.title}</h1>
            <p>{copy.mission}</p>
            <ol className="arcade-control-preview">
              {copy.controls.map((control, index) => <li key={control}><span>{index + 1}</span><strong>{control}</strong></li>)}
            </ol>
            <div className="arcade-pay-promise"><Icon name="coin" /><span><strong>まちがえても {job.reward}コインは もらえるよ</strong><small>うでまえで ボーナスが 0〜2コイン つく！</small></span></div>
            <button type="button" className="arcade-start-button" onClick={start}><Icon name="play" /><span>しごと スタート！</span></button>
          </div>
        </section>
      )}

      {phase === 'countdown' && (
        <section className="arcade-countdown" aria-live="assertive">
          <div><span>{countdown > 0 ? countdown : 'GO!'}</span></div>
          <h1>{countdown > 0 ? 'じゅんびは いい？' : 'しごと かいし！'}</h1>
        </section>
      )}

      {phase === 'playing' && (
        <div
          ref={playingRegionRef}
          className="arcade-playing-focus"
          role="region"
          aria-label={`${job.shortName}の しごとを かいししました`}
          tabIndex={-1}
        >
          {game}
        </div>
      )}

      {phase === 'result' && performance && result && (
        <section className="arcade-result">
          <div className="arcade-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
          <div className="arcade-result-hero">
            <span className="arcade-kid-label">シフト かんりょう！</span>
            <div className="arcade-result-stars" aria-label={`星 ${performance.stars}こ`}>
              {[1, 2, 3].map((star) => <span key={star} className={star <= performance.stars ? 'is-earned' : ''}>★</span>)}
            </div>
            <h1>{performance.title}</h1>
            <p>{performance.detail}</p>
          </div>

          <div className="arcade-result-grid">
            <section className="arcade-score-card"><small>この仕事の ポイント</small><strong>{performance.score.toLocaleString()}</strong><span>{performance.mistakes === 0 ? 'やりなおし なし！' : `なおせた かいすう ${performance.mistakes}`}</span></section>
            <section className="arcade-impact-card"><span aria-hidden="true">🏘️</span><div><small>しごとで まちが かわる</small><strong>{job.townEffect}</strong><p>{scenario.townValue}</p></div></section>
          </div>

          <section className="arcade-pay-sheet" aria-label="今日の給料">
            <div className="arcade-pay-title"><Icon name="briefcase" /><span><small>つながりタウン</small><strong>しごとで うまれた お金</strong></span></div>
            <div><span>きほんきゅう</span><strong>{result.basePay} コイン</strong></div>
            <div className={result.bonus > 0 ? 'is-plus' : ''}><span>うでまえ ボーナス</span><strong>＋ {result.bonus} コイン</strong></div>
            {result.demandBonus > 0 && <div className="is-plus"><span>まちの「たすけて」ボーナス</span><strong>＋ {result.demandBonus} コイン</strong></div>}
            <div className="arcade-pay-total"><span>きょうの おきゅうりょう</span><strong>{result.grossPay} コイン</strong></div>
          </section>

          <div className="arcade-result-actions">
            <p><Icon name="info" />つぎは おきゅうりょうミニゲーム。コインを「ぜいきん」と「おさいふ」に 分けよう！</p>
            <button type="button" className="arcade-start-button" onClick={() => onComplete(result)}><Icon name="coin" /><span>おきゅうりょうを うけとる</span></button>
          </div>
        </section>
      )}
    </main>
  )
}
