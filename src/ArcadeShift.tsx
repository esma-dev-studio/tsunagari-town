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
import './arcadePremium.css'

type ArcadePhase = 'ready' | 'countdown' | 'playing' | 'result'

const jobCopy = {
  bakery: {
    title: 'まちの朝ごはんを まにあわせよう！',
    mission: 'お客さんの注文を見て、材料・こね方・焼き色を自分で決めよう。',
    controls: ['材料を ぴったり選ぶ', '光る順に しっかりこねる', '最高の焼き色で 取り出す'],
    icon: '🥐',
    requester: '朝ごはんを待つ まちの人',
    request: '「ふわふわのパンを、時間までにお願い！」',
    skill: 'パン職人の 3つのわざ',
    goal: '注文どおり・ていねい・おいしい',
    story: ['🥖', '🥐', '🍞'],
    impact: 'パンの香りで、まちの朝が動き出す',
  },
  bus: {
    title: 'みんなを あんぜんに とどけよう！',
    mission: '道路と乗客をよく見て、安全な車線を選び、やさしく停車しよう。',
    controls: ['車線をえらんで 危険を回避', '乗客の目的地を おぼえる', '停車位置で やさしくブレーキ'],
    icon: '🚌',
    requester: '学校や病院へ向かう 乗客',
    request: '「あんぜんに、時間どおり届けてね！」',
    skill: '運転士の 3つのやくそく',
    goal: '安全確認・道選び・やさしい停車',
    story: ['🚏', '🚌', '🏫'],
    impact: 'バスが、人と大切な場所をつなぐ',
  },
  waste: {
    title: 'ごみを分けて まちをピカピカに！',
    mission: '町を歩いてごみを見つけ、しるしや材料を見て正しく分けよう。',
    controls: ['町をすすんで ごみを発見', 'なぜ？を考えて 正しく分別', '回収車を 安全に動かす'],
    icon: '♻️',
    requester: '公園で遊ぶ 子どもたち',
    request: '「また遊べる、きれいな公園にして！」',
    skill: 'まちを守る 3つのわざ',
    goal: '発見・分別・安全な回収',
    story: ['🌳', '♻️', '✨'],
    impact: 'きれいになった場所に、人と自然が戻る',
  },
} as const

