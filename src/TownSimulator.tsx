import { useState } from 'react'
import { jobById } from './data'
import { Icon, type IconName } from './Icon'
import { formatGameTime, simulationJobNeeds, townNeedInfo } from './simulationData'
import type { GameState, TownNeed } from './types'
import './townSimulator.css'

const needIcons: Record<TownNeed, IconName> = { food: 'shop', transport: 'bus', cleanliness: 'waste' }

export function SimulationHUD({ state }: { state: GameState }) {
  const sim = state.simulation
  return <section className="simulation-hud" aria-label="いまのゲームのじょうたい">
    <div className="sim-day"><small>3日間チャレンジ</small><strong>{sim.day}<span>日目 / {sim.totalDays}</span></strong></div>
    <div className="sim-clock"><Icon name="weather" /><span><small>いまの じかん</small><strong>{formatGameTime(sim.clockMinutes)}</strong></span></div>
    <div className="sim-energy"><small>げんき</small><span aria-label={`${sim.energy}/${sim.maxEnergy}`}><b>{Array.from({ length: sim.maxEnergy }, (_, index) => <Icon key={index} name="heart" className={index < sim.energy ? 'is-full' : ''} />)}</b><strong>{sim.energy}</strong></span></div>
    <div className="sim-money"><span><Icon name="wallet" /><small>おさいふ</small><strong>{state.wallet}</strong></span><span><Icon name="piggy" /><small>ちょきん</small><strong>{state.savings}</strong></span></div>
    <div className="sim-trust"><Icon name="community" /><span><small>まちの ありがとう</small><strong>{sim.townTrust}</strong></span></div>
  </section>
}

export function TownSimulator({ state, onWork, onShop, onHome }: { state: GameState; onWork: () => void; onShop: () => void; onHome: () => void }) {
  const sim = state.simulation
  const need = townNeedInfo[sim.todayNeed]
  const isMorning = sim.phase === 'morning'
  const canShop = sim.workedToday && !sim.shoppedToday
  const canGoHome = sim.workedToday
  const phaseMessage = isMorning
    ? `${need.place}から たすけてカードが とどいたよ。どの仕事をするかは じぶんで きめられるよ。`
    : sim.shoppedToday
      ? '買いものと ちょきんが できたよ。家へ かえって 今日のきろくを 見よう。'
      : 'おきゅうりょうを もらったよ。お店・ぎんこうへ行くか、そのまま 家へかえろう。'

  return <main className="town-simulation">
    <section className="town-day-brief">
      <div className="town-guide-avatar" aria-hidden="true"><i /><b /><span /></div>
      <div><span className="eyebrow">{isMorning ? 'おはよう！ きょうの まち' : 'しごと おつかれさま！'}</span><h1>{isMorning ? `${sim.day}日目を はじめよう` : 'しごと帰りの じゆう時間'}</h1><p>{phaseMessage}</p></div>
      {isMorning && <div className="town-request-ticket"><Icon name={needIcons[sim.todayNeed]} /><span><small>きょうの たすけてカード</small><strong>{need.warning}</strong><b>この仕事は ＋2コイン</b></span></div>}
    </section>

    <div className="town-game-layout">
      <section className={`playable-town-map phase-${sim.phase}`} aria-label="建物をえらべる街の地図">
        <div className="town-sky"><span /><i /></div>
        <div className="town-road horizontal" /><div className="town-road vertical" />
        <div className="town-crosswalk" aria-hidden="true" />
        <TownBuilding className="building-work" icon="briefcase" title="しごとセンター" text={isMorning ? 'ここで しごとを えらぶ' : 'きょうは しゅっきんずみ'} active={isMorning} actionLabel="しごとセンターへ 行く" onClick={onWork} />
        <TownBuilding className="building-shop" icon="shop" title="お店・ぎんこう" text={canShop ? '買う・ためる・のこす' : sim.shoppedToday ? 'きょうの きろくずみ' : 'しごとの あとに ひらく'} active={canShop} actionLabel="お店と ぎんこうへ 行く" onClick={onShop} />
        <TownBuilding className="building-home" icon="home" title="じぶんの家" text={canGoHome ? '今日を おわる' : 'しごとの あとに かえる'} active={canGoHome} actionLabel="家へ かえる" onClick={onHome} />
        <div className={`map-bakery condition-${sim.town.food}`} aria-label={`パン屋。食べもの${sim.town.food}/3`}><Icon name="shop" /><span>パン屋</span>{sim.todayNeed === 'food' && <b>!</b>}</div>
        <div className={`map-bus condition-${sim.town.transport}`} aria-label={`バス。いどう${sim.town.transport}/3`}><Icon name="bus" /><span>バス</span>{sim.todayNeed === 'transport' && <b>!</b>}</div>
        <div className={`map-park condition-${sim.town.cleanliness}`} aria-label={`公園。きれいさ${sim.town.cleanliness}/3`}><Icon name="sprout" /><span>公園</span>{sim.todayNeed === 'cleanliness' && <b>!</b>}</div>
        <div className={`town-player at-${isMorning ? 'home' : sim.shoppedToday ? 'shop' : 'work'}`} aria-label="まちにいる自分"><i /><b /><span /></div>
      </section>

      <aside className="town-status-panel">
        <span className="eyebrow">しごとで まちが かわる</span><h2>まちの ようす</h2>
        <div className="town-need-list">{(Object.keys(townNeedInfo) as TownNeed[]).map((id) => { const info = townNeedInfo[id]; const value = sim.town[id]; return <div key={id} className={id === sim.todayNeed ? 'is-needed' : ''}><span><Icon name={needIcons[id]} /></span><div><strong>{info.shortLabel}</strong><small>{value <= 1 ? info.warning : info.good}</small><i aria-label={`${value}/3`}>{Array.from({ length: 3 }, (_, index) => <b key={index} className={index < value ? 'is-on' : ''} />)}</i></div>{id === sim.todayNeed && <em>たすけて！</em>}</div> })}</div>
        <section className="town-goals"><h3>3日間の もくひょう</h3><GoalLine icon="briefcase" label="3つの しごとを体験" value={new Set([...sim.history.map((day) => day.jobId), ...(sim.workedToday && sim.lastShift ? [sim.lastShift.jobId] : [])]).size} max={3} /><GoalLine icon="piggy" label="ちょきん 10コイン" value={state.savings} max={10} /><GoalLine icon="community" label="ありがとう 10こ" value={sim.townTrust} max={10} /></section>
      </aside>
    </div>

    <section className="town-next-action">
      <div><Icon name={isMorning ? 'briefcase' : canShop ? 'shop' : 'home'} /><span><small>つぎに できること</small><strong>{isMorning ? 'しごとを えらんで しゅっきん' : canShop ? '買いもの・ちょきん、または 帰宅' : '家へ かえって 1日を まとめる'}</strong></span></div>
      {isMorning ? <button type="button" className="button button-primary button-large" onClick={onWork}>しごとセンターへ<Icon name="arrow" /></button> : <div>{canShop && <button type="button" className="button button-secondary" onClick={onShop}><Icon name="shop" />お店・ぎんこう</button>}<button type="button" className="button button-primary button-large" onClick={onHome}><Icon name="home" />家へ かえる</button></div>}
    </section>
  </main>
}

