import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { ShiftSimulator } from './ShiftSimulator'
import type { Job, JobId, ShiftResult } from './types'
import { WorkDelivery, WorkPhaseBar, WorkPreparation, type WorkPhase } from './WorkShift'
import './workShift.css'

function MissionArt({ jobId, jobLabel }: { jobId: JobId; jobLabel: string }) {
  const colors: Record<JobId, string> = {
    bakery: '#d9854f', bus: '#3f78a8', nurse: '#4b8c7a',
    waste: '#527b53', farmer: '#718b3c', library: '#76679a',
  }
  const color = colors[jobId]
  return (
    <svg className="mission-art" viewBox="0 0 420 220" role="img" aria-label={`${jobLabel}の仕事道具のイラスト`}>
      <rect width="420" height="220" fill="#f4efe1" />
      <ellipse cx="210" cy="191" rx="150" ry="22" fill="#d9d5c8" />
      {jobId === 'bakery' && <>
        <path d="M88 159c-20-28 6-65 48-51 15-35 69-28 70 10 36-7 61 26 43 51z" fill="#dca75d" stroke="#9b6541" strokeWidth="5" />
        <path d="m130 116 10 18m35-22 6 19m38-7 2 19" stroke="#f5dfad" strokeWidth="6" />
        <path d="M277 59h76v110h-76z" fill="#596b73" /><rect x="292" y="77" width="46" height="45" rx="4" fill="#e9aa56" /><circle cx="326" cy="145" r="5" fill="#e7e0c9" />
      </>}
      {jobId === 'bus' && <>
        <rect x="61" y="75" width="287" height="95" rx="24" fill={color} />
        {[91, 151, 211, 271].map((x) => <rect key={x} x={x} y="93" width="43" height="35" rx="5" fill="#d5edf0" />)}
        <circle cx="120" cy="170" r="25" fill="#344451" /><circle cx="292" cy="170" r="25" fill="#344451" /><circle cx="120" cy="170" r="10" fill="#b7c2be" /><circle cx="292" cy="170" r="10" fill="#b7c2be" />
        <path d="M82 144h245" stroke="#f1d46c" strokeWidth="8" />
      </>}
      {jobId === 'nurse' && <>
        <path d="M161 177v-69a49 49 0 0 1 98 0v69" fill="#f9f7ef" stroke={color} strokeWidth="6" />
        <circle cx="210" cy="64" r="35" fill="#ba7c60" /><path d="M177 61q5-42 36-38 33 3 32 42-31-23-68-4" fill="#39444b" />
        <path d="M195 117h30v30h-30zM183 126h54v12h-54z" fill={color} />
        <path d="M159 170h102" stroke="#53636a" strokeWidth="9" />
      </>}
      {jobId === 'waste' && <>
        <rect x="57" y="92" width="215" height="79" rx="12" fill={color} /><path d="M272 112h69l31 59H272z" fill="#6f946b" /><rect x="294" y="121" width="40" height="25" fill="#cce2df" />
        <circle cx="112" cy="174" r="25" fill="#344451" /><circle cx="315" cy="174" r="25" fill="#344451" /><path d="M85 118h157M113 101v55M164 101v55M215 101v55" stroke="#dce6d4" strokeWidth="5" />
      </>}
      {jobId === 'farmer' && <>
        <path d="M64 165q42-54 84 0t84 0 84 0" fill="none" stroke="#87a15b" strokeWidth="26" />
        {[99, 163, 228, 294].map((x, index) => <g key={x} transform={`translate(${x} ${142 - (index % 2) * 12})`}><path d="M0 20V-12" stroke="#537143" strokeWidth="7" /><path d="M0 0q-23-18-29-4Q-17 14 0 9M0-3q22-19 29-4Q19 9 0 8" fill="#6f9859" /></g>)}
        <circle cx="336" cy="55" r="28" fill="#e5b94f" /><path d="M336 13V2m0 106V97m42-42h12m-108 0h12m72-29 10-10m-78 78-10 10m78 0-10-10m-58-68-10-10" stroke="#e5b94f" strokeWidth="7" />
      </>}
      {jobId === 'library' && <>
        <rect x="62" y="49" width="296" height="132" fill="#765f4c" />
        {[0, 1, 2].map((row) => <g key={row}>{[0, 1, 2, 3, 4, 5].map((column) => <rect key={column} x={78 + column * 43} y={64 + row * 38} width={22 + (column % 2) * 7} height="29" fill={[color, '#c17b55', '#4f8892', '#d5ad55'][column % 4]} />)}</g>)}
        <path d="M72 102h276M72 140h276" stroke="#d5b68a" strokeWidth="6" />
      </>}
    </svg>
  )
}

function Counter({ label, value, onChange, max = 6 }: { label: string; value: number; onChange: (value: number) => void; max?: number }) {
  return (
    <div className="counter-card">
      <span>{label}</span>
      <div className="counter-controls">
        <button type="button" className="counter-button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label}を1つへらす`}>−</button>
        <output aria-live="polite">{value}<small>こ</small></output>
        <button type="button" className="counter-button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label}を1つふやす`}>＋</button>
      </div>
    </div>
  )
}

