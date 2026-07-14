import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { getShiftScenario } from './shiftData'
import { clearShiftProgress, readShiftProgress, saveShiftProgress } from './shiftProgress'
import type { Job, ShiftResult } from './types'
import './shiftSimulator.css'

type ShiftPhase = 'arrival' | 'work' | 'handoff' | 'clockout'

export function ShiftSimulator({ job, week, day, skillLevel = 1, demandBonus = 0, onComplete }: { job: Job; week: number; day: number; skillLevel?: number; demandBonus?: number; onComplete: (result: ShiftResult) => void }) {
  const scenario = getShiftScenario(job)
  const [saved] = useState(() => readShiftProgress(week, day, job.id))
  const restoredOrderIndex = Math.min(saved?.orderIndex ?? 0, Math.max(0, scenario.orders.length - 1))
  const restoredTaskIndex = Math.min(saved?.taskIndex ?? 0, Math.max(0, (scenario.orders[restoredOrderIndex]?.tasks.length ?? 1) - 1))
  const restoredTask = scenario.orders[restoredOrderIndex]?.tasks[restoredTaskIndex]
  const restoredStation = saved?.activeStation && scenario.stations.some((station) => station.id === saved.activeStation) ? saved.activeStation : null
  const [phase, setPhase] = useState<ShiftPhase>(saved?.phase ?? 'arrival')
  const [uniformOn, setUniformOn] = useState(saved?.uniformOn ?? false)
  const [orderIndex, setOrderIndex] = useState(restoredOrderIndex)
  const [taskIndex, setTaskIndex] = useState(restoredTaskIndex)
  const [effortDone, setEffortDone] = useState(Math.min(saved?.effortDone ?? 0, restoredTask?.effort ?? 0))
  const [activeStation, setActiveStation] = useState<string | null>(restoredStation)
  const [delivered, setDelivered] = useState(saved?.delivered ?? false)
  const [message, setMessage] = useState(saved?.message ?? 'まず ロッカーを あけて、しごとの ふくに きがえよう。')
  const [decisionId, setDecisionId] = useState<string | null>(saved?.decisionId ?? null)
  const [mistakes, setMistakes] = useState(saved?.mistakes ?? 0)
  const [finishing, setFinishing] = useState(false)
  const stageRef = useRef<HTMLElement>(null)
  const workFloorRef = useRef<HTMLElement>(null)
  const actionPanelRef = useRef<HTMLElement>(null)

  const order = scenario.orders[orderIndex]
  const task = order?.tasks[taskIndex]
  const expectedStation = scenario.stations.find((station) => station.id === task?.stationId)
  const taskReady = Boolean(task && effortDone >= task.effort)
  const progressStep = phase === 'arrival' ? (uniformOn ? 1 : 0) : phase === 'clockout' ? 4 : orderIndex + 2
  const decisionReady = Boolean(!task?.decision || task.decision.options.some((option) => option.id === decisionId && option.correct))
  const shiftQuality = (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1) as 1 | 2 | 3
  const qualityBonus = shiftQuality === 3 ? 2 : shiftQuality === 2 ? 1 : 0
  const grossPay = job.reward + qualityBonus + demandBonus

  useEffect(() => {
    const stage = stageRef.current
    stage?.focus({ preventScroll: true })
    stage?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [phase, orderIndex])

  useEffect(() => {
    saveShiftProgress(week, day, job.id, {
      phase, uniformOn, orderIndex, taskIndex, effortDone, activeStation, delivered, message, decisionId, mistakes,
    })
  }, [activeStation, day, decisionId, delivered, effortDone, job.id, message, mistakes, orderIndex, phase, taskIndex, uniformOn, week])

  useEffect(() => {
    if (phase !== 'work' || !window.matchMedia('(max-width: 980px)').matches) return
    workFloorRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [phase, taskIndex])

  useEffect(() => {
    if (!activeStation || phase !== 'work' || !window.matchMedia('(max-width: 980px)').matches) return
    actionPanelRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    })
  }, [activeStation, phase])

  const goToStation = (stationId: string) => {
    if (!task || !expectedStation) return
    if (stationId !== task.stationId) {
      setMessage(`いまは「${expectedStation.label}」へ 行こう。いらいカードを 見てみよう。`)
      setMistakes((current) => current + 1)
      return
    }
    setActiveStation(stationId)
    setMessage(task.instruction)
  }

  const chooseDecision = (optionId: string) => {
    const option = task?.decision?.options.find((item) => item.id === optionId)
    if (!option) return
    if (!option.correct) {
      setDecisionId(null)
      setMistakes((current) => current + 1)
      setMessage(`${option.feedback} ヒント：${task?.decision?.hint ?? ''}`)
      return
    }
    setDecisionId(option.id)
    setMessage(option.feedback)
  }

  const workOnce = () => {
    if (!task || activeStation !== task.stationId || taskReady || !decisionReady) return
    const next = Math.min(task.effort, effortDone + 1)
    setEffortDone(next)
    setMessage(next === task.effort ? task.result : `${task.action}。あと ${task.effort - next}${task.unit}。`)
  }

  const advanceTask = () => {
    if (!taskReady || !order) return
    if (taskIndex < order.tasks.length - 1) {
      const nextTask = order.tasks[taskIndex + 1]
      const nextStation = scenario.stations.find((station) => station.id === nextTask.stationId)
      setTaskIndex((current) => current + 1)
      setEffortDone(0)
      setActiveStation(null)
      setDecisionId(null)
      setMessage(`つぎは「${nextStation?.label ?? 'つぎの ばしょ'}」へ 行こう。`)
      return
    }
    setDecisionId(null)
    setDelivered(false)
    setPhase('handoff')
    setMessage(`${order.ticket}が できた。${order.customer}へ 手わたそう。`)
  }

  const nextOrder = () => {
    if (orderIndex < scenario.orders.length - 1) {
      setOrderIndex((current) => current + 1)
      setTaskIndex(0)
      setEffortDone(0)
      setActiveStation(null)
      setDelivered(false)
      setPhase('work')
      setMessage('つぎの おきゃくさんが 来たよ。いらいカードを 見よう。')
      setDecisionId(null)
      return
    }
    setPhase('clockout')
    setMessage('きょうの いらいは ぜんぶ できた。タイムカードを おそう。')
  }

  const finishShift = () => {
    if (finishing) return
    setFinishing(true)
    clearShiftProgress(week, day, job.id)
    onComplete({
      jobId: job.id,
      basePay: job.reward,
      bonus: qualityBonus,
      demandBonus,
      grossPay,
      tax: job.shared,
      quality: shiftQuality,
      mistakes,
      timeMinutes: 300 + mistakes * 15,
      energyUsed: 2,
    })
  }

  return (
    <main className={`shift-simulator shift-${job.id}`} style={{ '--shift-color': scenario.uniformColor } as React.CSSProperties}>
      <section className="shift-topbar" aria-label="しごとの進みぐあい">
        <div className="shift-workplace-sign"><Icon name={job.id === 'bakery' ? 'shop' : job.id === 'bus' ? 'bus' : job.id === 'waste' ? 'waste' : 'briefcase'} /><span><small>きょうの しごとば</small><strong>{scenario.workplace}</strong></span></div>
        <ol className="shift-progress">
          {['きがえる', 'カード', 'いらい 1', 'いらい 2', 'たいきん'].map((label, index) => <li key={label} className={index < progressStep ? 'is-done' : index === progressStep ? 'is-current' : ''} aria-current={index === progressStep ? 'step' : undefined}><span>{index < progressStep ? <Icon name="check" /> : index + 1}</span><small>{label}</small></li>)}
        </ol>
      </section>

      <section ref={stageRef} tabIndex={-1} className="shift-stage" aria-live="polite">
        {phase === 'arrival' && <ArrivalStage job={job} workplace={scenario.workplace} uniform={scenario.uniform} uniformOn={uniformOn} onUniform={() => { setUniformOn(true); setMessage(`${scenario.uniform}を きたよ。つぎは タイムカード。`) }} onClockIn={() => { setPhase('work'); setMessage(`${scenario.shiftGoal}。まず ${scenario.stations[0].label}へ 行こう。`) }} />}

        {phase === 'work' && order && task && <>
          <div className="shift-hud">
            <WorkerAvatar job={job} uniformOn />
            <div className="shift-timecard is-in"><span>タイムカード</span><strong>IN</strong><small>しゅっきん中</small></div>
            <div className="shift-order-count"><small>きょうの いらい</small><strong>{orderIndex + 1}<span> / {scenario.orders.length}</span></strong></div>
          </div>

          <div className="shift-work-grid">
            <section className="customer-order" aria-labelledby="current-order-title">
              <div className="customer-face" aria-hidden="true"><span /><i /></div>
              <div><small>{order.customer}からの いらい</small><h2 id="current-order-title">「{order.request}」</h2><div className="order-slip"><Icon name="book" /><span>ちゅうもんひょう</span><strong>{order.ticket}</strong></div></div>
            </section>

            <section ref={workFloorRef} className="work-floor" aria-label={`${job.shortName}のしごと場`}>
              <div className="work-floor-path" aria-hidden="true" />
              {scenario.stations.map((station) => {
                const isExpected = station.id === task.stationId
                const isActive = station.id === activeStation
                const doneAtStation = order.tasks.slice(0, taskIndex).some((item) => item.stationId === station.id)
                return <button type="button" key={station.id} className={`work-station ${isExpected ? 'is-next' : ''} ${isActive ? 'is-active' : ''} ${doneAtStation ? 'is-done' : ''}`} onClick={() => goToStation(station.id)} aria-label={`${station.label}へ行く。${station.detail}`}><span><Icon name={station.icon} /></span><strong>{station.label}</strong><small>{isExpected ? 'つぎは ここ' : station.detail}</small>{doneAtStation && <i><Icon name="check" /></i>}</button>
              })}
              <div className={`floor-worker at-${activeStation ?? 'start'}`} aria-hidden="true"><WorkerAvatar job={job} uniformOn compact /></div>
            </section>

            <section ref={actionPanelRef} className={`work-action-panel ${activeStation === task.stationId ? 'is-ready' : ''}`}>
              <div><small>いまの さぎょう　{taskIndex + 1} / {order.tasks.length}</small><h3>{activeStation === task.stationId ? task.instruction : `${expectedStation?.label}へ 行こう`}</h3></div>
              {task.decision && activeStation === task.stationId && <section className={`work-decision-card ${decisionReady ? 'is-correct' : ''}`} aria-label="しごとの判断">
                <div><span>かんがえる しごと</span><strong>{task.decision.prompt}</strong></div>
                <div>{task.decision.options.map((option) => <button type="button" key={option.id} className={decisionId === option.id ? 'is-selected' : ''} onClick={() => chooseDecision(option.id)}>{decisionId === option.id && <Icon name="check" />}{option.label}</button>)}</div>
                {!decisionReady && <small><Icon name="info" />まちがえても だいじょうぶ。ヒントを見て なおせるよ。</small>}
                {decisionReady && <small className="decision-ok"><Icon name="check" />よく考えたね。つぎは 道具を うごかそう。</small>}
              </section>}
              <WorkObjectVisual job={job} taskIndex={taskIndex} effortDone={effortDone} effort={task.effort} />
              <div className="effort-tokens" aria-label={`${task.effort}${task.unit}のうち${effortDone}${task.unit}できた`}>{Array.from({ length: task.effort }, (_, index) => <span key={index} className={index < effortDone ? 'is-done' : ''}>{index < effortDone ? <Icon name="check" /> : index + 1}</span>)}</div>
              {!taskReady ? <button type="button" className="work-action-button" disabled={activeStation !== task.stationId || !decisionReady} onClick={workOnce}><Icon name="tools" /><span>{activeStation !== task.stationId ? 'ばしょへ 行ってから さぎょう' : !decisionReady ? '上の しごと判断を えらぼう' : task.action}</span></button> : <button type="button" className="button button-primary button-large" onClick={advanceTask}>{taskIndex < order.tasks.length - 1 ? 'できた！ つぎの ばしょへ' : 'できた！ おきゃくさんへ'}<Icon name="arrow" /></button>}
            </section>
          </div>
        </>}

        {phase === 'handoff' && order && <section className={`shift-handoff ${delivered ? 'is-delivered' : ''}`}>
          <span className="eyebrow">しごとの しあげ</span><h2>{order.ticket}を 手わたそう</h2><p>作ったものや サービスが、おきゃくさんへ とどいて しごとになります。</p>
          <div className="handoff-scene"><div><WorkerAvatar job={job} uniformOn /><strong>{job.shortName}</strong></div><div className="handoff-package"><Icon name={job.id === 'bakery' ? 'shop' : job.id === 'bus' ? 'bus' : job.id === 'waste' ? 'waste' : 'briefcase'} /><span>{order.ticket}</span></div><div><span className="customer-face" aria-hidden="true"><span /><i /></span><strong>{order.customer}</strong></div></div>
          {!delivered ? <button type="button" className="button button-primary button-large" onClick={() => { setDelivered(true); setMessage(order.thanks) }}>おきゃくさんへ 手わたす<Icon name="arrow" /></button> : <><blockquote>「{order.thanks}」</blockquote><div className="created-value"><Icon name="heart" /><span><small>この しごとで うまれたもの</small><strong>{order.createdValue}</strong></span></div><button type="button" className="button button-primary button-large" onClick={nextOrder}>{orderIndex < scenario.orders.length - 1 ? 'つぎの いらいを うける' : 'しごとを かたづける'}<Icon name="arrow" /></button></>}
        </section>}

        {phase === 'clockout' && <section className="shift-clockout">
          <div className="clockout-stamp"><Icon name="check" /><span>いらい</span><strong>{scenario.orders.length}けん</strong><small>かんりょう</small></div>
          <span className="eyebrow">きょうの シフト おわり</span><h2>{scenario.townValue}</h2><p>せいふくを かえして、タイムカードを おすと おきゅうりょうが もらえます。</p>
          <div className="shift-result-preview"><div><small>しごとの ていねいさ</small><strong>{'★'.repeat(shiftQuality)}{'☆'.repeat(3 - shiftQuality)}</strong><span>{mistakes ? `なおした かいすう ${mistakes}` : 'やりなおし なし！'}</span></div><div><small>おきゅうりょう よそう</small><strong>{grossPay}<b>コイン</b></strong><span>基本 {job.reward} ＋ ていねい {qualityBonus}{demandBonus ? ` ＋ たすけて ${demandBonus}` : ''}</span></div><div><small>{job.shortName}の けいけん</small><strong>レベル {skillLevel}</strong><span>シフトをすると けいけんアップ</span></div></div>
          <div className="timecard-sheet"><span>つながりタウン タイムカード</span><div><b>IN</b><strong>しゅっきん</strong><i><Icon name="check" /></i></div><div><b>OUT</b><strong>たいきん</strong><i>？</i></div></div>
          <button type="button" className="button button-primary button-large" disabled={finishing} onClick={finishShift}><Icon name="briefcase" />タイムカードを おして たいきん</button>
          <small>まちがえても 基本のおきゅうりょうは へらないよ。ていねいボーナスだけが かわります。</small>
        </section>}
      </section>

      <div className="shift-guide-message" role="status"><Icon name="info" /><span>{message}</span></div>
    </main>
  )
}

