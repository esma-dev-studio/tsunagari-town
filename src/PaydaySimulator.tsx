import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Icon } from './Icon'
import type { GameState, Job } from './types'
import './paydaySimulator.css'

type PaydayPhase = 'tax' | 'wallet' | 'done'
type DropTarget = 'tax' | 'wallet'

interface DragState {
  id: number
  startX: number
  startY: number
  dx: number
  dy: number
  moved: boolean
}

interface WalletDragState {
  startX: number
  startY: number
  dx: number
  dy: number
  moved: boolean
}

function dropTargetAtPoint(clientX: number, clientY: number): DropTarget | null {
  if (typeof document === 'undefined') return null

  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const target = element.closest<HTMLElement>('[data-payday-target]')?.dataset.paydayTarget
    if (target === 'tax' || target === 'wallet') return target
  }
  return null
}

export function PaydaySimulator({ job, state, onNext }: { job: Job; state: GameState; onNext: () => void }) {
  const result = state.simulation.lastShift
  const grossPay = Math.max(0, result?.grossPay ?? job.reward)
  const tax = Math.max(0, Math.min(result?.tax ?? job.shared, grossPay))
  const takeHome = Math.max(0, grossPay - tax)
  const walletBeforePay = Math.max(0, state.wallet - takeHome)

  const [phase, setPhase] = useState<PaydayPhase>(tax > 0 ? 'tax' : 'wallet')
  const [taxCoinIds, setTaxCoinIds] = useState<number[]>([])
  const [coinDrag, setCoinDrag] = useState<DragState | null>(null)
  const [walletDrag, setWalletDrag] = useState<WalletDragState | null>(null)
  const [message, setMessage] = useState(
    tax > 0
      ? `コインを ${tax}まい、まちの はこへ！`
      : 'のこりの コインを、まとめて おさいふへ！',
  )

  const taxCoinIdsRef = useRef(new Set<number>())
  const coinDragRef = useRef<DragState | null>(null)
  const walletDragRef = useRef<WalletDragState | null>(null)
  const suppressCoinClickRef = useRef<{ coinId: number; until: number } | null>(null)
  const suppressWalletClickUntilRef = useRef(0)

  const taxComplete = taxCoinIds.length === tax

  useEffect(() => {
    if (phase !== 'tax' || !taxComplete) return
    const timer = window.setTimeout(() => {
      setPhase('wallet')
      setMessage(`のこり ${takeHome}まいを、まとめて おさいふへ！`)
    }, 650)
    return () => window.clearTimeout(timer)
  }, [phase, takeHome, taxComplete])

  useEffect(() => {
    const stopDragging = () => {
      coinDragRef.current = null
      walletDragRef.current = null
      setCoinDrag(null)
      setWalletDrag(null)
    }
    window.addEventListener('blur', stopDragging)
    return () => window.removeEventListener('blur', stopDragging)
  }, [])

  const moveTaxCoin = useCallback((coinId: number) => {
    if (phase !== 'tax' || taxCoinIdsRef.current.has(coinId) || taxCoinIdsRef.current.size >= tax) return

    const next = new Set(taxCoinIdsRef.current)
    next.add(coinId)
    taxCoinIdsRef.current = next
    setTaxCoinIds([...next])

    const left = tax - next.size
    setMessage(left > 0 ? `はいった！ あと ${left}まい！` : `ぴったり ${tax}まい！ まちの お金になったよ！`)
  }, [phase, tax])

  const finishWallet = useCallback(() => {
    if (phase !== 'wallet') return
    setPhase('done')
    setMessage(`${takeHome}まいが おさいふに はいった！`)
  }, [phase, takeHome])

  const beginCoinDrag = (event: ReactPointerEvent<HTMLButtonElement>, coinId: number) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const next = { id: coinId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false }
    coinDragRef.current = next
    setCoinDrag(next)
  }

  const moveCoinDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = coinDragRef.current
    if (!current || current.id !== Number(event.currentTarget.dataset.paydayCoin)) return
    event.preventDefault()
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    const next = { ...current, dx, dy, moved: current.moved || Math.hypot(dx, dy) > 7 }
    coinDragRef.current = next
    setCoinDrag(next)
  }

  const endCoinDrag = (event: ReactPointerEvent<HTMLButtonElement>, coinId: number) => {
    const current = coinDragRef.current
    if (!current || current.id !== coinId) return
    event.preventDefault()
    const target = dropTargetAtPoint(event.clientX, event.clientY)
    suppressCoinClickRef.current = current.moved
      ? { coinId, until: Date.now() + 450 }
      : null
    coinDragRef.current = null
    setCoinDrag(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (target === 'tax') {
      suppressCoinClickRef.current = null
      moveTaxCoin(coinId)
    } else if (current.moved) {
      setMessage('コインを もどしたよ。みどりの はこへ はこぼう！')
    }
  }

  const cancelCoinDrag = () => {
    coinDragRef.current = null
    setCoinDrag(null)
  }

  const beginWalletDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const next = { startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false }
    walletDragRef.current = next
    setWalletDrag(next)
  }

  const moveWalletDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = walletDragRef.current
    if (!current) return
    event.preventDefault()
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    const next = { ...current, dx, dy, moved: current.moved || Math.hypot(dx, dy) > 7 }
    walletDragRef.current = next
    setWalletDrag(next)
  }

  const endWalletDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = walletDragRef.current
    if (!current) return
    event.preventDefault()
    const target = dropTargetAtPoint(event.clientX, event.clientY)
    suppressWalletClickUntilRef.current = current.moved ? Date.now() + 450 : 0
    walletDragRef.current = null
    setWalletDrag(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (target === 'wallet') {
      suppressWalletClickUntilRef.current = 0
      finishWallet()
    } else if (current.moved) {
      setMessage('コインを もどしたよ。青い おさいふへ はこぼう！')
    }
  }

  const cancelWalletDrag = () => {
    walletDragRef.current = null
    setWalletDrag(null)
  }

  return (
    <main className="page-shell payday-simulator">
      <header className="payday-heading">
        <div className="payday-job-stamp" aria-hidden="true"><Icon name="briefcase" /></div>
        <div>
          <span className="eyebrow">{job.shortName}の おしごと かんりょう！</span>
          <h1>おきゅうりょうを<br />じぶんで 分けよう！</h1>
        </div>
        <div className="payday-gross-badge" aria-label={`もらった給料 ${grossPay}コイン`}>
          <span>もらった</span>
          <strong>{grossPay}</strong>
          <small>コイン</small>
        </div>
      </header>

      <section className={`payday-game phase-${phase}`} aria-label="給料を分けるゲーム">
        <div className="payday-steps" aria-label="ゲームの進みぐあい">
          <span className={phase === 'tax' ? 'is-current' : 'is-done'}>
            <b>{phase === 'tax' ? '1' : <Icon name="check" />}</b>
            ぜいきんを 分ける
          </span>
          <Icon name="arrow" />
          <span className={phase === 'wallet' ? 'is-current' : phase === 'done' ? 'is-done' : ''}>
            <b>{phase === 'done' ? <Icon name="check" /> : '2'}</b>
            のこりを おさいふへ
          </span>
        </div>

        <div className="payday-message" role="status" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true">{phase === 'done' ? '🎉' : phase === 'wallet' ? '👛' : '☝️'}</span>
          <strong>{message}</strong>
          {phase !== 'done' && <small>ドラッグ、または コインを おすだけでも OK！</small>}
        </div>

        <div className="payday-board">
          <section className="payday-tray-panel" aria-labelledby="payday-tray-title">
            <div className="payday-panel-label">
              <span id="payday-tray-title">きゅうりょうトレー</span>
              <strong>{phase === 'tax' ? `${grossPay - taxCoinIds.length}まい` : phase === 'wallet' ? `${takeHome}まい` : 'からっぽ'}</strong>
            </div>

            {phase === 'tax' && (
              <div className="payday-coin-tray" aria-label={`給料コイン。残り${grossPay - taxCoinIds.length}まい`}>
                {Array.from({ length: grossPay }, (_, coinId) => {
                  if (taxCoinIdsRef.current.has(coinId)) return null
                  const drag = coinDrag?.id === coinId ? coinDrag : null
                  const style: CSSProperties | undefined = drag
                    ? { transform: `translate3d(${drag.dx}px, ${drag.dy}px, 0) scale(1.12)`, zIndex: 10 }
                    : undefined
                  return (
                    <button
                      type="button"
                      key={coinId}
                      data-payday-coin={coinId}
                      className={`payday-coin ${drag ? 'is-dragging' : ''}`}
                      style={style}
                      disabled={taxComplete}
                      aria-label="1コイン。まちの箱へドラッグ。押すだけでも入ります"
                      onClick={() => {
                        const suppressed = suppressCoinClickRef.current
                        if (suppressed?.coinId === coinId && Date.now() < suppressed.until) {
                          suppressCoinClickRef.current = null
                          return
                        }
                        suppressCoinClickRef.current = null
                        moveTaxCoin(coinId)
                      }}
                      onPointerDown={(event) => beginCoinDrag(event, coinId)}
                      onPointerMove={moveCoinDrag}
                      onPointerUp={(event) => endCoinDrag(event, coinId)}
                      onPointerCancel={cancelCoinDrag}
                      onLostPointerCapture={cancelCoinDrag}
                    >
                      <Icon name="coin" />
                      <span>1</span>
                    </button>
                  )
                })}
              </div>
            )}

            {phase === 'wallet' && (
              <button
                type="button"
                className={`payday-take-home-pile ${walletDrag ? 'is-dragging' : ''}`}
                style={walletDrag ? { transform: `translate3d(${walletDrag.dx}px, ${walletDrag.dy}px, 0) scale(1.04)`, zIndex: 10 } : undefined}
                aria-label={`手取り${takeHome}コイン。おさいふへドラッグ。押すだけでも入ります`}
                onClick={() => {
                  if (Date.now() < suppressWalletClickUntilRef.current) {
                    suppressWalletClickUntilRef.current = 0
                    return
                  }
                  suppressWalletClickUntilRef.current = 0
                  finishWallet()
                }}
                onPointerDown={beginWalletDrag}
                onPointerMove={moveWalletDrag}
                onPointerUp={endWalletDrag}
                onPointerCancel={cancelWalletDrag}
                onLostPointerCapture={cancelWalletDrag}
              >
                <span className="payday-pile-coins" aria-hidden="true">
                  {Array.from({ length: takeHome }, (_, index) => <i key={index}><Icon name="coin" /></i>)}
                </span>
                <strong>のこり {takeHome}まいを<br />まとめて もつ！</strong>
              </button>
            )}

            {phase === 'done' && (
              <div className="payday-empty-tray" aria-hidden="true">
                <span>✨</span><Icon name="check" /><span>✨</span>
                <strong>ぜんぶ 分けられた！</strong>
              </div>
            )}
          </section>

          <div className="payday-board-arrow" aria-hidden="true"><Icon name="arrow" /></div>

          <section className="payday-targets" aria-label="コインを入れるところ">
            <div
              className={`payday-tax-box ${phase === 'tax' ? 'is-active' : ''} ${taxComplete ? 'is-complete' : ''}`}
              data-payday-target="tax"
              aria-label={`まちの税金の箱。${taxCoinIds.length}まい入り、必要なのは${tax}まい`}
            >
              <div className="payday-town-services" aria-hidden="true"><span>🏫</span><span>🛣️</span><span>🌳</span></div>
              <Icon name="community" />
              <span><small>まちで みんなが つかう</small><strong>ぜいきんの はこ</strong></span>
              <b>{taxCoinIds.length} / {tax}まい</b>
              <div className="payday-box-coins" aria-hidden="true">
                {taxCoinIds.map((coinId) => <i key={coinId}><Icon name="coin" /></i>)}
              </div>
            </div>

            <div
              className={`payday-wallet-target ${phase === 'wallet' ? 'is-active' : ''} ${phase === 'done' ? 'is-complete' : ''}`}
              data-payday-target="wallet"
              aria-label={phase === 'done' ? `おさいふに全部で${state.wallet}コイン` : `おさいふ。今は${walletBeforePay}コイン`}
            >
              {phase === 'done' && <span className="payday-wallet-burst" aria-hidden="true">✨ +{takeHome} ✨</span>}
              <Icon name="wallet" />
              <span><small>じぶんで つかえる</small><strong>おさいふ</strong></span>
              <b>{phase === 'done' ? state.wallet : walletBeforePay}まい</b>
            </div>
          </section>
        </div>

        <div className="payday-equation" aria-label={`${grossPay}ひく${tax}は${takeHome}`}>
          <span><small>もらった</small><strong>{grossPay}</strong></span>
          <b>−</b>
          <span><small>ぜいきん</small><strong>{tax}</strong></span>
          <b>＝</b>
          <span className="is-take-home"><small>じぶんで つかえる</small><strong>{takeHome}</strong></span>
        </div>

        {phase === 'done' && (
          <div className="payday-finish" role="status">
            <div>
              <span aria-hidden="true">👛</span>
              <p>まえから {walletBeforePay}まい ＋ きょう {takeHome}まい</p>
              <h2>おさいふは {state.wallet}まい！</h2>
            </div>
            <button type="button" className="button button-primary button-large" onClick={onNext}>
              おさいふを もって まちへ<Icon name="arrow" />
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
