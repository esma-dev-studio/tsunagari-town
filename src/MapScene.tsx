import type { KeyboardEvent } from 'react'

export interface Facility {
  id: string
  name: string
  workers: string
  helps: string
  income: string
  spending: string
}

export const facilities: Facility[] = [
  { id: 'home', name: '家', workers: '家の人', helps: 'いっしょにくらす人', income: '仕事の給料など', spending: '食事、電気、くらしの物' },
  { id: 'school', name: '学校', workers: '先生、給食、そうじをする人', helps: '学ぶ子どもと家族', income: '街で出し合うお金', spending: '学ぶ道具、建物、給食' },
  { id: 'bakery', name: 'パン屋', workers: 'パンを作る人、売る人', helps: 'パンを食べる人', income: 'パンを買った人のお金', spending: '材料、道具、給料' },
  { id: 'market', name: 'スーパー', workers: '品物を運ぶ人、ならべる人', helps: '買い物をする人', income: '品物を買った人のお金', spending: '仕入れ、電気、給料' },
  { id: 'hospital', name: '病院', workers: '看護師、医師、受付、そうじの人', helps: '体や心の相談をする人', income: '利用した人と街の仕組み', spending: '道具、薬、建物、給料' },
  { id: 'bus-stop', name: 'バス停', workers: '運転手、整備、案内の人', helps: '移動する人', income: '運ちんと街で出し合うお金', spending: '車、燃料、整備、給料' },
  { id: 'waste', name: 'ごみ処理', workers: '集める人、分ける人', helps: '街でくらすすべての人', income: '街で出し合うお金', spending: '車、安全な道具、設備' },
  { id: 'park', name: '公園', workers: '手入れや安全を守る人', helps: '遊ぶ人、休む人', income: '街で出し合うお金', spending: '遊具、木、そうじ、修理' },
  { id: 'city-hall', name: '市役所', workers: '相談、計画、手続きをする人', helps: '街でくらすすべての人', income: '街で出し合うお金など', spending: '共通サービスと働く人' },
  { id: 'construction', name: '工事現場', workers: '設計、建てる、安全を守る人', helps: '建物や道を使う人', income: '仕事をたのんだ人や街', spending: '材料、機械、安全、給料' },
  { id: 'farm', name: '農園', workers: '野菜や小麦を育てる人', helps: '食べる人と料理する人', income: '食べ物を買う店のお金', spending: 'たね、道具、水、運送' },
  { id: 'library', name: '図書館', workers: '本をそろえ、案内する人', helps: '読む人、調べる人', income: '街で出し合うお金', spending: '本、建物、道具、給料' },
]

type BuildingKind = 'house' | 'school' | 'bakery' | 'market' | 'hospital' | 'hall' | 'library' | 'waste' | 'construction'

interface BuildingProps {
  x: number
  y: number
  id: string
  label: string
  kind: BuildingKind
  color: string
  highlighted?: boolean
  onSelect?: (id: string) => void
}

