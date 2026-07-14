import { useState } from 'react'
import { Icon } from './Icon'
import type { GameState, Job } from './types'
import './paydaySimulator.css'

type PaydayPhase = 'receive' | 'tax' | 'wallet'

export function PaydaySimulator({ job, state, onNext }: { job: Job; state: GameState; onNext: () => void }) {
  const [phase, setPhase] = useState<PaydayPhase>('receive')
  const result = state.simulation.lastShift
  const grossPay = result?.grossPay ?? job.reward
  const tax = result?.tax ?? job.shared
  const bonus = (result?.bonus ?? 0) + (result?.demandBonus ?? 0)
  const takeHome = grossPay - tax
  const quality = result?.quality ?? 2
  return <main className="page-shell payday-simulator">
    <section className="payday-heading"><div><span className="eyebrow">シフト おつかれさま</span><h1>タイムカードを おしたら、<br />おきゅうりょうの じかん</h1><p>{job.townEffect}</p></div><div className="payday-timecard"><span>OUT</span><Icon name="check" /><strong>たいきん</strong><small>いらい 2けん かんりょう</small></div></section>

    <ol className="payday-steps" aria-label="給料を受け取る3つの場面"><li className={phase === 'receive' ? 'is-current' : 'is-done'}><span>{phase === 'receive' ? 1 : <Icon name="check" />}</span>トレーを うけとる</li><li className={phase === 'tax' ? 'is-current' : phase === 'wallet' ? 'is-done' : ''}><span>{phase === 'wallet' ? <Icon name="check" /> : 2}</span>ぜいきんを 分ける</li><li className={phase === 'wallet' ? 'is-current' : ''}><span>3</span>おさいふへ 入れる</li></ol>

    <section className={`pay-counter phase-${phase}`}>
      <div className="pay-clerk-scene"><div className="pay-window-sign"><Icon name="briefcase" />{job.shortName} きゅうりょうまどぐち</div><div className="pay-clerk" aria-hidden="true"><i /><b /></div><blockquote>「2けんの いらい、ありがとう。<br />ていねいさ ★{quality}、{grossPay}コインです」</blockquote><div className="pay-counter-desk" /></div>
      <div className="pay-workspace">
        <div className="salary-slip"><span>つながりタウン きゅうりょう</span><dl><div><dt>基本給{bonus > 0 ? ` ＋ ボーナス${bonus}` : ''}</dt><dd>{grossPay}</dd></div><div><dt>街でいっしょに使う</dt><dd>−{tax}</dd></div><div><dt>じぶんで使える</dt><dd>{takeHome}</dd></div></dl></div>
        <div className="salary-tray" aria-label={`${grossPay}枚の給料コイン`}><span>きゅうりょうトレー</span><div>{Array.from({ length: grossPay }, (_, index) => <i key={index} className={phase !== 'receive' && index < tax ? 'is-tax' : phase === 'wallet' ? 'is-wallet' : ''}><Icon name="coin" /></i>)}</div></div>

        {phase === 'receive' && <div className="payday-action"><h2>{grossPay}まいの コインを うけとろう</h2><p>基本給に、ていねいさや 街のたすけてボーナスが つきました。</p><button type="button" className="button button-primary button-large" onClick={() => setPhase('tax')}><Icon name="coin" />きゅうりょうトレーを うけとる</button></div>}

        {phase === 'tax' && <div className="payday-action"><h2>{tax}まいを、街の はこへ</h2><p>学校、道、公園などを、みんなで使えるようにするお金です。</p><div className="tax-drop-zone"><Icon name="home" /><span><small>街で いっしょに使う</small><strong>ぜいきんの はこ</strong></span><b>{tax}コイン</b></div><button type="button" className="button button-primary button-large" onClick={() => setPhase('wallet')}><Icon name="community" />{tax}コインを 街のはこへ 入れる</button></div>}

        {phase === 'wallet' && <div className="payday-action"><div className="payday-success"><Icon name="check" /><span><small>{grossPay} − {tax} ＝ {takeHome}</small><h2>{takeHome}コインが おさいふへ！</h2></span></div><p>前から のこした分も あわせると、いまのおさいふは <strong>{state.wallet}コイン</strong>。</p><div className="wallet-drop-zone"><Icon name="wallet" /><span><small>いま つかえる</small><strong>{state.wallet}コイン</strong></span></div><button type="button" className="button button-primary button-large" onClick={onNext}>おさいふをもって 街へ もどる<Icon name="arrow" /></button></div>}
      </div>
    </section>

    <details className="learn-more payday-learn"><summary>ぜいきんは、何に つかうの？</summary><p>みんなで少しずつ出して、学校、道路、公園、消防などに使います。このゲームでは分かりやすくするため、給料{grossPay}コインのうち{tax}コインとして体験します。3日目のあとに、どこへ生かすかをえらべます。ほんとうの金額や割合とはちがいます。</p></details>
  </main>
}