function isBetterPerformance(next: ArcadePerformance, current: ArcadePerformance | null) {
  if (!current) return true
  if (next.stars !== current.stars) return next.stars > current.stars
  if (next.score !== current.score) return next.score > current.score
  if (next.mistakes !== current.mistakes) return next.mistakes < current.mistakes
  return next.seconds < current.seconds
}

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
  const [bestPerformance, setBestPerformance] = useState<ArcadePerformance | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const playingRegionRef = useRef<HTMLDivElement | null>(null)
  const resultRegionRef = useRef<HTMLElement | null>(null)
  const completionLockedRef = useRef(false)

  useEffect(() => {
    clearShiftProgress(week, day, job.id)
    setPhase('ready')
    setCountdown(3)
    setPerformance(null)
    setBestPerformance(null)
    setAttemptCount(0)
    completionLockedRef.current = false
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [day, job.id, week])

  useEffect(() => {
    if (phase !== 'countdown') return
    let launchTimer: number | undefined
    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          launchTimer = window.setTimeout(() => setPhase('playing'), 350)
          return 0
        }
        return current - 1
      })
    }, 650)
    return () => {
      window.clearInterval(timer)
      if (launchTimer !== undefined) window.clearTimeout(launchTimer)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    completionLockedRef.current = false
    const frame = window.requestAnimationFrame(() => {
      const region = playingRegionRef.current
      if (!region) return
      region.scrollIntoView({ block: 'start', behavior: 'auto' })
      region.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => {
    if (phase !== 'result') return
    const frame = window.requestAnimationFrame(() => {
      resultRegionRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase])

  const paidPerformance = bestPerformance ?? performance
  const retryCount = Math.max(0, attemptCount - 1)
  const canRetry = attemptCount < 2

  const result = useMemo<ShiftResult | null>(() => {
    if (!paidPerformance) return null
    const bonus = paidPerformance.stars === 3 ? 2 : paidPerformance.stars === 2 ? 1 : 0
    const grossPay = job.reward + bonus + demandBonus
    return {
      jobId: job.id,
      basePay: job.reward,
      bonus,
      demandBonus,
      grossPay,
      tax: job.shared,
      quality: paidPerformance.stars,
      mistakes: paidPerformance.mistakes,
      timeMinutes: 270 + Math.min(30, paidPerformance.mistakes * 5) + retryCount * 15,
      energyUsed: Math.min(4, (paidPerformance.stars === 1 ? 3 : 2) + retryCount),
    }
  }, [demandBonus, job, paidPerformance, retryCount])

  const finishGame = (nextPerformance: ArcadePerformance) => {
    if (completionLockedRef.current) return
    completionLockedRef.current = true
    setPerformance(nextPerformance)
    setBestPerformance((current) => isBetterPerformance(nextPerformance, current) ? nextPerformance : current)
    setAttemptCount((current) => Math.min(2, current + 1))
    setPhase('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const start = () => {
    setCountdown(3)
    setPhase('countdown')
  }

  const retry = () => {
    if (!canRetry) return
    setCountdown(3)
    setPhase('countdown')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const effectiveSkillLevel = Math.min(3, Math.max(1, skillLevel) + (energyAssist ? 1 : 0))
  const game = job.id === 'bus'
    ? <BusGame skillLevel={effectiveSkillLevel} onComplete={finishGame} />
    : job.id === 'waste'
      ? <WasteGame skillLevel={effectiveSkillLevel} onComplete={finishGame} />
      : <BakeryGame skillLevel={effectiveSkillLevel} onComplete={finishGame} />

  const latestWasBest = performance !== null && performance === bestPerformance
  const achievementLabels = paidPerformance ? [
    paidPerformance.mistakes === 0 ? '✨ ノーミス' : '🔧 自分で なおせた',
    paidPerformance.stars === 3 ? '🏆 プロの しごと' : '🌱 さいごまで できた',
    '⏱️ ' + paidPerformance.seconds + '秒で かんりょう',
  ] : []

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
            <div className="arcade-scene-story">
              <small>{copy.requester}からの いらい</small>
              <strong>{copy.request}</strong>
            </div>
            <div className="arcade-scene-props">
              {copy.story.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="arcade-worker"><i className="head" /><i className="body" /><i className="arm" /><i className="leg left" /><i className="leg right" /></div>
            <div className="arcade-customer"><span>{copy.story[0]} おねがい！</span><i className="head" /><i className="body" /></div>
          </div>
          <div className="arcade-ready-copy">
            <span className="arcade-kid-label">DAY {day}・きょうの しごと</span>
            <h1>{copy.title}</h1>
            <p>{copy.mission}</p>
            <div className="arcade-request-card">
              <Icon name="community" />
              <div>
                <small>{copy.requester}からの おねがい</small>
                <strong>{copy.request}</strong>
              </div>
            </div>
            <div className="arcade-skill-heading">
              <span>{copy.skill}</span>
              <strong>{copy.goal}</strong>
            </div>
            <ol className="arcade-control-preview">
              {copy.controls.map((control, index) => <li key={control}><span>{index + 1}</span><strong>{control}</strong></li>)}
            </ol>
            <div className="arcade-pay-promise"><Icon name="coin" /><span><strong>さいごまで働けば {job.reward}コイン</strong><small>うでまえが上がると ボーナスも 0〜2コイン！</small></span></div>
            <button type="button" className="arcade-start-button" onClick={start}><Icon name="play" /><span>しごと スタート！</span></button>
          </div>
        </section>
      )}

      {phase === 'countdown' && (
        <section className="arcade-countdown" aria-live="assertive">
          <div><span>{countdown > 0 ? countdown : 'GO!'}</span></div>
          <h1>{countdown > 0 ? (attemptCount > 0 ? 'れんしゅうの じゅんび！' : 'じゅんびは いい？') : (attemptCount > 0 ? 'れんしゅう かいし！' : 'しごと かいし！')}</h1>
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

      {phase === 'result' && performance && paidPerformance && result && (
        <section
          ref={resultRegionRef}
          className="arcade-result"
          role="region"
          aria-live="polite"
          aria-labelledby="arcade-result-heading"
          tabIndex={-1}
        >
          <div className="arcade-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
          <div className="arcade-result-attempt">
            <span>チャレンジ {attemptCount}回目</span>
            {latestWasBest && <strong>🏅 ベストきろく！</strong>}
          </div>
          <div className="arcade-result-hero">
            <span className="arcade-kid-label">しごと かんりょう！</span>
            <div className="arcade-result-stars" aria-label={`ベストきろくは 星 ${paidPerformance.stars}こ`}>
              {[1, 2, 3].map((star) => <span key={star} aria-hidden="true" className={star <= paidPerformance.stars ? 'is-earned' : ''}>★</span>)}
            </div>
            <h1 id="arcade-result-heading">{paidPerformance.title}</h1>
            <p>{paidPerformance.detail}</p>
            <div className="arcade-achievements" aria-label="ベストきろくで できたこと">
              {achievementLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
            {attemptCount > 1 && bestPerformance && (
              <div className="arcade-attempt-compare" aria-label="2回のきろくを くらべる">
                <div>
                  <small>2回目の れんしゅう</small>
                  <strong aria-label={`星 ${performance.stars}こ、${performance.score}ポイント`}><span aria-hidden="true">{'★'.repeat(performance.stars)}</span> {performance.score.toLocaleString()}点</strong>
                </div>
                <span aria-hidden="true">→</span>
                <div className="is-best">
                  <small>おきゅうりょうに使う ベスト</small>
                  <strong aria-label={`星 ${bestPerformance.stars}こ、${bestPerformance.score}ポイント`}><span aria-hidden="true">{'★'.repeat(bestPerformance.stars)}</span> {bestPerformance.score.toLocaleString()}点</strong>
                </div>
              </div>
            )}
          </div>

          <div className="arcade-result-grid">
            <section className="arcade-score-card"><small>ベストきろくの ポイント</small><strong>{paidPerformance.score.toLocaleString()}</strong><span>{paidPerformance.mistakes === 0 ? 'やりなおし なし！' : `なおせた かいすう ${paidPerformance.mistakes}`}</span></section>
            <section className="arcade-impact-card"><span aria-hidden="true">{copy.story[2]}</span><div><small>あなたの しごとで まちが かわる</small><strong>{copy.impact}</strong><p>{scenario.townValue}</p></div></section>
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
            <p className="arcade-retry-guide"><Icon name="info" />{canRetry ? 'あと1回だけ れんしゅうできるよ。15分と げんき1こを使います。おきゅうりょうは ベストきろくで決まるよ。' : 'れんしゅうは おしまい。2回のうちの ベストきろくで おきゅうりょうへ進もう！'}</p>
            <div className="arcade-result-buttons">
              {canRetry && <button type="button" className="arcade-retry-button" onClick={retry}><Icon name="reset" /><span>もう1回だけ れんしゅう</span></button>}
              <button type="button" className="arcade-start-button" onClick={() => onComplete(result)}><Icon name="coin" /><span>ベストの おきゅうりょうへ</span></button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