function Building({ x, y, id, label, kind, color, highlighted, onSelect }: BuildingProps) {
  const activate = () => onSelect?.(id)
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }
  return (
    <g
      className={`map-building ${highlighted ? 'is-highlighted' : ''}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${label}の説明を見る`}
      onClick={activate}
      onKeyDown={onKeyDown}
    >
      <ellipse className="building-shadow" cx="0" cy="42" rx="67" ry="19" />
      <polygon points="-56,0 0,-31 56,0 0,31" fill="#d4c6aa" />
      <polygon points="-48,-3 0,-30 48,-3 0,24" fill={color} />
      <polygon points="-48,-3 0,24 0,68 -48,40" fill="#edf0e5" />
      <polygon points="48,-3 0,24 0,68 48,40" fill="#d9e1d7" />
      {kind === 'house' && <>
        <polygon points="-58,-2 0,-40 58,-2 0,31" fill="#a95442" />
        <rect x="-12" y="30" width="18" height="32" fill="#87634b" />
        <rect x="-38" y="15" width="17" height="14" fill="#8bc1cd" />
      </>}
      {kind === 'bakery' && <>
        <path d="M-47 4 0 30 47 4v13L0 43-47 17z" fill="#f2d77e" />
        <path d="M-47 4 0 30 47 4" fill="none" stroke="#c76f48" strokeWidth="7" strokeDasharray="10 8" />
        <rect x="-19" y="34" width="15" height="25" fill="#915c45" />
      </>}
      {kind === 'hospital' && <>
        <rect x="-7" y="-7" width="14" height="35" rx="2" fill="#fff" />
        <rect x="-20" y="3" width="40" height="14" rx="2" fill="#fff" />
        <rect x="-17" y="35" width="16" height="25" fill="#78a9bb" />
      </>}
      {kind === 'school' && <>
        <rect x="-29" y="7" width="14" height="20" fill="#a9d0dc" />
        <rect x="10" y="9" width="14" height="20" fill="#a9d0dc" />
        <rect x="-8" y="35" width="15" height="28" fill="#78604d" />
        <path d="M0-30v-22h30l-10 8 10 8H0" fill="#e6a444" />
      </>}
      {kind === 'market' && <>
        <path d="M-47 5 0 31 47 5" stroke="#f7f2dd" strokeWidth="12" strokeDasharray="12 8" />
        <rect x="-26" y="32" width="26" height="24" fill="#74aebc" />
      </>}
      {kind === 'hall' && <>
        <rect x="-33" y="6" width="66" height="8" fill="#f5f0e2" />
        {[-26, -9, 9, 26].map((column) => <rect key={column} x={column - 3} y="14" width="6" height="35" fill="#f5f0e2" />)}
        <rect x="-38" y="49" width="76" height="8" fill="#b5ad91" />
      </>}
      {kind === 'library' && <>
        <path d="M-24 4 0 17 24 4v24L0 42-24 28z" fill="#f5e7ae" stroke="#65598a" strokeWidth="4" />
        <path d="M0 17v25" stroke="#65598a" strokeWidth="4" />
        <rect x="-11" y="40" width="13" height="23" fill="#6f5b4b" />
      </>}
      {kind === 'waste' && <>
        <rect x="-30" y="9" width="21" height="25" fill="#a9c3a1" />
        <rect x="5" y="4" width="23" height="31" fill="#90b495" />
        <path d="M22-23v19" stroke="#657163" strokeWidth="8" />
        <path d="M23-22q12-8 17 2" fill="none" stroke="#fff" strokeWidth="5" opacity=".7" />
      </>}
      {kind === 'construction' && <>
        <path d="M-30 38V-35h8v73M-30-28H25M12-28v50" stroke="#d79c37" strokeWidth="6" />
        <path d="M25-28v16l-8 9" stroke="#d79c37" strokeWidth="4" fill="none" />
        <rect x="-12" y="31" width="28" height="22" fill="#b98b67" />
      </>}
      <g className="map-label" transform="translate(0 88)">
        <rect x="-52" y="-17" width="104" height="34" rx="8" />
        <text textAnchor="middle" dominantBaseline="middle">{label}</text>
      </g>
      {highlighted && <circle className="problem-pulse" cx="43" cy="-31" r="13" />}
    </g>
  )
}

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><ellipse cx="0" cy="16" rx="16" ry="6" fill="#80907c" opacity=".3" /><path d="M0 5v19" stroke="#735a41" strokeWidth="6" /><circle cx="0" cy="-3" r="18" fill="#6f9b62" /><circle cx="-10" cy="0" r="11" fill="#84aa6a" /></g>
}