function TownBuilding({ className, icon, title, text, active, actionLabel, onClick }: { className: string; icon: IconName; title: string; text: string; active: boolean; actionLabel: string; onClick: () => void }) {
  return <button type="button" className={`town-building ${className} ${active ? 'is-active' : ''}`} disabled={!active} onClick={onClick} aria-label={actionLabel}><span className="building-roof" /><span className="building-face"><Icon name={icon} /><strong>{title}</strong><small>{text}</small></span>{active && <b>ここへ行く<Icon name="arrow" /></b>}</button>
}

function GoalLine({ icon, label, value, max }: { icon: IconName; label: string; value: number; max: number }) {
  const percent = Math.min(100, (value / max) * 100)
  return <div className="goal-line"><Icon name={icon} /><span><small>{label}</small><i><b style={{ width: `${percent}%` }} /></i></span><strong>{Math.min(value, max)} / {max}</strong></div>
}

export function DayEndSimulator({ state, onNext, onReport }: { state: GameState; onNext: () => void; onReport: () => void }) {
  const sim = state.simulation
  const record = sim.history[sim.history.length - 1]
  const job = jobById(record?.jobId ?? null)
  if (!record) return null
  const isLast = sim.day >= sim.totalDays
  const nextTime = isLast ? 'つぎの3日間の 1日目' : '明日'
  return <main className="page-shell day-end-simulator">
    <section className="day-end-heading"><div className="night-house"><Icon name="home" /><i /><i /><i /></div><div><span className="eyebrow">{sim.day}日目 おつかれさま</span><h1>今日の くらしを 見てみよう</h1><p>はたらいたお金と、使ったお金が、明日へ つながります。</p></div></section>
    <div className="day-result-flow">
      <ResultStop icon="briefcase" label="はたらいた" value={job?.shortName ?? 'しごと'} note={`★${record.quality}・${record.grossEarned}コイン`} />
      <Icon name="arrow" />
      <ResultStop icon="home" label="まちへ" value={`ぜいきん ${record.taxPaid}`} note={`${townNeedInfo[record.townNeed].shortLabel}を たすけた`} />
      <Icon name="arrow" />
      <ResultStop icon="wallet" label="くらし" value={`つかった ${record.spent}`} note={`ためた ${record.saved}コイン`} />
      <Icon name="arrow" />
      <ResultStop icon="piggy" label="明日へ" value={`おさいふ ${record.endingWallet}`} note={`ちょきん ${record.endingSavings}`} />
    </div>
    <section className="day-change-card"><Icon name="community" /><div><small>しごとで かわったこと</small><h2>{townNeedInfo[record.townNeed].good}</h2><p>まちの「ありがとう」が {record.trustGained}こ ふえました。</p></div><strong>＋{record.trustGained}</strong></section>
    <section className="tomorrow-preview"><span className="eyebrow">{isLast ? '3日間 かんりょう！' : '明日に つながるもの'}</span><div>{state.spending.some((item) => item.choiceId === 'meal') && <p><Icon name="heart" />夕ごはんの材料 → {nextTime}は げんきが 1こ多い</p>}{state.spending.some((item) => item.choiceId === 'notebook') && <p><Icon name="book" />ノート → 今日の仕事の けいけん＋1</p>}{state.spending.some((item) => item.choiceId === 'share') && <p><Icon name="community" />分ける活動 → {nextTime}、まちの ありがとう＋1</p>}{state.spending.some((item) => item.choiceId === 'local-shop') && <p><Icon name="shop" />街の店で買い物 → {nextTime}、食べもの＋1</p>}{!state.spending.length && <p><Icon name="wallet" />使わなかったお金 → {nextTime}も おさいふに のこる</p>}</div></section>
    <div className="center-action"><button type="button" className="button button-primary button-large" onClick={isLast ? onReport : onNext}>{isLast ? '3日間の せいせきを 見る' : `${sim.day + 1}日目の 朝へ`}<Icon name="arrow" /></button></div>
  </main>
}

