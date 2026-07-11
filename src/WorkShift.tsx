import { useState } from 'react'
import { Icon } from './Icon'
import type { Job } from './types'
import { workRoutines } from './workData'

export type WorkPhase = 'prepare' | 'work' | 'deliver'

export function WorkPhaseBar({ phase }: { phase: WorkPhase }) {
  const current = phase === 'prepare' ? 0 : phase === 'work' ? 1 : 2
  return <ol className="work-phase-bar" aria-label="仕事の3つの段階">
    {['じゅんび', 'しごと', 'とどける'].map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} className={index < current ? 'is-done' : index === current ? 'is-current' : ''}><span>{index < current ? <Icon name="check" /> : index + 1}</span><b>{label}</b></li>)}
  </ol>
}

export function WorkPreparation({ job, onReady }: { job: Job; onReady: () => void }) {
  const routine = workRoutines[job.id]
  const [checked, setChecked] = useState<string[]>([])
  const [message, setMessage] = useState('3つの ばしょを タップして、じゅんびしよう。')
  const toggle = (id: string, label: string, why: string) => {
    if (checked.includes(id)) return
    setChecked((current) => [...current, id])
    setMessage(`${label}。${why}。`)
  }
  const ready = checked.length === routine.checks.length
  return <section className="work-preparation">
    <div className="work-scene-heading"><span>しごとの はじまり</span><h3>{routine.preparationTitle}</h3><p>プロは、すぐに はじめず じゅんびを します。</p></div>
    <div className="work-check-scene" style={{ '--work-color': job.color } as React.CSSProperties}>
      <div className="work-scene-person" aria-hidden="true"><span /><i /></div>
      {routine.checks.map((check, index) => <button type="button" key={check.id} className={`work-hotspot hotspot-${index + 1} ${checked.includes(check.id) ? 'is-checked' : ''}`} onClick={() => toggle(check.id, check.label, check.why)}>
        <span>{checked.includes(check.id) ? <Icon name="check" /> : <Icon name={check.icon} />}</span><strong>{check.label}</strong><small>{checked.includes(check.id) ? check.why : 'タップ'}</small>
      </button>)}
    </div>
    <div className="work-message" aria-live="polite"><b>{checked.length} / {routine.checks.length}</b><span>{message}</span></div>
    <button type="button" className="button button-primary button-large" disabled={!ready} onClick={onReady}>{ready ? 'じゅんび OK！ しごとを はじめる' : `あと ${routine.checks.length - checked.length}こ じゅんび`}<Icon name="arrow" /></button>
  </section>
}

export function WorkDelivery({ job, onComplete }: { job: Job; onComplete: () => void }) {
  const routine = workRoutines[job.id]
  const [delivered, setDelivered] = useState(false)
  return <section className="work-delivery">
    <div className="work-scene-heading"><span>しごとの しあげ</span><h3>だれに とどいた？</h3><p>しごとは、だれかの くらしに つながります。</p></div>
    <div className={`value-route ${delivered ? 'is-delivered' : ''}`}>
      {routine.process.map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong>{index < 2 && <Icon name="arrow" />}</div>)}
    </div>
    <div className="delivery-scene" style={{ '--work-color': job.color } as React.CSSProperties}>
      <div className="delivery-worker"><Icon name="briefcase" /><span>{job.shortName}</span></div>
      <div className="delivery-path"><span className="delivery-package"><Icon name={job.id === 'bakery' ? 'shop' : job.id === 'bus' ? 'bus' : job.id === 'farmer' ? 'sprout' : job.id === 'library' ? 'book' : job.id === 'waste' ? 'waste' : 'heart'} /></span></div>
      <div className="delivery-person"><Icon name="community" /><span>{routine.customer}</span></div>
    </div>
    {!delivered ? <button type="button" className="button button-primary button-large" onClick={() => setDelivered(true)}>{routine.deliverAction}<Icon name="arrow" /></button> : <div className="value-created"><Icon name="check" /><div><small>この しごとで うまれたもの</small><strong>{routine.value}</strong></div></div>}
    {delivered && <button type="button" className="button button-primary button-large" onClick={onComplete}>しごとを おえる<Icon name="coin" /></button>}
  </section>
}
