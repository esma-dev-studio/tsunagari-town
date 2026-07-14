import { useMemo, useState } from 'react'
import {
  expenseChoices,
  jobById,
  jobs,
  moneyFlows,
  parentPrompts,
  problemById,
  problems,
  publicServices,
  reflectionQuestions,
  unexpectedEvents,
} from './data'
import { Icon, type IconName } from './Icon'
import { ChildJourney, GuideCharacter, ProblemPicture, TaskGuide } from './Guide'
import { MapScene, facilities } from './MapScene'
import { Mission } from './Mission'
import { PaydaySimulator } from './PaydaySimulator'
import { MoneyBook } from './MoneyBook'
import { demandBonusFor } from './simulationData'
import { readShiftProgress } from './shiftProgress'
import { SpendSimulator } from './SpendSimulator'
import { DayEndSimulator, SimulationHUD, TownSimulator, WeekReport } from './TownSimulator'
import { JobBriefing, WorkplaceCenter } from './WorkplaceCenter'
import type { GameState, Job, JobId, Screen, SpendingRecord, TownNeed } from './types'
import { useGame } from './useGame'

const simulationScreens: Screen[] = ['town', 'workplace', 'job', 'mission', 'payslip', 'spend', 'event', 'day-end', 'week-report']
const coreJobIds: JobId[] = ['bakery', 'bus', 'waste']
const stageScreens: Screen[] = [...simulationScreens, 'map', 'problem', 'budget', 'flow', 'reflection']
const stages = [
  { label: '街', screens: ['town'] },
  { label: '仕事を選ぶ', screens: ['workplace', 'job', 'map', 'problem'] },
  { label: '働く', screens: ['mission'] },
  { label: '給料', screens: ['payslip'] },
  { label: '街で暮らす', screens: ['spend', 'event'] },
  { label: '一日の結果', screens: ['day-end', 'week-report', 'budget', 'flow', 'reflection'] },
]

