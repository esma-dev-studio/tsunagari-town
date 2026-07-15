import { Icon, type IconName } from './Icon'
import type { MoneyRecord, MoneyRecordKind } from './types'
import './moneyBook.css'

interface MoneyBookProps {
  wallet: number
  savings: number
  totalSharedPaid: number
  ledger: MoneyRecord[]
}

const SAVINGS_GOAL = 10

const recordAppearance: Record<MoneyRecordKind, { icon: IconName; action: string }> = {
  carryover: { icon: 'wallet', action: 'これまで' },
  income: { icon: 'briefcase', action: 'おきゅうりょう' },
  tax: { icon: 'community', action: 'ぜいきん' },
  spend: { icon: 'shop', action: 'つかった' },
  save: { icon: 'piggy', action: 'ちょきん' },
  event: { icon: 'info', action: 'できごと' },
}

function coinAmount(amount: number) {
  const sign = amount > 0 ? '＋' : amount < 0 ? '−' : ''
  return `${sign}${Math.abs(amount)}コイン`
}

export function MoneyBook({ wallet, savings, totalSharedPaid, ledger }: MoneyBookProps) {
  const safeSavings = Math.max(0, savings)
  const savedTowardGoal = Math.min(SAVINGS_GOAL, Math.floor(safeSavings))
  const coinsToGoal = Math.max(0, SAVINGS_GOAL - safeSavings)
  const recentRecords = ledger.slice(-4).reverse()

  return (
    <section className="money-book" aria-labelledby="money-book-title">
      <div className="money-book-heading">
        <div className="money-book-heading-icon" aria-hidden="true">
          <Icon name="book" />
        </div>
        <div>
          <span>お金は いま どうなっている？</span>
          <h2 id="money-book-title">わたしの お金のきろく</h2>
        </div>
      </div>

      <div className="money-book-balances">
        <article className="money-balance-card money-balance-wallet">
          <span className="money-balance-icon" aria-hidden="true"><Icon name="wallet" /></span>
          <div>
            <small>いま つかえる</small>
            <h3>おさいふ</h3>
          </div>
          <strong>{Math.max(0, wallet)}<small>コイン</small></strong>
          <p>お店で つかえる お金だよ</p>
        </article>

        <article className="money-balance-card money-balance-savings">
          <span className="money-balance-icon" aria-hidden="true"><Icon name="piggy" /></span>
          <div>
            <small>あとで つかう</small>
            <h3>ちょきん</h3>
          </div>
          <strong>{safeSavings}<small>コイン</small></strong>
          <div
            className="savings-coin-row"
            role="progressbar"
            aria-label={`ちょきんのもくひょう ${SAVINGS_GOAL}コインのうち ${safeSavings}コイン`}
            aria-valuemin={0}
            aria-valuemax={SAVINGS_GOAL}
            aria-valuenow={savedTowardGoal}
          >
            {Array.from({ length: SAVINGS_GOAL }, (_, index) => (
              <span className={index < savedTowardGoal ? 'is-saved' : ''} key={index} aria-hidden="true">●</span>
            ))}
          </div>
          <p>{coinsToGoal === 0 ? 'もくひょう たっせい！' : `もくひょうまで あと ${coinsToGoal}コイン`}</p>
        </article>

        <article className="money-balance-card money-balance-shared">
          <span className="money-balance-icon" aria-hidden="true"><Icon name="community" /></span>
          <div>
            <small>みんなで つかう</small>
            <h3>ぜいきん</h3>
          </div>
          <strong>{Math.max(0, totalSharedPaid)}<small>コイン</small></strong>
          <p>道や 学校を よくする お金だよ</p>
        </article>
      </div>

      <div className="money-ledger">
        <div className="money-ledger-heading">
          <h3>さいきんの お金のうごき</h3>
          <span>あたらしい きろくから 4つ</span>
        </div>

        {recentRecords.length > 0 ? (
          <ol className="money-ledger-list">
            {recentRecords.map((record) => {
              const appearance = recordAppearance[record.kind]
              const amountTone = record.amount > 0 ? 'is-plus' : record.amount < 0 ? 'is-minus' : 'is-zero'

              return (
                <li key={record.id} className={`money-ledger-record is-${record.kind}`}>
                  <span className="money-ledger-icon" aria-hidden="true"><Icon name={appearance.icon} /></span>
                  <span className="money-ledger-copy">
                    <small>第{record.week}回・{appearance.action}</small>
                    <strong>{record.label}</strong>
                  </span>
                  <strong className={`money-ledger-amount ${amountTone}`}>{coinAmount(record.amount)}</strong>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="money-ledger-empty">
            <Icon name="coin" aria-hidden="true" />
            <p><strong>まだ きろくは ないよ</strong><br />仕事をすると、ここに お金のうごきが のるよ。</p>
          </div>
        )}
      </div>
    </section>
  )
}
