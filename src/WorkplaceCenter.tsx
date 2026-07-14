import { jobs } from './data'
import { Icon } from './Icon'
import { featuredJobIds, getShiftScenario } from './shiftData'
import { demandBonusFor, simulationJobNeeds, townNeedInfo } from './simulationData'
import type { GameState, Job, JobId } from './types'
import './workplaceCenter.css'

export function WorkplaceCenter({ state, onSelect, onMap }: { state: GameState; onSelect: (jobId: JobId) => void; onMap: () => void }) {
  const featured = featuredJobIds.map((id) => jobs.find((job) => job.id === id)).filter((job): job is Job => Boolean(job))
  return <main className="page-shell workplace-center">
    <section className="workplace-hero">
      <div><span className="eyebrow">つながりタウン しごとセンター</span><h1>きょうは、どこで はたらく？</h1><p>しごとの ふくをきて、おきゃくさんの いらいを さいごまで やってみよう。</p></div>
      <div className="workday-wallet"><Icon name="wallet" /><span><small>いまの おさいふ</small><strong>{state.wallet}<b>コイン</b></strong></span><span><small>ちょきん</small><strong>{state.savings}<b>コイン</b></strong></span></div>
    </section>

    <ol className="workday-loop" aria-label="きょうのゲームの流れ">
      <li className="is-current"><span><Icon name="briefcase" /></span><div><small>いま</small><strong>しごとを えらぶ</strong></div></li>
      <li><Icon name="arrow" /></li>
      <li><span><Icon name="coin" /></span><div><small>しごとのあと</small><strong>おきゅうりょう</strong></div></li>
      <li><Icon name="arrow" /></li>
      <li><span><Icon name="shop" /></span><div><small>まちへ出て</small><strong>つかう・ためる</strong></div></li>
    </ol>

    <div className="workplace-card-grid">
      {featured.map((job, index) => {
        const scenario = getShiftScenario(job)
        const jobIcon = job.id === 'bakery' ? 'shop' : job.id === 'bus' ? 'bus' : 'waste'
        const stat = state.simulation.jobStats[job.id]
        const demandBonus = demandBonusFor(state.simulation, job.id)
        const need = simulationJobNeeds[job.id]
        return <article className={`workplace-card workplace-${job.id}`} key={job.id} style={{ '--job-color': job.color } as React.CSSProperties}>
          <div className="workplace-card-scene">
            <span className="workplace-number">0{index + 1}</span>
            <div className="workplace-building"><i /><Icon name={jobIcon} /><strong>{scenario.workplace}</strong></div>
            <div className="workplace-person" aria-hidden="true"><i /><b /></div>
            <span className="workplace-customer"><Icon name="community" /></span>
          </div>
          <div className="workplace-card-copy">
            <div className="workplace-game-stats"><span className="job-chip">レベル {stat.level}・{stat.shifts}回</span>{demandBonus > 0 && <span className="demand-bonus-chip"><Icon name="info" />街の たすけて ＋{demandBonus}</span>}</div>
            {need && <small className="job-town-effect"><Icon name={jobIcon} />この仕事で「{townNeedInfo[need].shortLabel}」が よくなる</small>}
            <h2>{job.name}</h2>
            <p>{scenario.roleLine}</p>
            <dl><div><dt>しごとの ふく</dt><dd>{scenario.uniform}</dd></div><div><dt>しごとば</dt><dd>{scenario.stations.map((station) => station.label).join(' → ')}</dd></div></dl>
            <div className="workplace-pay-preview"><span>シフトが おわると</span><strong>{job.reward + demandBonus}<small>〜 {job.reward + demandBonus + 2}コイン</small></strong><small>ていねいボーナス 0〜2・ぜいきん {job.shared}</small></div>
            <button type="button" className="button button-primary button-large" aria-label={`${job.shortName}の しごとばへ 入る`} onClick={() => onSelect(job.id)}>この しごとばへ 入る<Icon name="arrow" /></button>
          </div>
        </article>
      })}
    </div>

    <section className="workplace-map-note"><Icon name="map" /><div><strong>街には ほかの しごとも あるよ</strong><p>建物と、そこで働く人のつながりを見てみよう。</p></div><button type="button" className="button button-secondary" onClick={onMap}>街の地図を見る</button></section>
  </main>
}

export function JobBriefing({ job, skillLevel, demandBonus, resumeShift, onStart, onBack }: { job: Job; skillLevel: number; demandBonus: number; resumeShift: boolean; onStart: () => void; onBack: () => void }) {
  const scenario = getShiftScenario(job)
  const expectedGross = job.reward + demandBonus
  const takeHome = expectedGross - job.shared
  const icon = job.id === 'bakery' ? 'shop' : job.id === 'bus' ? 'bus' : job.id === 'waste' ? 'waste' : 'briefcase'
  return <main className="page-shell job-briefing" style={{ '--job-color': job.color } as React.CSSProperties}>
    <section className="briefing-header"><div><span className="eyebrow">しごとばの せつめい</span><h1>{scenario.workplace}</h1><p>{scenario.roleLine}</p></div><div className="briefing-badge"><Icon name={icon} /><span>きょうの やくわり</span><strong>{job.shortName}</strong></div></section>
    <div className="briefing-layout">
      <section className="briefing-scene">
        <div className="briefing-locker"><small>ロッカー</small><Icon name="briefcase" /><strong>{scenario.uniform}</strong></div>
        <div className="briefing-worker" aria-hidden="true"><i /><b /><span /></div>
        <div className="briefing-timecard"><small>タイムカード</small><strong>IN</strong><span>しゅっきん前</span></div>
        <p>しごとばへ入ったら、<br /><strong>きがえる → カードをおす</strong></p>
      </section>
      <section className="briefing-details">
        <span className="eyebrow">きょうの シフト・レベル {skillLevel}</span><h2>{scenario.shiftGoal}</h2>
        <div className="briefing-orders">{scenario.orders.map((order, index) => <div key={order.id}><span>{index + 1}</span><Icon name="community" /><p><small>{order.customer}</small><strong>「{order.request}」</strong></p></div>)}</div>
        <h3>しごとばで すること</h3>
        <ol className="briefing-stations">{scenario.stations.map((station, index) => <li key={station.id}><span>{index + 1}<Icon name={station.icon} /></span><div><strong>{station.label}</strong><small>{station.detail}</small></div></li>)}</ol>
      </section>
      <aside className="briefing-pay">
        <span><Icon name="coin" />おきゅうりょう</span><strong>{expectedGross}<small>〜 {expectedGross + 2}コイン</small></strong>
        <div><span>街で いっしょに使う</span><b>ぜいきん {job.shared}</b></div>
        <div className="is-takehome"><span>じぶんで つかえる</span><b>{takeHome}コイン</b></div>
        <p>基本 {job.reward}{demandBonus ? ` ＋ 街のたすけて ${demandBonus}` : ''} ＋ ていねい 0〜2。まちがえても基本給はへらないよ。</p>
      </aside>
    </div>
    <div className="briefing-actions"><button type="button" className="button button-secondary" onClick={onBack}><Icon name="back" />しごとを えらびなおす</button><button type="button" className="button button-primary button-large" onClick={onStart}><Icon name="play" />{resumeShift ? 'シフトの つづきへ もどる' : 'せいふくを きて しゅっきんする'}</button></div>
  </main>
}