function ArrivalStage({ job, workplace, uniform, uniformOn, onUniform, onClockIn }: { job: Job; workplace: string; uniform: string; uniformOn: boolean; onUniform: () => void; onClockIn: () => void }) {
  return <section className="shift-arrival">
    <div className="arrival-building"><div className="building-awning" /><span><Icon name={job.id === 'bakery' ? 'shop' : job.id === 'bus' ? 'bus' : job.id === 'waste' ? 'waste' : 'briefcase'} /></span><h1>{workplace}</h1><p>きょうは ここで はたらきます。</p><div className="building-door" /></div>
    <div className="arrival-room">
      <div className={`uniform-locker ${uniformOn ? 'is-open' : ''}`}><span>ロッカー</span><Icon name="briefcase" /><strong>{uniform}</strong></div>
      <WorkerAvatar job={job} uniformOn={uniformOn} />
      <div className="arrival-actions">
        <span className="eyebrow">しゅっきんの じゅんび</span><h2>{uniformOn ? 'せいふくを きたよ！' : 'しごとの ふくに きがえよう'}</h2><p>{uniformOn ? 'これで しごとばへ 入れます。タイムカードを おそう。' : 'しごとの ふくは、あんぜんと せいけつを まもります。'}</p>
        {!uniformOn ? <button type="button" className="button button-primary button-large" onClick={onUniform}><Icon name="briefcase" />ロッカーを あけて きがえる</button> : <button type="button" className="button button-primary button-large" onClick={onClockIn}><Icon name="play" />タイムカードを おして しゅっきん</button>}
      </div>
    </div>
  </section>
}