const screenTitles: Partial<Record<Screen, string>> = {
  town: '街でくらす',
  workplace: 'しごとセンター',
  map: 'つながりタウン', problem: '街の困りごと', job: '仕事をえらぶ', mission: '仕事ミッション',
  payslip: '給料のお知らせ', spend: 'お金の使い方', event: '予想外の出来事', budget: '街の予算会議',
  'day-end': '今日のきろく', 'week-report': '3日間のせいせき',
  flow: 'お金の循環', reflection: '一週間の振り返り', encyclopedia: '仕事図鑑', parent: '保護者の方へ',
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

function AppHeader({ screen, state, onHome, onMap, onBack }: { screen: Screen; state: GameState; onHome: () => void; onMap: () => void; onBack: () => void }) {
  if (screen === 'opening') return null
  const title = screenTitles[screen] ?? 'お金と仕事の街'
  const stageIndex = stages.findIndex((stage) => stage.screens.includes(screen))
  return (
    <>
      <header className="app-header">
        <button type="button" className="brand" onClick={onHome} aria-label="ホームへ">
          <span className="brand-mark"><Icon name="community" /></span>
          <span><small>お金と仕事の街</small><strong>つながりタウン</strong></span>
        </button>
        <div className="header-title">{title}</div>
        <nav className="header-actions" aria-label="いつでも使えるメニュー">
          {stageScreens.includes(screen) && <button type="button" className="icon-button back-button" onClick={onBack} aria-label="前の画面にもどる"><Icon name="back" /></button>}
          <button type="button" className="icon-button" onClick={() => speak(`${title}。画面の文を、ゆっくり読んで進めよう。`)} aria-label="画面の名前を読み上げる"><Icon name="speaker" /></button>
          <button type="button" className="icon-button" onClick={onMap} aria-label="街の地図へ"><Icon name="map" /></button>
          <button type="button" className="icon-button" onClick={onHome} aria-label="ホームへ"><Icon name="home" /></button>
        </nav>
      </header>
      {stageIndex >= 0 && <div className="stage-bar" aria-label={`今は${stages[stageIndex].label}のステップ`}>
        <div className="stage-meta"><span>街の1週間</span><strong>{stageIndex + 1} / {stages.length}</strong></div>
        <ol>{stages.map((stage, index) => <li key={stage.label} className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-current' : ''}><span>{index < stageIndex ? <Icon name="check" /> : index + 1}</span><b>{stage.label}</b></li>)}</ol>
      </div>}
      <div className="mobile-progress" style={{ '--progress': `${Math.max(0, ((stageIndex + 1) / stages.length) * 100)}%` } as React.CSSProperties}><span>{stageIndex >= 0 ? stages[stageIndex].label : title}</span><b>{simulationScreens.includes(screen) ? `${state.simulation.day}日目` : `${state.week}週目`}</b></div>
      <TaskGuide screen={screen} />
    </>
  )
}

function Opening({ hasProgress, canContinue, weekComplete, onStart, onContinue }: { hasProgress: boolean; canContinue: boolean; weekComplete: boolean; onStart: () => void; onContinue: () => void }) {
  return (
    <main className="opening-screen">
      <div className="opening-copy">
        <div className="opening-brand"><span className="brand-mark large"><Icon name="community" /></span><span>つながりタウンへ ようこそ</span></div>
        <div className="opening-guide">
          <GuideCharacter />
          <div className="guide-speech"><small>まちの あんない人「つなぐ」</small><strong>こまっている人を<br />いっしょに たすけよう！</strong></div>
        </div>
        <p className="eyebrow">3日間、じぶんで街を うごかそう</p>
        <h1>はたらく・かせぐ・くらす</h1>
        <p className="opening-lead">時間・げんき・お金を見ながら、仕事とくらしをじぶんで決めるゲーム。</p>
        <ChildJourney />
        <div className="opening-actions">
          {canContinue && <button type="button" className="button button-primary button-large" onClick={onContinue}>つづきから<Icon name="arrow" /></button>}
          <button type="button" className={`button ${canContinue ? 'button-secondary' : 'button-primary'} button-large`} onClick={onStart}>{weekComplete ? '3日レポートを見る' : hasProgress ? 'はじめから' : 'やってみる'}<Icon name="play" /></button>
        </div>
        <p className="fiction-note"><Icon name="info" />この まちの お金は、べんきょう用の 数だよ。</p>
      </div>
      <div className="opening-map" aria-hidden="true"><MapScene compact /><div className="map-float-card"><Icon name="briefcase" /><span><strong>3つの仕事</strong>ふかく体験</span></div><div className="map-float-card second"><Icon name="coin" /><span><strong>お金の旅</strong>どこへ行く？</span></div></div>
    </main>
  )
}

function Home({ state, onStart, onContinue, onNavigate, onReset }: { state: GameState; onStart: () => void; onContinue: () => void; onNavigate: (screen: Screen) => void; onReset: () => void }) {
  const earnedCoreJobs = coreJobIds.filter((id) => state.earnedJobCards.includes(id))
  return <main className="page-shell home-page">
    <section className="home-hero">
      <div><span className="eyebrow">まちで しごとを たいけんしよう</span><h1>{state.weekComplete ? `${state.week}週目、おつかれさま！` : 'きょうは、どこで はたらく？'}</h1><p>せいふくをきて、いらいを受けて、おきゃくさんへ とどけよう。</p>
        <div className="action-row">{state.hasStarted && !state.weekComplete && <button type="button" className="button button-primary" onClick={onContinue}>つづきから<Icon name="arrow" /></button>}<button type="button" className="button button-secondary" onClick={onStart}>{state.weekComplete ? '3日レポートを見る' : 'はじめから'}<Icon name="play" /></button></div>
      </div>
      <div className="week-card"><span>これまでの仕事カード</span><strong>{earnedCoreJobs.length}<small> / 3</small></strong><div className="mini-job-row">{jobs.filter((job) => coreJobIds.includes(job.id)).map((job) => <span key={job.id} className={earnedCoreJobs.includes(job.id) ? 'is-earned' : ''} style={{ '--job-color': job.color } as React.CSSProperties}>{job.shortName.slice(0, 1)}</span>)}</div><small>点数ではなく、体験のきろくだよ。</small></div>
    </section>
    <div className="home-journey"><ChildJourney /></div>
    <MoneyBook wallet={state.wallet} savings={state.savings} totalSharedPaid={state.totalSharedPaid} ledger={state.ledger} />
    <section className="home-menu" aria-label="メニュー">
      <button type="button" onClick={() => onNavigate('map')}><span className="menu-icon blue"><Icon name="map" /></span><span><strong>街の地図</strong><small>建物と仕事のつながりを見る</small></span><Icon name="arrow" /></button>
      <button type="button" onClick={() => onNavigate('encyclopedia')}><span className="menu-icon orange"><Icon name="book" /></span><span><strong>仕事図鑑</strong><small>3つの仕事を深く体験できる</small></span><Icon name="arrow" /></button>
      <button type="button" onClick={() => onNavigate('parent')}><span className="menu-icon green"><Icon name="community" /></span><span><strong>保護者の方へ</strong><small>体験の見方と声かけ例</small></span><Icon name="arrow" /></button>
    </section>
    <button type="button" className="text-button danger" onClick={onReset}><Icon name="reset" />進みぐあいをリセット</button>
  </main>
}

function TownMapPage({ state, onProblem }: { state: GameState; onProblem: () => void }) {
  const activeProblems = problems.filter((problem) => state.activeProblemIds.includes(problem.id))
  const [selectedFacility, setSelectedFacility] = useState<(typeof facilities)[number] | null>(null)
  const [foundProblemIds, setFoundProblemIds] = useState<string[]>([])
  const affectedIds = activeProblems.flatMap((problem) => problem.affectedFacilities)
  const foundProblem = selectedFacility ? activeProblems.find((problem) => problem.affectedFacilities.includes(selectedFacility.id)) : undefined
  const selectFacility = (id: string) => {
    const facility = facilities.find((item) => item.id === id) ?? null
    setSelectedFacility(facility)
    const found = activeProblems.filter((problem) => problem.affectedFacilities.includes(id)).map((problem) => problem.id)
    setFoundProblemIds((current) => [...new Set([...current, ...found])])
  }
  return <main className="map-page">
    <div className="map-topline"><div><span className="eyebrow">STEP 1</span><h1>オレンジの まるは どこ？</h1><p>地図を 左右に うごかして、ひかる ばしょを 1つ タップしよう。</p></div><button type="button" className="button button-primary" disabled={foundProblemIds.length === 0} onClick={onProblem}>{foundProblemIds.length ? `${foundProblemIds.length}こ 見つけた！ えらぶ` : 'まず まるを タップ'}<Icon name="arrow" /></button></div>
    <div className="map-workspace"><div className="map-frame"><MapScene highlightedIds={affectedIds} onSelect={selectFacility} /></div>
      <aside className={`facility-panel ${foundProblem ? 'has-problem' : ''}`} aria-live="polite">
        {!selectedFacility && <div className="tap-hint"><span><Icon name="map" /></span><strong>オレンジの まるを<br />タップしてね</strong><p>こまりごとが 見つかるよ。</p></div>}
        {selectedFacility && <>
          {foundProblem && <div className="found-problem"><span><Icon name="check" />みつけた！</span><h2>{foundProblem.title}</h2><p>{foundProblem.description}</p></div>}
          {!foundProblem && <div className="not-here"><Icon name="info" /><strong>ここには ないみたい。<br />ほかの まるを さがそう！</strong></div>}
          <details className="facility-details"><summary>{selectedFacility.name}の しごとを見る</summary><dl><div><dt>はたらく人</dt><dd>{selectedFacility.workers}</dd></div><div><dt>たすける人</dt><dd>{selectedFacility.helps}</dd></div><div><dt>お金はどこから？</dt><dd>{selectedFacility.income}</dd></div></dl></details>
        </>}
      </aside>
    </div>
  </main>
}

function ProblemPage({ state, onSelect }: { state: GameState; onSelect: (id: string) => void }) {
  const active = problems.filter((problem) => state.activeProblemIds.includes(problem.id))
  return <main className="page-shell"><section className="page-intro"><span className="eyebrow">STEP 2</span><h1>どれを たすける？</h1><p>気になる えを 1つ タップしてね。</p></section>
    <div className="problem-grid">{active.map((problem, index) => <button type="button" className="problem-card" key={problem.id} onClick={() => onSelect(problem.id)}>
      <span className="problem-number">{index + 1}</span><ProblemPicture jobId={problem.relatedJobs[0]} /><span className="problem-place">{problem.affectedFacilities.map((id) => facilities.find((facility) => facility.id === id)?.name).filter(Boolean).join('・')}</span><strong>{problem.title}</strong><p>{problem.description}</p><span className="card-link">これを たすける<Icon name="arrow" /></span>
    </button>)}</div>
  </main>
}

function JobPage({ selectedProblemId, selectedJobId, onSelectJob, onStart }: { selectedProblemId: string | null; selectedJobId: JobId | null; onSelectJob: (id: JobId) => void; onStart: () => void }) {
  const problem = problemById(selectedProblemId)
  const suggested = selectedJobId ? jobById(selectedJobId) : jobById(problem?.relatedJobs[0] ?? null)
  const [thought, setThought] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const job = selectedJobId ? jobById(selectedJobId) : suggested
  if (!job) return null
  return <main className="page-shell job-page"><section className="page-intro compact"><span className="eyebrow">STEP 3</span><h1>だれを たすける しごと？</h1><p>おもった ボタンを 1つ タップしてね。</p></section>
    <div className="thought-row" role="group" aria-label="だれを助けるか予想する">{['おきゃくさん', 'ほかの しごと', 'まちの みんな'].map((label) => <button type="button" key={label} className={thought === label ? 'is-selected' : ''} onClick={() => setThought(label)}>{thought === label && <Icon name="check" />}{label}</button>)}</div>
    {thought && <section className="job-feature" style={{ '--job-color': job.color } as React.CSSProperties}><div className="job-feature-main"><span className="job-chip">今日の仕事</span><h2>{job.name}</h2><p>{job.description}</p><div className="job-facts"><div><span>助ける人</span><strong>{job.helpsWhom}</strong></div><div><span>つながる仕事</span><strong>{job.relatedJobs.join('・')}</strong></div></div></div><div className="job-feature-side"><JobSymbol job={job} /><div><span>仕事でもらう</span><strong>{job.reward}<small>コイン</small></strong><p>仕事の大切さの順位ではないよ。</p></div></div><div className="job-question"><Icon name="info" /><span>{job.question}</span></div></section>}
    <div className="job-actions">{thought && coreJobIds.includes(job.id) && <button type="button" className="button button-primary button-large" onClick={onStart}>この しごとを やってみる<Icon name="arrow" /></button>}{thought && !coreJobIds.includes(job.id) && <p className="important-note">この仕事の体験は じゅんび中。図鑑で 仕事のつながりを 見られるよ。</p>}<button type="button" className="text-button" onClick={() => setShowAll(!showAll)}>{showAll ? 'しごとの いちらんを とじる' : 'ほかの しごとも 見る'}</button></div>
    {showAll && <div className="job-picker">{jobs.filter((item) => coreJobIds.includes(item.id)).map((item) => <button type="button" key={item.id} className={item.id === job.id ? 'is-selected' : ''} onClick={() => { onSelectJob(item.id); setThought(null); setShowAll(false) }}><span style={{ background: item.color }}><JobMiniIcon id={item.id} /></span><strong>{item.shortName}</strong></button>)}</div>}
  </main>
}

function JobMiniIcon({ id }: { id: JobId }) {
  const icon: Record<JobId, IconName> = { bakery: 'shop', bus: 'bus', nurse: 'heart', waste: 'waste', farmer: 'sprout', library: 'book' }
  return <Icon name={icon[id]} />
}

function JobSymbol({ job }: { job: Job }) {
  return <div className="job-symbol" style={{ background: job.color }}><JobMiniIcon id={job.id} /></div>
}

function PayslipPage({ job, state, onNext }: { job: Job; state: GameState; onNext: () => void }) {
  const takeHome = job.reward - job.shared
  return <main className="page-shell narrow"><section className="celebration-heading"><div className="success-mark"><Icon name="check" /></div><span className="eyebrow">仕事、おつかれさま</span><h1>{job.townEffect}</h1><blockquote>「{job.comment}」<cite>— {job.shortName}で働く人</cite></blockquote></section>
    <section className="payslip"><div className="payslip-head"><span>つながりタウン 給料のお知らせ</span><strong>{job.name}</strong></div><div className="payslip-coins" aria-label={`${job.reward}コインのうち、税金が${job.shared}コイン、自分で使えるお金が${takeHome}コイン`}>{Array.from({ length: job.reward }, (_, index) => <span key={index} className={index < job.shared ? 'is-shared' : 'is-takehome'}><Icon name="coin" /></span>)}</div><div className="coin-legend"><span className="shared-dot" />ぜいきん {job.shared}<span className="takehome-dot" />じぶんで つかえる {takeHome}</div><div className="money-line gross"><span>仕事でもらったお金</span><strong>{job.reward}<small>コイン</small></strong></div><div className="money-line shared"><span><b>ぜいきん（街でいっしょに使うお金）</b><small>学校・道・公園などへ</small></span><strong>− {job.shared}<small>コイン</small></strong></div><div className="money-line net"><span>この仕事の あとに のこるお金</span><strong>{takeHome}<small>コイン</small></strong></div></section>
    <div className="total-wallet-callout"><Icon name="wallet" /><span><small>前から のこした分も あわせると</small><strong>おさいふは {state.wallet}コイン</strong></span></div>
    <details className="learn-more"><summary>街でいっしょに使うお金って？</summary><p>みんなで少しずつ出して、学校、道路、公園、消防などに使います。何にどれだけ使うかは、考えて決めることが大切です。これは税金を学ぶために、かんたんにした仕組みです。</p></details>
    <div className="center-action"><button type="button" className="button button-primary button-large" onClick={onNext}>しごと帰りに 街のお店へ<Icon name="arrow" /></button></div>
  </main>
}

function SpendPage({ state, onSave }: { state: GameState; onSave: (records: SpendingRecord[], reason: string) => void }) {
  const spendSource = `week-${state.week}-spend`
  const eventSource = `week-${state.week}-event`
  const currentSpendWalletDelta = state.ledger.filter((record) => record.source === spendSource).reduce((sum, record) => sum + record.walletDelta, 0)
  const currentSpendSavingsDelta = state.ledger.filter((record) => record.source === spendSource).reduce((sum, record) => sum + record.savingsDelta, 0)
  const currentEventWalletDelta = state.ledger.filter((record) => record.source === eventSource).reduce((sum, record) => sum + record.walletDelta, 0)
  const currentEventSavingsDelta = state.ledger.filter((record) => record.source === eventSource).reduce((sum, record) => sum + record.savingsDelta, 0)
  const available = Math.max(0, state.wallet - currentSpendWalletDelta - currentEventWalletDelta)
  const savingsBeforeChoice = Math.max(0, state.savings - currentSpendSavingsDelta - currentEventSavingsDelta)
  const [selected, setSelected] = useState<string[]>(state.spending.map((item) => item.choiceId))
  const [reason, setReason] = useState(state.spendingReason)
  const total = expenseChoices.filter((choice) => selected.includes(choice.id)).reduce((sum, choice) => sum + choice.cost, 0)
  const left = available - total
  const selectedSavings = expenseChoices.find((choice) => choice.id === 'savings' && selected.includes(choice.id))?.cost ?? 0
  const savingsAfterChoice = savingsBeforeChoice + selectedSavings
  const toggle = (id: string, cost: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : total + cost <= available ? [...current, id] : current)
  const records = expenseChoices.filter((choice) => selected.includes(choice.id)).map((choice) => ({ choiceId: choice.id, amount: choice.cost }))
  return <main className="page-shell"><section className="spend-heading"><div><span className="eyebrow">STEP 5</span><h1>おさいふの {available}コイン、どうする？</h1><p>使う・ためる・のこすを、自分で決めよう。</p></div><div className="wallet-meter"><Icon name="wallet" /><span>えらんだ あとの おさいふ</span><strong>{left}<small>コイン</small></strong></div></section>
    <section className="money-choice-overview" aria-label="えらんだ後のお金"><div><Icon name="wallet" /><span>おさいふに のこす<strong>{left}コイン</strong></span></div><div><Icon name="piggy" /><span>ちょきん<strong>{savingsBeforeChoice} → {savingsAfterChoice}コイン</strong></span></div><p>えらばずに のこしたお金は、つぎの週にも つかえるよ。</p></section>
    <div className="expense-grid">{expenseChoices.map((choice) => { const active = selected.includes(choice.id); const unavailable = !active && choice.cost > left; const icon: Record<string, IconName> = { need: 'home', want: 'book', save: 'piggy', help: 'heart', shop: 'shop' }; return <button type="button" key={choice.id} disabled={unavailable} className={`expense-card ${active ? 'is-selected' : ''}`} onClick={() => toggle(choice.id, choice.cost)}><span className="expense-check">{active ? <Icon name="check" /> : <Icon name={icon[choice.category]} />}</span><span className="expense-category">{choice.childDescription}</span><strong>{choice.name}</strong><p>{choice.effect}</p><b>{choice.cost}コイン</b></button> })}</div>
    <p className="context-note"><Icon name="info" />必要な物は、人やその時のくらしによってちがいます。</p>
    <section className="reason-box"><label htmlFor="spending-reason">どうして、この使い方にしたの？</label><div className="reason-chips">{['今、必要だから', 'あとで安心したいから', 'だれかと分けたいから'].map((text) => <button type="button" key={text} onClick={() => setReason(text)}>{text}</button>)}</div><textarea id="spending-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={80} placeholder="自分の考えを書いてもいいよ" /></section>
    <div className="center-action"><button type="button" className="button button-primary button-large" onClick={() => onSave(records, reason || '今の自分に合う使い方を考えた')}>この使い方にする<Icon name="arrow" /></button></div>
  </main>
}

function EventPage({ state, onChoose, onNext }: { state: GameState; onChoose: (id: string) => void; onNext: () => void }) {
  const event = unexpectedEvents.find((item) => item.id === state.eventId) ?? unexpectedEvents[0]
  const chosen = event.availableResponses.find((response) => response.id === state.eventResponseId)
  return <main className="page-shell narrow"><section className="event-card"><div className="event-visual"><Icon name={event.id === 'rain' ? 'weather' : event.id === 'family' ? 'heart' : event.id === 'festival' ? 'community' : 'tools'} /><span>予想外のできごと</span></div><h1>{event.title}</h1><p>{event.description}</p></section>
    {!chosen ? <><div className="event-balances"><span><Icon name="wallet" />おさいふ <strong>{state.wallet}</strong></span><span><Icon name="piggy" />ちょきん <strong>{state.savings}</strong></span></div><h2 className="choice-heading">どうする？ お金が たりる方法から えらぼう。</h2><div className="response-list">{event.availableResponses.map((response) => { const walletCost = Math.max(0, -(response.walletChange ?? 0)); const savingsCost = Math.max(0, -(response.savingsChange ?? 0)); const unavailable = walletCost > state.wallet || savingsCost > state.savings; const costLabel = unavailable ? 'お金が たりないよ' : walletCost > 0 ? `おさいふ −${walletCost}` : savingsCost > 0 ? `ちょきん −${savingsCost}` : 'お金は へらない'; return <button type="button" key={response.id} disabled={unavailable} onClick={() => onChoose(response.id)}><span>{response.usesSupport ? <Icon name="community" /> : <Icon name="wallet" />}</span><span className="response-copy"><strong>{response.label}</strong><small>{costLabel}</small></span><Icon name="arrow" /></button> })}</div></> : <section className="consequence-box"><span className="eyebrow">あなたのえらび方</span><h2>{chosen.label}</h2><p>{chosen.consequence}</p><div className="event-result-money"><span><Icon name="wallet" />おさいふ {state.wallet}</span><span><Icon name="piggy" />ちょきん {state.savings}</span></div>{chosen.usesSupport && <div className="support-note"><Icon name="community" />一人だけで何とかせず、助けを使うことも大切です。</div>}<button type="button" className="button button-primary" onClick={onNext}>家へ かえって 今日をまとめる<Icon name="arrow" /></button></section>}
  </main>
}

function BudgetPage({ state, onSave }: { state: GameState; onSave: (budget: Record<string, number>) => void }) {
  const [budget, setBudget] = useState({ ...state.budget })
  const neighborsShare = Math.max(0, 10 - state.sharedPaid)
  const used = Object.values(budget).reduce((sum, amount) => sum + amount, 0)
  const left = 10 - used
  const change = (id: string, delta: number) => setBudget((current) => ({ ...current, [id]: Math.max(0, Math.min(4, current[id] + delta)) }))
  return <main className="page-shell"><section className="budget-heading"><div><span className="eyebrow">STEP 7</span><h1>みんなの ぜいきんを、どこに使う？</h1><p>全部を一番にはできません。大切にしたいことを考えよう。</p></div><div className={`budget-remaining ${left < 0 ? 'is-over' : ''}`}><span>のこり</span><strong>{left}</strong><small>/ 10コイン</small></div></section>
    <section className="budget-source" aria-label="街の予算10コインの集まり方"><div><span>あなたが はらった</span><strong>{state.sharedPaid}<small>コイン</small></strong></div><b>＋</b><div><span>街のみんなが はらった</span><strong>{neighborsShare}<small>コイン</small></strong></div><b>＝</b><div className="is-total"><span>街で つかう</span><strong>10<small>コイン</small></strong></div></section>
    <div className="budget-grid">{publicServices.map((service) => { const amount = budget[service.id] ?? 0; const effect = amount >= 3 ? service.townEffects[0] : amount === 0 ? `${service.name}の新しい取り組みは待ちます` : service.townEffects[1]; return <div key={service.id} className="budget-card"><div className="budget-card-head"><span><Icon name={service.id === 'learning' ? 'book' : service.id === 'transport' ? 'bus' : service.id === 'health' ? 'heart' : service.id === 'waste' ? 'waste' : service.id === 'disaster' ? 'weather' : 'sprout'} /></span><div><strong>{service.name}</strong><small>{service.description}</small></div></div><div className="budget-controls"><button type="button" onClick={() => change(service.id, -1)} disabled={amount === 0} aria-label={`${service.name}を1コインへらす`}>−</button><output>{amount}<small>コイン</small></output><button type="button" onClick={() => change(service.id, 1)} disabled={amount === 4 || left === 0} aria-label={`${service.name}を1コインふやす`}>＋</button></div><p><Icon name="arrow" />{effect}</p></div> })}</div>
    <div className="budget-summary"><span>{left === 0 ? '10コインを分けられました。' : left > 0 ? `あと${left}コイン分けよう。` : `${Math.abs(left)}コイン分へらそう。`}</span><button type="button" className="button button-primary" disabled={left !== 0} onClick={() => onSave(budget)}>この予算にする<Icon name="arrow" /></button></div>
  </main>
}

function FlowPage({ onNext }: { onNext: () => void }) {
  const [activeId, setActiveId] = useState(moneyFlows[0].id)
  const active = moneyFlows.find((flow) => flow.id === activeId)!
  return <main className="page-shell flow-page"><section className="page-intro"><span className="eyebrow">STEP 8</span><h1>お金は、街の中を旅している</h1><p>矢印をタップして、「だれから、だれへ」を見よう。</p></section>
    <div className="flow-workspace"><div className="flow-map" aria-label="お金の流れの図"><svg viewBox="0 0 760 520" role="img" aria-label="住民、店、農家、働く人、共通サービスをお金がめぐる図"><defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="#d9854f" /></marker></defs><path d="M190 135Q380 35 565 135M600 190Q650 300 535 385M465 420Q300 505 160 390M120 335Q45 225 145 165M215 170Q350 230 488 178" fill="none" stroke="#d9854f" strokeWidth="6" strokeDasharray="12 12" markerEnd="url(#arrowhead)" className="flow-path" /><FlowNode x={130} y={100} label="住民" icon="community" /><FlowNode x={520} y={105} label="パン屋" icon="shop" /><FlowNode x={500} y={365} label="農家" icon="sprout" /><FlowNode x={95} y={350} label="働く人" icon="briefcase" /><FlowNode x={315} y={210} label="共通サービス" icon="home" /></svg><div className="flow-buttons">{moneyFlows.map((flow, index) => <button type="button" key={flow.id} className={activeId === flow.id ? 'is-active' : ''} onClick={() => setActiveId(flow.id)}><span>{index + 1}</span>{flow.from} → {flow.to}</button>)}</div></div>
      <aside className="flow-detail" aria-live="polite"><span className="eyebrow">お金の旅メモ</span><div className="flow-route"><strong>{active.from}</strong><span><Icon name="coin" />{active.amount}コイン<Icon name="arrow" /></span><strong>{active.to}</strong></div><dl><div><dt>何のため？</dt><dd>{active.purpose}</dd></div><div><dt>生まれたもの</dt><dd>{active.createdValue}</dd></div></dl><p><Icon name="info" />使ったお金は消えず、次の仕事やくらしにつながります。</p></aside></div>
    <div className="center-action"><button type="button" className="button button-primary button-large" onClick={onNext}>一週間を振り返る<Icon name="arrow" /></button></div>
  </main>
}

function FlowNode({ x, y, label, icon }: { x: number; y: number; label: string; icon: IconName }) {
  return <g transform={`translate(${x} ${y})`} className="flow-node"><circle r="58" /><foreignObject x="-28" y="-35" width="56" height="56"><div><Icon name={icon} /></div></foreignObject><text y="35" textAnchor="middle">{label}</text></g>
}

function ReflectionPage({ state, onSave, onHome, onNextWeek }: { state: GameState; onSave: (answers: Record<string, string>) => void; onHome: () => void; onNextWeek: () => void }) {
  const [answers, setAnswers] = useState({ ...state.reflections })
  const job = jobById(state.selectedJobId)
  const spent = state.ledger
    .filter((record) => record.week === state.week && (record.kind === 'spend' || record.kind === 'event'))
    .reduce((sum, record) => sum
      + Math.max(0, -record.walletDelta)
      + Math.max(0, -record.savingsDelta), 0)
  if (!state.weekComplete) return <main className="page-shell narrow"><section className="page-intro"><span className="eyebrow">最後のSTEP</span><h1>あなたの考えをのこそう</h1><p>短くても、書かずに話すだけでも大丈夫です。</p></section><div className="reflection-form">{reflectionQuestions.map((question) => <label key={question.id}>{question.label}<textarea value={answers[question.id] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={100} placeholder="思ったことを書いてみよう" /></label>)}</div><div className="center-action"><button type="button" className="button button-primary button-large" onClick={() => onSave(answers)}>一週間のまとめを見る<Icon name="arrow" /></button></div></main>
  return <main className="page-shell summary-page"><section className="summary-hero"><span className="eyebrow">つながりタウン 一週間のきろく</span><h1>あなたのえらび方が、街を動かした</h1><p>一つの正解ではなく、考えてえらんだことが大切です。</p></section><div className="summary-grid"><SummaryItem icon="briefcase" label="体験した仕事" value={job?.shortName ?? '街の仕事'} /><SummaryItem icon="community" label="助けた人" value={job?.helpsWhom ?? '街の人'} /><SummaryItem icon="coin" label="受け取ったお金" value={`${state.grossEarned}コイン`} /><SummaryItem icon="wallet" label="買いもの・できごと" value={`${spent}コイン`} /><SummaryItem icon="wallet" label="今のおさいふ" value={`${state.wallet}コイン`} /><SummaryItem icon="piggy" label="今の貯金" value={`${state.savings}コイン`} /><SummaryItem icon="home" label="今週のぜいきん" value={`${state.sharedPaid}コイン`} /><SummaryItem icon="community" label="これまでのぜいきん" value={`${state.totalSharedPaid}コイン`} /></div><section className="values-card"><span>あなたが大切にしたこと</span><blockquote>{state.spendingReason || '今の自分に合う使い方を考えた'}</blockquote><p>{job?.townEffect}</p></section><section className="unpaid-work"><Icon name="heart" /><div><h2>給料が出なくても、街を支える仕事</h2><p>家事、子育て、介護、地域の見守り。お金だけでははかれない大切な仕事もあります。</p></div></section><div className="action-row center"><button type="button" className="button button-primary" onClick={onNextWeek}>次の一週間へ<Icon name="arrow" /></button><button type="button" className="button button-secondary" onClick={onHome}>ホームにもどる<Icon name="home" /></button></div></main>
}

function SummaryItem({ icon, label, value }: { icon: IconName; label: string; value: string }) { return <div className="summary-item"><span><Icon name={icon} /></span><small>{label}</small><strong>{value}</strong></div> }

function Encyclopedia({ state, onTry }: { state: GameState; onTry: (id: JobId) => void }) {
  return <main className="page-shell"><section className="page-intro"><span className="eyebrow">つながりタウン 仕事図鑑</span><h1>ちがう仕事が、つながっている</h1><p>給料のちがいは、大切さの順位ではありません。</p></section><div className="encyclopedia-grid">{jobs.map((job) => { const playable = coreJobIds.includes(job.id); return <article key={job.id} className="encyclopedia-card" style={{ '--job-color': job.color } as React.CSSProperties}><div className="encyclopedia-art"><JobSymbol job={job} />{state.earnedJobCards.includes(job.id) && <span className="earned-stamp"><Icon name="check" />体験した</span>}</div><div><span className="job-chip">{job.reward}コイン</span><h2>{job.name}</h2><p>{job.description}</p><dl><div><dt>助ける人</dt><dd>{job.helpsWhom}</dd></div><div><dt>道具</dt><dd>{job.tools.join('・')}</dd></div><div><dt>つながる仕事</dt><dd>{job.relatedJobs.join('・')}</dd></div></dl><button type="button" disabled={!playable} className="button button-secondary" onClick={() => onTry(job.id)}>{playable ? 'この仕事を体験' : '体験は じゅんび中'}{playable && <Icon name="arrow" />}</button></div></article> })}</div></main>
}

function ParentPage({ state }: { state: GameState }) {
  const job = jobById(state.selectedJobId)
  return <main className="page-shell parent-page"><section className="parent-hero"><span className="eyebrow">保護者の方へ</span><h1>「正しく選べたか」より、<br />「なぜ選んだか」を会話に。</h1><p>仕事とお金が、人や公共サービスを通じて循環することを体験する教材です。</p></section><div className="parent-columns"><section><h2>この教材で扱うこと</h2><ul className="check-list"><li>仕事は誰かの困りごとを助けること</li><li>収入・支出・貯蓄・税の簡単な関係</li><li>限られた予算には優先順位が必要なこと</li><li>無償のケアや地域活動も社会を支えること</li></ul><div className="important-note"><Icon name="info" /><p>価格・給料・税金はすべて架空の簡略値です。現実の給料や税率を表すものではありません。</p></div></section><section><h2>今回の体験</h2>{state.hasStarted ? <dl className="parent-record"><div><dt>仕事</dt><dd>{job?.name ?? 'まだ選んでいません'}</dd></div><div><dt>お金の使い方</dt><dd>{state.spending.map((item) => expenseChoices.find((choice) => choice.id === item.choiceId)?.name).filter(Boolean).join('・') || 'まだ選んでいません'}</dd></div><div><dt>使い方の理由</dt><dd>{state.spendingReason || 'まだ記録がありません'}</dd></div><div><dt>予算で多くした所</dt><dd>{publicServices.filter((service) => state.budget[service.id] >= 2).map((service) => service.name).join('・')}</dd></div></dl> : <p>一週間を始めると、ここに体験の記録が表示されます。</p>}</section></div><section className="prompt-section"><span className="eyebrow">会話のきっかけ</span><h2>こんなふうに聞いてみてください</h2><div className="prompt-grid">{parentPrompts.map((prompt, index) => <div key={prompt}><span>0{index + 1}</span><p>{prompt}</p></div>)}</div></section><section className="privacy-section"><Icon name="community" /><div><h2>個人情報について</h2><p>ログインはなく、入力した内容はこの端末のブラウザ内だけに保存されます。外部サーバーへ送信しません。進捗はホームから消去できます。</p></div></section></main>
}

function App() {
  const game = useGame()
  const { state } = game
  const job = jobById(state.selectedJobId)
  const currentProblem = problemById(state.selectedProblemId)
  const selectedJobCandidate = job ?? jobById(currentProblem?.relatedJobs[0] ?? null)
  const selectedJob = selectedJobCandidate && coreJobIds.includes(selectedJobCandidate.id) ? selectedJobCandidate : undefined

  const goBack = () => {
    const previous: Partial<Record<Screen, Screen>> = { town: 'home', workplace: 'town', problem: 'map', job: 'workplace', mission: 'job', payslip: 'town', spend: 'town', event: 'town', 'day-end': 'town', 'week-report': 'home', budget: 'event', flow: 'budget', reflection: 'flow' }
    game.setScreen(previous[state.screen] ?? 'home')
  }

  const body = useMemo(() => {
    switch (state.screen) {
      case 'opening': return <Opening hasProgress={state.hasStarted} canContinue={state.hasStarted && !state.weekComplete} weekComplete={state.weekComplete} onStart={() => { if (state.hasStarted && !state.weekComplete && !window.confirm('いまの つづきが きえます。はじめから やりますか？')) return; game.startWeek(false) }} onContinue={() => game.startWeek(true)} />
      case 'home': return <Home state={state} onStart={() => { if (state.hasStarted && !state.weekComplete && !window.confirm('いまの つづきが きえます。はじめから やりますか？')) return; game.startWeek(false) }} onContinue={() => game.startWeek(true)} onNavigate={game.setScreen} onReset={() => { if (window.confirm('進みぐあいをすべて消しますか？')) game.reset() }} />
      case 'workplace': return <WorkplaceCenter state={state} onSelect={game.selectJob} onMap={() => game.setScreen('town')} />
      case 'map': return <TownMapPage state={state} onProblem={() => game.setScreen('problem')} />
      case 'town': return <TownSimulator state={state} onWork={() => game.setScreen('workplace')} onShop={() => game.setScreen('spend')} onHome={game.goHome} />
      case 'problem': return <ProblemPage state={state} onSelect={game.selectProblem} />
      case 'job': return selectedJob ? <JobBriefing job={selectedJob} skillLevel={state.simulation.jobStats[selectedJob.id].level} demandBonus={demandBonusFor(state.simulation, selectedJob.id)} resumeShift={Boolean(readShiftProgress(state.week, state.simulation.day, selectedJob.id))} onBack={() => game.setScreen('workplace')} onStart={() => game.beginMission(selectedJob.id)} /> : <WorkplaceCenter state={state} onSelect={game.selectJob} onMap={() => game.setScreen('town')} />
      case 'mission': return selectedJob ? <Mission job={selectedJob} week={state.week} day={state.simulation.day} skillLevel={state.simulation.jobStats[selectedJob.id].level} demandBonus={demandBonusFor(state.simulation, selectedJob.id)} onComplete={game.completeMission} /> : null
      case 'payslip': return selectedJob ? <PaydaySimulator job={selectedJob} state={state} onNext={() => game.setScreen('town')} /> : null
      case 'spend': return <SpendSimulator state={state} onSave={game.saveSpending} />
      case 'event': return <EventPage state={state} onChoose={game.chooseEventResponse} onNext={game.completeDay} />
      case 'day-end': return <DayEndSimulator state={state} onNext={game.startNextDay} onReport={game.openWeekReport} />
      case 'week-report': return <WeekReport state={state} onNextWeek={(investment: TownNeed) => game.startWeek(false, investment)} />
      case 'budget': return <BudgetPage state={state} onSave={game.saveBudget} />
      case 'flow': return <FlowPage onNext={() => game.setScreen('reflection')} />
      case 'reflection': return <ReflectionPage state={state} onSave={game.saveReflections} onHome={() => game.setScreen('home')} onNextWeek={() => game.startWeek(false)} />
      case 'encyclopedia': return <Encyclopedia state={state} onTry={(id) => { if (state.weekComplete) { game.startWeek(false); return } game.selectJob(id) }} />
      case 'parent': return <ParentPage state={state} />
    }
  }, [game, selectedJob, state])

  return <div className="app"><AppHeader screen={state.screen} state={state} onHome={() => game.setScreen('home', true)} onMap={() => game.setScreen(state.weekComplete && state.resumeScreen === 'week-report' ? 'week-report' : state.hasStarted ? 'town' : 'map', true)} onBack={goBack} />{simulationScreens.includes(state.screen) && <SimulationHUD state={state} />}{body}<footer className="app-footer"><span>つながりタウン</span><span>この教材の数は架空のものです。</span></footer></div>
}

export default App