interface PairingItem { id: string; label: string; answer: string }
interface PairingTarget { id: string; label: string }

function PairingGame({ items, targets, prompt, onComplete }: { items: PairingItem[]; targets: PairingTarget[]; prompt: string; onComplete: () => void }) {
  const [active, setActive] = useState(items[0].id)
  const [matched, setMatched] = useState<Record<string, string>>({})
  const [message, setMessage] = useState(prompt)
  const current = items.find((item) => item.id === active)
  const usedTargets = Object.values(matched)

  const match = (targetId: string) => {
    if (!current) return
    if (current.answer === targetId) {
      const next = { ...matched, [current.id]: targetId }
      setMatched(next)
      setMessage(`「${current.label}」を案内できたよ。`)
      const remaining = items.find((item) => !next[item.id])
      if (remaining) setActive(remaining.id)
      if (Object.keys(next).length === items.length) onComplete()
    } else {
      setMessage('ちがう ばしょかも。ことばを もう一度 見てみよう。')
    }
  }

  return (
    <div className="pairing-game">
      <div className="pairing-column" aria-label="案内する人や物">
        {items.map((item) => (
          <button key={item.id} type="button" className={`pairing-item ${active === item.id ? 'is-active' : ''} ${matched[item.id] ? 'is-done' : ''}`} disabled={Boolean(matched[item.id])} onClick={() => setActive(item.id)}>
            {matched[item.id] && <Icon name="check" />}{item.label}
          </button>
        ))}
      </div>
      <div className="pairing-arrow"><Icon name="arrow" /></div>
      <div className="pairing-column" aria-label="行き先">
        {targets.map((target) => <button key={target.id} type="button" className={`pairing-target ${usedTargets.includes(target.id) ? 'is-done' : ''}`} disabled={usedTargets.includes(target.id)} onClick={() => match(target.id)}>{usedTargets.includes(target.id) && <Icon name="check" />}{target.label}</button>)}
      </div>
      <p className="game-message" aria-live="polite">{message}</p>
    </div>
  )
}

function BakeryMission({ onDone }: { onDone: () => void }) {
  const [loaf, setLoaf] = useState(0)
  const [roll, setRoll] = useState(0)
  const correct = loaf === 3 && roll === 2
  return <>
    <div className="order-ticket"><strong>今日の注文</strong><span>食パン 3こ</span><span>丸パン 2こ</span></div>
    <div className="counter-grid"><Counter label="食パン" value={loaf} onChange={setLoaf} /><Counter label="丸パン" value={roll} onChange={setRoll} /></div>
    <CheckAction correct={correct} onDone={onDone} hint={loaf + roll === 0 ? '＋をタップして、パンを用意しよう。' : '注文の数と、用意した数を見くらべよう。'} />
  </>
}

function FarmerMission({ onDone }: { onDone: () => void }) {
  const [carrot, setCarrot] = useState(0)
  const [tomato, setTomato] = useState(0)
  const correct = carrot === 3 && tomato === 2
  return <>
    <div className="weather-strip"><Icon name="weather" /><span><strong>午後は大雨</strong>　店の注文：にんじん3、トマト2</span></div>
    <div className="counter-grid"><Counter label="にんじん" value={carrot} onChange={setCarrot} /><Counter label="トマト" value={tomato} onChange={setTomato} /></div>
    <CheckAction correct={correct} onDone={onDone} hint="育った分から、注文どおりにかごへ入れよう。" />
  </>
}

function CheckAction({ correct, onDone, hint }: { correct: boolean; onDone: () => void; hint: string }) {
  const [checked, setChecked] = useState(false)
  useEffect(() => { if (!correct) setChecked(false) }, [correct])
  const message = checked && correct ? 'ぴったり！ 数と しゅるいを たしかめられたね。' : checked ? '数が ちがうよ。ちゅうもんと もう一度 見くらべよう。' : hint
  return <div className={`check-action ${checked && correct ? 'is-correct' : ''}`}>
    <p aria-live="polite">{message}</p>
    {!checked || !correct
      ? <button type="button" className="button button-secondary" onClick={() => setChecked(true)}><Icon name="check" />数をたしかめる</button>
      : <button type="button" className="button button-primary" onClick={onDone}>作業が できた！ つぎへ<Icon name="arrow" /></button>}
  </div>
}

function BusMission({ onDone }: { onDone: () => void }) {
  const stops = [
    { id: 'school', label: '学校', note: '8時までに行きたい' },
    { id: 'hospital', label: '病院', note: '次に予約がある' },
    { id: 'library', label: '図書館', note: '午前中に行きたい' },
  ]
  const [route, setRoute] = useState<string[]>([])
  const [message, setMessage] = useState('時こくの早い人から、安全な道で回ろう。')
  const check = () => {
    if (route.join(',') === 'school,hospital,library') onDone()
    else setMessage('時こくをもう一度見よう。やり直して大丈夫。')
  }
  return <div className="route-game">
    <div className="route-board"><strong>出発</strong>{route.map((id, index) => <span key={id}>{index + 1}<b>{stops.find((stop) => stop.id === id)?.label}</b></span>)}</div>
    <div className="route-options">{stops.map((stop) => <button key={stop.id} type="button" disabled={route.includes(stop.id)} onClick={() => setRoute([...route, stop.id])}><Icon name="map" /><strong>{stop.label}</strong><small>{stop.note}</small></button>)}</div>
    <p className="game-message" aria-live="polite">{message}</p>
    <div className="action-row"><button type="button" className="button button-quiet" onClick={() => { setRoute([]); setMessage('何度でもためせるよ。') }}><Icon name="reset" />やり直す</button><button type="button" className="button button-primary" disabled={route.length !== 3} onClick={check}>この道で出発<Icon name="arrow" /></button></div>
  </div>
}