function WorkObjectVisual({ job, taskIndex, effortDone, effort }: { job: Job; taskIndex: number; effortDone: number; effort: number }) {
  const progress = effort > 0 ? Math.min(1, effortDone / effort) : 0
  const done = effortDone >= effort
  const status = job.id === 'bakery'
    ? taskIndex === 0 ? `${effortDone} / ${effort} の ざいりょうが ボウルへ` : taskIndex === 1 ? done ? 'パンの かたちが できた！' : 'こねると パンが 大きくなるよ' : done ? 'こんがり やけた！' : 'オーブンが あたたまっているよ'
    : job.id === 'bus'
      ? taskIndex === 0 ? `${effortDone} / ${effort} かしょを あんぜんチェック` : taskIndex === 1 ? `${effortDone}人が バスに のったよ` : done ? 'ていりゅうじょに とうちゃく！' : 'バスが まちを すすんでいるよ'
      : job.id === 'waste'
        ? taskIndex === 0 ? `${effortDone}こ ひろって まちが きれいに` : taskIndex === 1 ? `${effortDone}しゅるいに わけたよ` : done ? 'しゅうしゅう車へ つみこみ かんりょう！' : 'ごみを しゅうしゅう車へ つもう'
        : done ? 'しごとが できた！' : `しごとが ${effortDone} / ${effort} すすんだよ`

  return <div className={`work-object-visual visual-${job.id} visual-task-${taskIndex} progress-${effortDone}`} role="img" aria-label={status}>
    <div className="work-object-scene" aria-hidden="true">
      {job.id === 'bakery' && taskIndex === 0 && <div className="bakery-bowl"><span />{Array.from({ length: effort }, (_, index) => <i key={index} className={index < effortDone ? 'is-added' : ''} />)}</div>}
      {job.id === 'bakery' && taskIndex === 1 && <div className="bakery-board"><i style={{ transform: `scale(${0.7 + progress * 0.3})` }} /><span /><span /></div>}
      {job.id === 'bakery' && taskIndex === 2 && <div className="bakery-oven"><div><i className={done ? 'is-baked' : ''} /></div>{Array.from({ length: effort }, (_, index) => <span key={index} className={index < effortDone ? 'is-hot' : ''} />)}</div>}

      {job.id === 'bus' && <div className={`work-bus ${taskIndex === 2 ? 'is-driving' : ''}`} style={taskIndex === 2 ? { left: `${8 + progress * 68}%` } : undefined}><div className="bus-windows">{Array.from({ length: 3 }, (_, index) => <i key={index} className={taskIndex === 1 && index < effortDone ? 'has-passenger' : ''} />)}</div><span className="bus-wheel left" /><span className="bus-wheel right" /></div>}
      {job.id === 'bus' && taskIndex === 0 && <div className="bus-check-lights">{Array.from({ length: effort }, (_, index) => <i key={index} className={index < effortDone ? 'is-checked' : ''}><Icon name={index < effortDone ? 'check' : 'tools'} /></i>)}</div>}
      {job.id === 'bus' && taskIndex === 2 && <div className="bus-route"><i /><i /><i /></div>}

      {job.id === 'waste' && taskIndex === 0 && <div className="litter-scene"><div className="litter-bin"><Icon name="waste" /></div>{Array.from({ length: effort }, (_, index) => <i key={index} className={index < effortDone ? 'is-collected' : ''} />)}</div>}
      {job.id === 'waste' && taskIndex === 1 && <div className="sorting-bins">{Array.from({ length: effort }, (_, index) => <div key={index} className={index < effortDone ? 'is-filled' : ''}><span /><i>{index + 1}</i></div>)}</div>}
      {job.id === 'waste' && taskIndex === 2 && <div className="waste-truck"><div>{Array.from({ length: effort }, (_, index) => <i key={index} className={index < effortDone ? 'is-loaded' : ''} />)}</div><span className="truck-cab" /><b className="truck-wheel left" /><b className="truck-wheel right" /></div>}

      {!['bakery', 'bus', 'waste'].includes(job.id) && <div className="generic-work-object">{Array.from({ length: effort }, (_, index) => <i key={index} className={index < effortDone ? 'is-done' : ''}><Icon name={index < effortDone ? 'check' : 'tools'} /></i>)}</div>}
    </div>
    <strong className={done ? 'is-complete' : ''}>{status}</strong>
  </div>
}

function WorkerAvatar({ job, uniformOn, compact = false }: { job: Job; uniformOn: boolean; compact?: boolean }) {
  return <span className={`worker-avatar avatar-${job.id} ${uniformOn ? 'has-uniform' : ''} ${compact ? 'is-compact' : ''}`} role="img" aria-label={uniformOn ? `${job.shortName}のせいふくを着た自分` : 'しごとの前の自分'}><i className="avatar-head" /><i className="avatar-hat" /><i className="avatar-body" /><i className="avatar-arm left" /><i className="avatar-arm right" /><i className="avatar-leg left" /><i className="avatar-leg right" /></span>
}
