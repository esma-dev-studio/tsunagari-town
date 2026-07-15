import { Icon, type IconName } from './Icon'
import type { JobId, Screen } from './types'
import './guide.css'

const actionGuides: Partial<Record<Screen, { icon: IconName; number: string; title: string; text: string }>> = {
  town: { icon: 'map', number: '1', title: 'まちで つぎの行き先を えらぶ', text: 'じかん・げんき・お金を見て きめよう' },
  map: { icon: 'map', number: '1', title: 'オレンジの まるを タップ', text: 'ひかっている ばしょを さがそう' },
  problem: { icon: 'heart', number: '2', title: 'たすけたい こまりごとを えらぶ', text: '3つの どれを えらんでも だいじょうぶ' },
  workplace: { icon: 'briefcase', number: '2', title: '街のようすを見て しごとを えらぶ', text: '好きな仕事でも、困っている仕事でもOK' },
  job: { icon: 'book', number: '3', title: '3つの そうさを 見る', text: 'ドラッグ・長おし・タイミングを たしかめよう' },
  mission: { icon: 'tools', number: '4', title: 'つかむ → うごかす → しあげる', text: 'まちがえても なおして つづけられるよ' },
  payslip: { icon: 'coin', number: '5', title: 'ぜいきんコインを うごかす', text: 'ぜいきんへ分けて、のこりは おさいふへ はこぼう' },
  spend: { icon: 'shop', number: '6', title: 'お店 → レジ → ぎんこう', text: '買う・ためる・のこすが 明日につながる' },
  event: { icon: 'weather', number: '6', title: 'どうするか 1つ えらぶ', text: 'たすけを つかうのも だいじょうぶ' },
  'day-end': { icon: 'home', number: '7', title: '今日のお金と街の変化を見る', text: '買ったものは 明日どうなるかな' },
  'week-report': { icon: 'community', number: '8', title: '3日間のせいせきと税金を 見る', text: 'つぎの街を よくする場所をえらぼう' },
  budget: { icon: 'home', number: '7', title: '10コインを まちに わける', text: '＋と − で ちょうせいしよう' },
  flow: { icon: 'arrow', number: '8', title: 'お金の やじるしを タップ', text: 'どこから どこへ いくのかな' },
  reflection: { icon: 'book', number: '9', title: 'おもったことを のこす', text: 'みじかくても こたえなくても OK' },
}

export function TaskGuide({ screen }: { screen: Screen }) {
  const guide = actionGuides[screen]
  if (!guide) return null
  return <section className="task-guide" aria-label={`いまやること。${guide.title}`}>
    <span className="task-guide-number">{guide.number}</span>
    <span className="task-guide-icon"><Icon name={guide.icon} /></span>
    <span className="task-guide-copy"><small>いま やること</small><strong>{guide.title}</strong><b>{guide.text}</b></span>
  </section>
}

export function GuideCharacter() {
  return <svg className="guide-character" viewBox="0 0 180 220" role="img" aria-label="街を案内する子ども、つなぐ">
    <ellipse cx="92" cy="205" rx="59" ry="11" fill="#17324d" opacity=".13" />
    <path d="M58 184 50 205M112 184l11 21" stroke="#31536b" strokeWidth="14" strokeLinecap="round" />
    <path d="M42 105q44-28 88 0l-8 82H50z" fill="#3f78a8" />
    <path d="M58 119 30 153M115 117l35-25" stroke="#b8795c" strokeWidth="15" strokeLinecap="round" />
    <circle cx="89" cy="67" r="41" fill="#bd7f61" />
    <path d="M52 62q5-48 45-45 39 4 38 49-38-27-83-4" fill="#243e54" />
    <path d="M51 47q37-36 81-7l-10-25q-41-17-66 12z" fill="#efc75e" />
    <circle cx="74" cy="69" r="4" fill="#17324d" /><circle cx="104" cy="69" r="4" fill="#17324d" />
    <path d="M77 86q13 11 26 0" fill="none" stroke="#7b493f" strokeWidth="4" strokeLinecap="round" />
    <rect x="103" y="119" width="48" height="51" rx="5" fill="#fffdf4" transform="rotate(8 103 119)" />
    <path d="m114 138 10 9 17-20" fill="none" stroke="#527b63" strokeWidth="5" />
    <path d="M53 126h72" stroke="#f0cf69" strokeWidth="8" />
  </svg>
}

export function ChildJourney() {
  const steps: Array<{ icon: IconName; title: string; text: string }> = [
    { icon: 'briefcase', title: 'はたらく', text: 'ドラッグ・長おし・タイミング' },
    { icon: 'coin', title: 'もらう', text: 'きゅうりょう・ぜいきん' },
    { icon: 'shop', title: 'つかう・ためる', text: 'お店・レジ・ぎんこう' },
  ]
  return <ol className="child-journey" aria-label="ゲームの3つの流れ">{steps.map((step, index) => <li key={step.title}><span>{index + 1}</span><i><Icon name={step.icon} /></i><strong>{step.title}</strong><small>{step.text}</small>{index < steps.length - 1 && <Icon name="arrow" className="journey-arrow" />}</li>)}</ol>
}

export function ProblemPicture({ jobId }: { jobId: JobId }) {
  const icon: Record<JobId, IconName> = { bakery: 'shop', bus: 'bus', nurse: 'heart', waste: 'waste', farmer: 'sprout', library: 'book' }
  const color: Record<JobId, string> = { bakery: '#d9854f', bus: '#3f78a8', nurse: '#4b8c7a', waste: '#527b53', farmer: '#718b3c', library: '#76679a' }
  return <div className="problem-picture" style={{ '--picture-color': color[jobId] } as React.CSSProperties} aria-hidden="true">
    <span className="problem-person"><i /></span>
    <span className="problem-signal"><b>!</b></span>
    <span className="problem-work-icon"><Icon name={icon[jobId]} /></span>
    <span className="problem-ground" />
  </div>
}