function MissionGame({ jobId, onDone }: { jobId: JobId; onDone: () => void }) {
  const [completed, setCompleted] = useState(false)
  const done = () => setCompleted(true)
  if (completed) return <div className="mission-success"><div className="success-mark"><Icon name="check" /></div><h3>作業が できたよ</h3><p>つぎは、この仕事が だれに とどくか 見てみよう。</p><button type="button" className="button button-primary" onClick={onDone}>つぎへ：とどける<Icon name="arrow" /></button></div>

  if (jobId === 'bakery') return <BakeryMission onDone={done} />
  if (jobId === 'bus') return <BusMission onDone={done} />
  if (jobId === 'farmer') return <FarmerMission onDone={done} />
  if (jobId === 'nurse') return <PairingGame onComplete={done} prompt="一人ずつ話を聞いて、合う場所をタップしよう。" items={[
    { id: 'a', label: 'うけつけが まだの人', answer: 'reception' },
    { id: 'b', label: '歩くのがつらい人', answer: 'rest' },
    { id: 'c', label: 'くすりの うけとりを聞く人', answer: 'medicine' },
  ]} targets={[{ id: 'rest', label: 'いすで休める ばしょ' }, { id: 'reception', label: 'うけつけ' }, { id: 'medicine', label: 'くすりの あんない' }]} />
  if (jobId === 'waste') return <PairingGame onComplete={done} prompt="ごみを1つえらび、合う分ける ばしょをタップしよう。" items={[
    { id: 'a', label: 'おかしの紙ぶくろ', answer: 'burn' },
    { id: 'b', label: 'あきかん', answer: 'resource' },
    { id: 'c', label: 'われた電池', answer: 'danger' },
  ]} targets={[{ id: 'resource', label: 'しげん（また つかう）' }, { id: 'danger', label: 'あぶない ごみ' }, { id: 'burn', label: 'もやす ごみ' }]} />
  return <PairingGame onComplete={done} prompt="さがす人を1人えらび、本だなをタップしよう。" items={[
    { id: 'a', label: '星を調べたい', answer: 'science' },
    { id: 'b', label: 'むかし話を読みたい', answer: 'story' },
    { id: 'c', label: '料理を作りたい', answer: 'life' },
  ]} targets={[{ id: 'story', label: 'ものがたり' }, { id: 'science', label: 'しぜん・かがく' }, { id: 'life', label: 'くらし・りょうり' }]} />
}

function LegacyMission({ job, onComplete }: { job: Job; onComplete: () => void }) {
  const tools = useMemo(() => job.tools.join('・'), [job.tools])
  const [phase, setPhase] = useState<WorkPhase>('prepare')
  const consoleRef = useRef<HTMLElement>(null)
  const previousPhase = useRef<WorkPhase>(phase)
  useEffect(() => {
    if (previousPhase.current !== phase) {
      consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      consoleRef.current?.focus({ preventScroll: true })
      previousPhase.current = phase
    }
  }, [phase])
  return (
    <div className="mission-layout">
      <aside className="mission-brief">
        <span className="eyebrow">今日の仕事</span>
        <h2>{job.name}</h2>
        <p>{job.mission}</p>
        <MissionArt jobId={job.id} jobLabel={job.shortName} />
        <div className="tool-note"><Icon name="tools" /><span><strong>使う道具</strong>{tools}</span></div>
      </aside>
      <section ref={consoleRef} tabIndex={-1} className="mission-console" aria-label={`${job.name}のミッション`}>
        <WorkPhaseBar phase={phase} />
        {phase === 'prepare' && <WorkPreparation job={job} onReady={() => setPhase('work')} />}
        {phase === 'work' && <>
          <div className="console-heading"><span>しごと ミッション</span><strong>じゅんびした 道具で やってみよう</strong></div>
          <MissionGame key={job.id} jobId={job.id} onDone={() => setPhase('deliver')} />
        </>}
        {phase === 'deliver' && <WorkDelivery job={job} onComplete={onComplete} />}
      </section>
    </div>
  )
}

export function Mission({ job, week, day, skillLevel, demandBonus, onComplete }: { job: Job; week: number; day: number; skillLevel: number; demandBonus: number; onComplete: (result: ShiftResult) => void }) {
  return <ShiftSimulator job={job} week={week} day={day} skillLevel={skillLevel} demandBonus={demandBonus} onComplete={onComplete} />
}