function ResultStop({ icon, label, value, note }: { icon: IconName; label: string; value: string; note: string }) {
  return <div><span><Icon name={icon} /></span><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
}

export function WeekReport({ state, onNextWeek }: { state: GameState; onNextWeek: (investment: TownNeed) => void }) {
  const sim = state.simulation
  const [investment, setInvestment] = useState<TownNeed>(sim.todayNeed)
  const totalGross = sim.history.reduce((sum, day) => sum + day.grossEarned, 0)
  const totalTax = sim.history.reduce((sum, day) => sum + day.taxPaid, 0)
  const uniqueJobs = new Set(sim.history.map((day) => day.jobId)).size
  const averageQuality = sim.history.length ? sim.history.reduce((sum, day) => sum + day.quality, 0) / sim.history.length : 0
  return <main className="page-shell week-report">
    <section className="week-report-hero"><div className="report-medal"><Icon name="community" /><strong>{sim.townTrust}</strong><small>ありがとう</small></div><div><span className="eyebrow">3日間チャレンジ かんりょう</span><h1>はたらいて、くらして、<br />まちを うごかした！</h1><p>一つの点数ではなく、どんな仕事とお金の使い方をしたかが、あなたの記録です。</p></div></section>
    <div className="report-score-grid"><div><Icon name="briefcase" /><small>体験した仕事</small><strong>{uniqueJobs}<span> / 3</span></strong></div><div><Icon name="coin" /><small>もらった給料</small><strong>{totalGross}<span>コイン</span></strong></div><div><Icon name="home" /><small>みんなで使う税金</small><strong>{totalTax}<span>コイン</span></strong></div><div><Icon name="check" /><small>しごとの丁寧さ</small><strong>{'★'.repeat(Math.round(averageQuality))}{'☆'.repeat(3 - Math.round(averageQuality))}</strong></div></div>
    <section className="skill-report"><h2>しごとの けいけん</h2><div>{(['bakery', 'bus', 'waste'] as const).map((id) => { const stat = sim.jobStats[id]; const job = jobById(id)!; return <div key={id}><span style={{ background: job.color }}><Icon name={id === 'bakery' ? 'shop' : id === 'bus' ? 'bus' : 'waste'} /></span><strong>{job.shortName}</strong><small>レベル {stat.level}</small><i><b style={{ width: `${Math.min(100, (stat.xp % 3) / 3 * 100)}%` }} /></i><em>{stat.shifts}回</em></div> })}</div></section>
    <section className="tax-council"><div><span className="eyebrow">ぜいきんで つぎの街をよくしよう</span><h2>{totalTax}コインを、どこに いかしたい？</h2><p>えらんだ場所は、次の3日間を「とてもよい」から始められます。</p></div><div>{(Object.keys(townNeedInfo) as TownNeed[]).map((id) => <button type="button" key={id} aria-pressed={investment === id} className={investment === id ? 'is-selected' : ''} onClick={() => setInvestment(id)}><Icon name={needIcons[id]} /><span><strong>{townNeedInfo[id].label}</strong><small>{townNeedInfo[id].place}を よくする</small></span>{investment === id && <Icon name="check" />}</button>)}</div></section>
    <div className="center-action"><button type="button" className="button button-primary button-large" onClick={() => onNextWeek(investment)}>ぜいきんを いかして 次の3日間へ<Icon name="arrow" /></button></div>
  </main>
}