export function MapScene({ highlightedIds = [], onSelect, compact = false }: { highlightedIds?: string[]; onSelect?: (id: string) => void; compact?: boolean }) {
  return (
    <svg className={`town-map ${compact ? 'is-compact' : ''}`} viewBox="0 0 1200 720" role="img" aria-label="つながりタウンの地図。建物をえらぶと説明が見られます。">
      <defs>
        <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#edf1df" /><stop offset="1" stopColor="#dfe9d8" /></linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#17324d" floodOpacity=".12" /></filter>
      </defs>
      <rect width="1200" height="720" fill="url(#ground)" />
      <path d="M-80 485 570 115 1260 505 600 880z" fill="#ded7c5" />
      <path d="M-60 475 560 120 610 149-9 505zM585 135l650 370-43 26-652-370z" fill="#f8f4e8" />
      <path d="M126 573 832 169l42 24-706 405z" fill="#f8f4e8" />
      <path d="M267 626 967 225" stroke="#d9cdbc" strokeWidth="3" strokeDasharray="18 18" />
      <path d="M37 462 591 145" stroke="#d9cdbc" strokeWidth="3" strokeDasharray="18 18" />
      <path d="M576 150 1177 493" stroke="#d9cdbc" strokeWidth="3" strokeDasharray="18 18" />
      <g filter="url(#softShadow)">
        <Building x={135} y={170} id="home" label="家" kind="house" color="#d7a762" highlighted={highlightedIds.includes('home')} onSelect={onSelect} />
        <Building x={330} y={145} id="school" label="学校" kind="school" color="#597fa0" highlighted={highlightedIds.includes('school')} onSelect={onSelect} />
        <Building x={530} y={175} id="bakery" label="パン屋" kind="bakery" color="#cf744b" highlighted={highlightedIds.includes('bakery')} onSelect={onSelect} />
        <Building x={745} y={150} id="market" label="スーパー" kind="market" color="#4b8b84" highlighted={highlightedIds.includes('market')} onSelect={onSelect} />
        <Building x={970} y={180} id="hospital" label="病院" kind="hospital" color="#41849c" highlighted={highlightedIds.includes('hospital')} onSelect={onSelect} />
        <g className="map-building" role="button" tabIndex={0} aria-label="バス停の説明を見る" onClick={() => onSelect?.('bus-stop')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect?.('bus-stop') }} transform="translate(170 385)">
          <ellipse className="building-shadow" cx="0" cy="36" rx="73" ry="17" />
          <rect x="-67" y="-8" width="125" height="49" rx="10" fill="#3f78a8" />
          <rect x="-46" y="2" width="25" height="17" rx="3" fill="#d6eff3" /><rect x="-13" y="2" width="25" height="17" rx="3" fill="#d6eff3" /><rect x="20" y="2" width="25" height="17" rx="3" fill="#d6eff3" />
          <circle cx="-37" cy="40" r="12" fill="#31465b" /><circle cx="35" cy="40" r="12" fill="#31465b" /><circle cx="-37" cy="40" r="5" fill="#c8d4d5" /><circle cx="35" cy="40" r="5" fill="#c8d4d5" />
          <path d="M72-38v78M72-34h50v30H72" stroke="#486174" strokeWidth="6" fill="#f2d77e" />
          <g className="map-label" transform="translate(0 75)"><rect x="-52" y="-17" width="104" height="34" rx="8" /><text textAnchor="middle" dominantBaseline="middle">バス停</text></g>
          {highlightedIds.includes('bus-stop') && <circle className="problem-pulse" cx="58" cy="-28" r="13" />}
        </g>
        <Building x={405} y={350} id="city-hall" label="市役所" kind="hall" color="#506d88" highlighted={highlightedIds.includes('city-hall')} onSelect={onSelect} />
        <Building x={650} y={365} id="library" label="図書館" kind="library" color="#6f6191" highlighted={highlightedIds.includes('library')} onSelect={onSelect} />
        <Building x={1040} y={380} id="waste" label="ごみ処理" kind="waste" color="#557957" highlighted={highlightedIds.includes('waste')} onSelect={onSelect} />
        <Building x={245} y={585} id="construction" label="工事現場" kind="construction" color="#c58c3c" highlighted={highlightedIds.includes('construction')} onSelect={onSelect} />
      </g>
      <g className="park-zone" role="button" tabIndex={0} aria-label="公園の説明を見る" onClick={() => onSelect?.('park')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect?.('park') }}>
        <path d="m455 563 153-87 145 84-151 88z" fill="#a8c989" stroke={highlightedIds.includes('park') ? '#df853a' : '#8eb475'} strokeWidth={highlightedIds.includes('park') ? 7 : 3} />
        <Tree x={505} y={550} /><Tree x={670} y={555} scale={.85} /><Tree x={596} y={515} scale={.7} />
        <path d="M555 592q45-54 93-3" fill="none" stroke="#e7dfc3" strokeWidth="13" />
        <g className="map-label" transform="translate(605 635)"><rect x="-52" y="-17" width="104" height="34" rx="8" /><text textAnchor="middle" dominantBaseline="middle">公園</text></g>
      </g>
      <g className="farm-zone" role="button" tabIndex={0} aria-label="農園の説明を見る" onClick={() => onSelect?.('farm')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect?.('farm') }}>
        <path d="m785 568 133-77 173 100-133 77z" fill="#9dba68" stroke={highlightedIds.includes('farm') ? '#df853a' : '#7d9c53'} strokeWidth={highlightedIds.includes('farm') ? 7 : 3} />
        {[0, 1, 2, 3].map((row) => <path key={row} d={`M${819 + row * 29} ${565 + row * 17}l96-55`} stroke={row % 2 ? '#d5cb6c' : '#718f4a'} strokeWidth="12" />)}
        <g className="map-label" transform="translate(955 645)"><rect x="-52" y="-17" width="104" height="34" rx="8" /><text textAnchor="middle" dominantBaseline="middle">農園</text></g>
      </g>
      <g aria-hidden="true" className="map-people">
        <g transform="translate(320 463)"><circle cy="-14" r="8" fill="#c78565" /><path d="M0-5v27M0 7l-12 10M0 7l12 9M0 22l-9 15M0 22l10 15" stroke="#456474" strokeWidth="7" strokeLinecap="round" /></g>
        <g transform="translate(805 405)"><circle cy="-14" r="8" fill="#9f684f" /><path d="M0-5v27M0 7l-12 10M0 7l12 9M0 22l-9 15M0 22l10 15" stroke="#8b5d84" strokeWidth="7" strokeLinecap="round" /></g>
      </g>
      <text className="map-caption" x="35" y="685">建物をタップすると、仕事とお金のつながりが見えるよ</text>
    </svg>
  )
}
