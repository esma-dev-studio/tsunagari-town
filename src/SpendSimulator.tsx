import { useEffect, useRef, useState } from 'react'
import { expenseChoices } from './data'
import { Icon, type IconName } from './Icon'
import type { GameState, SpendingRecord } from './types'
import './spendSimulator.css'

type SpendPhase = 'shop' | 'checkout' | 'bank'
type SpendDraft = { phase: SpendPhase; basketIds: string[]; deposit: number; paid: boolean; reason: string }

const readSpendDraft = (key: string): SpendDraft | null => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<SpendDraft> | null
    if (!value || !['shop', 'checkout', 'bank'].includes(value.phase ?? '')) return null
    return {
      phase: value.phase as SpendPhase,
      basketIds: Array.isArray(value.basketIds) ? value.basketIds.filter((id): id is string => typeof id === 'string') : [],
      deposit: typeof value.deposit === 'number' ? Math.max(0, value.deposit) : 0,
      paid: value.paid === true,
      reason: typeof value.reason === 'string' ? value.reason : '',
    }
  } catch {
    return null
  }
}

export function SpendSimulator({ state, onSave }: { state: GameState; onSave: (records: SpendingRecord[], reason: string) => void }) {
  const draftKey = `tsunagari-town-spend-draft-v1-${state.week}-${state.simulation.day}`
  const spendSource = `week-${state.week}-day-${state.simulation.day}-spend`
  const eventSource = `week-${state.week}-day-${state.simulation.day}-event`
  const currentSpendWalletDelta = state.ledger.filter((record) => record.source === spendSource).reduce((sum, record) => sum + record.walletDelta, 0)
  const currentSpendSavingsDelta = state.ledger.filter((record) => record.source === spendSource).reduce((sum, record) => sum + record.savingsDelta, 0)
  const currentEventWalletDelta = state.ledger.filter((record) => record.source === eventSource).reduce((sum, record) => sum + record.walletDelta, 0)
  const currentEventSavingsDelta = state.ledger.filter((record) => record.source === eventSource).reduce((sum, record) => sum + record.savingsDelta, 0)
  const available = Math.max(0, state.wallet - currentSpendWalletDelta - currentEventWalletDelta)
  const savingsBefore = Math.max(0, state.savings - currentSpendSavingsDelta - currentEventSavingsDelta)
  const takeHome = Math.max(0, state.grossEarned - state.sharedPaid)
  const previousMoney = Math.max(0, available - takeHome)
  const shopChoices = expenseChoices.filter((choice) => choice.id !== 'savings')
  const previousDeposit = state.spending.find((item) => item.choiceId === 'savings')?.amount ?? 0
  const phaseRef = useRef<HTMLElement>(null)
  const [draft] = useState(() => readSpendDraft(draftKey))
  const [phase, setPhase] = useState<SpendPhase>(draft?.phase ?? 'shop')
  const [basketIds, setBasketIds] = useState(draft?.basketIds ?? state.spending.filter((item) => item.choiceId !== 'savings').map((item) => item.choiceId))
  const [deposit, setDeposit] = useState(draft?.deposit ?? previousDeposit)
  const [paid, setPaid] = useState(draft?.paid ?? false)
  const [reason, setReason] = useState(draft?.reason ?? state.spendingReason)

  const purchaseTotal = shopChoices.filter((choice) => basketIds.includes(choice.id)).reduce((sum, choice) => sum + choice.cost, 0)
  const cashAfterRegister = Math.max(0, available - purchaseTotal)
  const safeDeposit = Math.min(deposit, cashAfterRegister)
  const walletAfter = cashAfterRegister - safeDeposit
  const savingsAfter = savingsBefore + safeDeposit
  const basketChoices = shopChoices.filter((choice) => basketIds.includes(choice.id))
  useEffect(() => {
    const current = phaseRef.current
    current?.focus({ preventScroll: true })
    current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [phase])
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify({ phase, basketIds, deposit: safeDeposit, paid, reason }))
  }, [basketIds, deposit, draftKey, paid, phase, reason, safeDeposit])

  const toggleBasket = (id: string, cost: number) => {
    setBasketIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : purchaseTotal + cost <= available ? [...current, id] : current)
    setPaid(false)
  }

  const save = () => {
    const records: SpendingRecord[] = [
      ...basketChoices.map((choice) => ({ choiceId: choice.id, amount: choice.cost })),
      ...(safeDeposit > 0 ? [{ choiceId: 'savings', amount: safeDeposit }] : []),
    ]
    localStorage.removeItem(draftKey)
    onSave(records, reason || (safeDeposit > 0 ? 'つかう分と ためる分を じぶんで きめた' : 'いまの自分に合う使い方を考えた'))
  }

  return <main className="page-shell spend-journey">
    <section className="spend-sim-heading">
      <div><span className="eyebrow">しごと帰りの つながりタウン</span><h1>おきゅうりょうを もって、街へ でよう</h1><p>お店で買う、ぎんこうに あずける、おさいふに のこす。じぶんで やってみよう。</p></div>
      <div className="spend-money-equation"><div><small>この仕事で</small><strong>＋{takeHome}</strong></div><b>＋</b><div><small>前から</small><strong>{previousMoney}</strong></div><b>＝</b><div className="is-total"><small>つかえる</small><strong>{available}<span>コイン</span></strong></div></div>
    </section>

    <ol className="spend-phase-bar" aria-label="買い物と貯金の3つの場面">
      {[
        { id: 'shop', label: 'お店', icon: 'shop' as IconName },
        { id: 'checkout', label: 'レジ', icon: 'coin' as IconName },
        { id: 'bank', label: 'ぎんこう', icon: 'piggy' as IconName },
      ].map((item, index) => { const currentIndex = phase === 'shop' ? 0 : phase === 'checkout' ? 1 : 2; return <li key={item.id} className={index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : ''} aria-current={index === currentIndex ? 'step' : undefined}><span>{index < currentIndex ? <Icon name="check" /> : <Icon name={item.icon} />}</span><strong>{index + 1}. {item.label}</strong>{index < 2 && <Icon name="arrow" />}</li> })}
    </ol>

    {phase === 'shop' && <section ref={phaseRef} tabIndex={-1} className="town-shop-simulator">
      <div className="shop-front"><div className="shop-awning" /><div className="shop-clerk" aria-hidden="true"><i /><b /></div><div><span className="eyebrow">まちのお店</span><h2>ほしいものを かごへ 入れよう</h2><p>買わずに、ぜんぶ のこしても だいじょうぶ。</p></div></div>
      <div className="shop-simulator-layout">
        <div className="shop-shelves">{shopChoices.map((choice) => { const active = basketIds.includes(choice.id); const remaining = available - purchaseTotal; const unavailable = !active && choice.cost > remaining; const icon: Record<string, IconName> = { need: 'home', want: 'book', help: 'heart', shop: 'shop', save: 'piggy' }; return <article className={`shop-product ${active ? 'is-in-basket' : ''}`} key={choice.id}><div className="product-picture"><Icon name={icon[choice.category]} /><span>{choice.childDescription}</span></div><h3>{choice.name}</h3><p>{choice.effect}</p><strong className="product-price">{choice.cost}<small>コイン</small></strong><button type="button" aria-label={`${choice.name}を ${active ? 'かごから もどす' : 'かごに 入れる'}`} disabled={unavailable} className={`button ${active ? 'button-secondary' : 'button-primary'}`} onClick={() => toggleBasket(choice.id, choice.cost)}>{active ? <><Icon name="back" />かごから もどす</> : <><Icon name="shop" />かごに 入れる</>}</button></article> })}</div>
        <aside className="shopping-basket" aria-live="polite"><div className="basket-handle" /><span><Icon name="shop" />かいものかご</span>{basketChoices.length ? <ul>{basketChoices.map((choice) => <li key={choice.id}><span>{choice.name}</span><strong>{choice.cost}</strong></li>)}</ul> : <p>まだ からっぽだよ。<br />買わないなら、そのままレジへ。</p>}<div className="basket-total"><span>ごうけい</span><strong>{purchaseTotal}<small>コイン</small></strong></div><div className="basket-wallet"><Icon name="wallet" /><span>はらった あと<strong>{cashAfterRegister}コイン</strong></span></div><button type="button" className="button button-primary button-large" onClick={() => { setPhase('checkout'); setPaid(false) }}>かごを もって レジへ<Icon name="arrow" /></button></aside>
      </div>
    </section>}

    {phase === 'checkout' && <section ref={phaseRef} tabIndex={-1} className={`checkout-simulator ${paid ? 'is-paid' : ''}`}>
      <div className="checkout-counter-scene"><div className="cashier" aria-hidden="true"><i /><b /></div><div className="register"><span>レジ</span><strong>{purchaseTotal}</strong><small>コイン</small></div><div className="checkout-bag">{basketChoices.length ? basketChoices.map((choice) => <span key={choice.id}><Icon name={choice.category === 'need' ? 'home' : choice.category === 'want' ? 'book' : choice.category === 'help' ? 'heart' : 'shop'} /></span>) : <small>買わない</small>}</div></div>
      <div className="checkout-dialog"><span className="eyebrow">店の人</span><h2>「{purchaseTotal ? `${purchaseTotal}コインです` : 'きょうは 買わないんだね'}」</h2><p>{purchaseTotal ? 'おさいふから、ひつような まい数を レジへ はらおう。' : 'お金を のこすのも、じぶんで きめた つかい方です。'}</p></div>
      <div className="checkout-coins" aria-label={`${available}コインのうち${purchaseTotal}コインを支払う`}>{Array.from({ length: Math.min(available, 30) }, (_, index) => <span key={index} className={paid && index < purchaseTotal ? 'is-paid' : ''}><Icon name="coin" /></span>)}{available > 30 && <strong className="coin-overflow-label">＋{available - 30}</strong>}</div>
      <div className="checkout-result"><div><small>おさいふ</small><strong>{available}</strong></div><Icon name="arrow" /><div><small>お店へ</small><strong>−{purchaseTotal}</strong></div><Icon name="arrow" /><div className="is-left"><small>のこり</small><strong>{cashAfterRegister}</strong></div></div>
      <div className="checkout-actions"><button type="button" className="button button-secondary" onClick={() => { setPhase('shop'); setPaid(false) }}><Icon name="back" />商品を えらびなおす</button>{!paid && purchaseTotal > 0 ? <button type="button" className="button button-primary button-large" onClick={() => setPaid(true)}><Icon name="coin" />コインを レジへ はらう</button> : <button type="button" className="button button-primary button-large" onClick={() => { setPhase('bank'); setDeposit(Math.min(safeDeposit, cashAfterRegister)) }}>{purchaseTotal > 0 ? 'レシートをもって ぎんこうへ' : 'そのまま ぎんこうへ'}<Icon name="arrow" /></button>}</div>
    </section>}

    {phase === 'bank' && <section ref={phaseRef} tabIndex={-1} className="bank-simulator">
      <div className="bank-building"><div className="bank-sign"><Icon name="piggy" /><span>つながり ぎんこう</span></div><div className="bank-window"><div className="bank-clerk" aria-hidden="true"><i /><b /></div><p>「なんコイン<br />あずけますか？」</p></div></div>
      <div className="bank-counter">
        <div className="bank-account is-wallet"><Icon name="wallet" /><span><small>おさいふ</small><strong>{walletAfter}<b>コイン</b></strong></span><div className="bank-coin-tray">{Array.from({ length: Math.min(walletAfter, 30) }, (_, index) => <i key={index}><Icon name="coin" /></i>)}{walletAfter > 30 && <strong className="coin-overflow-label">＋{walletAfter - 30}</strong>}</div></div>
        <div className="bank-transfer"><button type="button" disabled={safeDeposit >= cashAfterRegister} onClick={() => setDeposit((current) => Math.min(cashAfterRegister, current + 1))}><Icon name="arrow" />1コイン あずける</button><button type="button" disabled={safeDeposit <= 0} onClick={() => setDeposit((current) => Math.max(0, current - 1))}><Icon name="back" />1コイン もどす</button><strong>{safeDeposit}<small>コイン あずける</small></strong></div>
        <div className="bank-account is-savings"><Icon name="piggy" /><span><small>ちょきん</small><strong>{savingsBefore} → {savingsAfter}<b>コイン</b></strong></span><div className="savings-goal-mini"><span style={{ width: `${Math.min(100, savingsAfter * 10)}%` }} /><small>もくひょう 10コイン</small></div></div>
      </div>
      <section className="bank-receipt"><span>きょうの お金のきろく</span><dl><div><dt>お店で つかった</dt><dd>−{purchaseTotal}</dd></div><div><dt>ぎんこうに あずけた</dt><dd>{safeDeposit}</dd></div><div><dt>おさいふに のこした</dt><dd>{walletAfter}</dd></div></dl></section>
      <section className="spend-reason"><h3>どうして、この使い方にしたの？</h3><div>{['今、ひつようだから', 'あとで あんしんしたいから', 'だれかを たすけたいから'].map((text) => <button type="button" key={text} className={reason === text ? 'is-selected' : ''} onClick={() => setReason(text)}>{reason === text && <Icon name="check" />}{text}</button>)}</div><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={80} aria-label="このお金の使い方にした理由" placeholder="じぶんの ことばで 書いてもいいよ" /></section>
      <div className="bank-actions"><button type="button" className="button button-secondary" onClick={() => setPhase('checkout')}><Icon name="back" />レジへ もどる</button><button type="button" className="button button-primary button-large" onClick={save}><Icon name="book" />お金のきろくを つける</button></div>
    </section>}
  </main>
}
