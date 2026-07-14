import type { IconName } from './Icon'
import type { Job, JobId } from './types'

export interface ShiftStation {
  id: string
  label: string
  detail: string
  icon: IconName
}

export interface ShiftTask {
  stationId: string
  instruction: string
  action: string
  result: string
  effort: number
  unit: string
  decision?: {
    prompt: string
    hint: string
    options: Array<{ id: string; label: string; correct: boolean; feedback: string }>
  }
}

export interface ShiftOrder {
  id: string
  customer: string
  request: string
  ticket: string
  tasks: ShiftTask[]
  thanks: string
  createdValue: string
}

export interface ShiftScenario {
  jobId: JobId
  workplace: string
  roleLine: string
  uniform: string
  uniformColor: string
  shiftGoal: string
  stations: ShiftStation[]
  orders: ShiftOrder[]
  townValue: string
}

export const featuredJobIds: JobId[] = ['bakery', 'bus', 'waste']

export const shiftScenarios: Partial<Record<JobId, ShiftScenario>> = {
  bakery: {
    jobId: 'bakery',
    workplace: 'つながりベーカリー',
    roleLine: 'ちゅうもんを聞いて、パンを作って、手わたす仕事',
    uniform: 'エプロンと ぼうし',
    uniformColor: '#d9854f',
    shiftGoal: '2人の おきゃくさんの パンを かんせいさせよう',
    stations: [
      { id: 'scale', label: 'はかる ばしょ', detail: 'ざいりょうを そろえる', icon: 'tools' },
      { id: 'table', label: 'パン台', detail: 'こねて かたちを作る', icon: 'sprout' },
      { id: 'oven', label: 'オーブン', detail: 'あつさを見て やく', icon: 'shop' },
    ],
    orders: [
      {
        id: 'round-bread', customer: 'あおさん', request: 'まるパンを 2こ ください', ticket: 'まるパン × 2',
        tasks: [
          { stationId: 'scale', instruction: 'こむぎこを 2はい はかろう', action: 'こむぎこを はかる', result: '2はい ぴったり はかれた', effort: 2, unit: 'はい' },
          { stationId: 'table', instruction: 'パンきじを 3かい こねよう', action: 'きじを こねる', result: 'ふんわりした きじになった', effort: 3, unit: 'かい' },
          { stationId: 'oven', instruction: 'やく おんどを えらんで、やけぐあいを 見よう', action: 'オーブンを 見る', result: 'こんがり やけた', effort: 2, unit: 'かい', decision: { prompt: 'パンを ふんわり やくなら どっち？', hint: 'あつすぎると、そとだけ こげてしまうよ。', options: [{ id: '180', label: '180どで ゆっくり', correct: true, feedback: 'いい おんど！ なかまで ふんわり やけるよ。' }, { id: '250', label: '250どで いっきに', correct: false, feedback: 'あつすぎるみたい。そとが こげる前に なおそう。' }] } },
        ],
        thanks: 'いい におい！ 朝ごはんが たのしみ。',
        createdValue: '食べる人の 朝ごはん',
      },
      {
        id: 'loaf', customer: 'ひなたさん', request: 'しょくパンを 1こ ください', ticket: 'しょくパン × 1',
        tasks: [
          { stationId: 'scale', instruction: 'ざいりょうを 2つ そろえよう', action: 'ざいりょうを 入れる', result: 'ちゅうもんの分を そろえた', effort: 2, unit: 'つ' },
          { stationId: 'table', instruction: 'しょくパンの かたちを えらんで ととのえよう', action: 'かたちを ととのえる', result: 'パンの かたちになった', effort: 3, unit: 'かい', decision: { prompt: 'しょくパン × 1 は どの かたち？', hint: 'ちゅうもんひょうの「しょくパン」を 見よう。', options: [{ id: 'loaf', label: 'ながい しかく', correct: true, feedback: 'ちゅうもんどおりの かたちだね。' }, { id: 'round', label: 'まるを 2こ', correct: false, feedback: 'それは まるパンの かたち。ちゅうもんを もう一度 見よう。' }] } },
          { stationId: 'oven', instruction: 'タイマーを 2めもり すすめよう', action: 'タイマーを すすめる', result: 'しょくパンが かんせいした', effort: 2, unit: 'めもり' },
        ],
        thanks: '家の みんなで 食べるね。ありがとう！',
        createdValue: '家族で 食べる パン',
      },
    ],
    townValue: '作ったパンが、食べる人の一日をささえました。',
  },
  bus: {
    jobId: 'bus',
    workplace: 'つながりバス えいぎょう所',
    roleLine: '車をたしかめ、人をのせて、安全にとどける仕事',
    uniform: 'うんてんしゅの せいふく',
    uniformColor: '#3f78a8',
    shiftGoal: '2組の おきゃくさんを もくてき地へ とどけよう',
    stations: [
      { id: 'check', label: '車の てんけん', detail: 'タイヤと ミラーを見る', icon: 'tools' },
      { id: 'door', label: 'のり口', detail: '人を あんぜんに のせる', icon: 'community' },
      { id: 'driver', label: 'うんてんせき', detail: '道と バスていを見る', icon: 'bus' },
    ],
    orders: [
      {
        id: 'school-run', customer: '学校へ行く 2人', request: '8じまでに 学校へ 行きたいです', ticket: '学校ゆき・2人',
        tasks: [
          { stationId: 'check', instruction: 'タイヤ・ミラー・ドアを 3つ 見よう', action: 'あんぜんを たしかめる', result: 'バスの じゅんびが できた', effort: 3, unit: 'かしょ' },
          { stationId: 'door', instruction: '2人が のるまで ドアで まとう', action: 'おきゃくさんを のせる', result: '2人とも すわった', effort: 2, unit: '人' },
          { stationId: 'driver', instruction: 'じかんに 間にあう ルートを えらぼう', action: 'あんぜんに すすむ', result: '学校の バスていに ついた', effort: 3, unit: '区かん', decision: { prompt: '学校へ いそぐ 2人。どの じゅんばん？', hint: 'ちゅうもんは「8じまでに 学校へ」だよ。', options: [{ id: 'school-first', label: '学校 → 病院', correct: true, feedback: '学校へ 先に行けば、じかんに 間にあうね。' }, { id: 'hospital-first', label: '病院 → 学校', correct: false, feedback: '学校へ行く人が おくれそう。じゅんばんを なおそう。' }] } },
        ],
        thanks: 'じかんに まにあったよ。ありがとう！',
        createdValue: '学校へ行ける いどう',
      },
      {
        id: 'hospital-run', customer: '病院へ行く人', request: 'よやくの時間までに 病院へ 行きたいです', ticket: '病院ゆき・1人',
        tasks: [
          { stationId: 'check', instruction: 'しゅっぱつ前に 見るところを えらぼう', action: 'ミラーを 見る', result: 'まわりが よく見える', effort: 2, unit: 'かしょ', decision: { prompt: 'しゅっぱつ前に いちばん先に たしかめるのは？', hint: '人を のせる前も、あんぜんが いちばん。', options: [{ id: 'mirror', label: 'ミラーと タイヤ', correct: true, feedback: 'あんぜんを 先に たしかめられた！' }, { id: 'clock', label: 'おきゅうりょう', correct: false, feedback: 'お金も大切。でも まずは バスの あんぜんだね。' }] } },
          { stationId: 'door', instruction: 'ゆっくり のれるまで 1人を まとう', action: 'のるのを たすける', result: 'あんぜんに すわれた', effort: 1, unit: '人' },
          { stationId: 'driver', instruction: '病院まで 2つの道を すすもう', action: 'ゆっくり すすむ', result: '病院の 入口に ついた', effort: 2, unit: '区かん' },
        ],
        thanks: 'あせらずに 行けて あんしんしたよ。',
        createdValue: '病院へ行ける あんしん',
      },
    ],
    townValue: 'バスが、人と学校・病院をつなぎました。',
  },
  waste: {
    jobId: 'waste',
    workplace: 'つながりタウン しゅうしゅう所',
    roleLine: 'ごみを集め、分けて、街を安全にする仕事',
    uniform: 'あんぜんベストと 手ぶくろ',
    uniformColor: '#527b53',
    shiftGoal: '2つの ばしょを きれいにして ごみを はこぼう',
    stations: [
      { id: 'collect', label: 'あつめる ばしょ', detail: 'まわりを見て ごみをひろう', icon: 'waste' },
      { id: 'sort', label: '分ける ばしょ', detail: 'しゅるいと あぶなさを見る', icon: 'reset' },
      { id: 'truck', label: 'しゅうしゅう車', detail: 'ごみを のせて はこぶ', icon: 'bus' },
    ],
    orders: [
      {
        id: 'park-clean', customer: '公園で あそぶ人', request: '公園の ごみを あんぜんに してほしいです', ticket: '公園・ごみ 3こ',
        tasks: [
          { stationId: 'collect', instruction: 'まわりを見て ごみを 3こ あつめよう', action: 'ごみを あつめる', result: '公園の ごみを あつめた', effort: 3, unit: 'こ' },
          { stationId: 'sort', instruction: 'かんを 入れる はこを えらんで 分けよう', action: 'ごみを 分ける', result: '3しゅるいに 分けられた', effort: 3, unit: 'こ', decision: { prompt: 'のみものの かんは どの はこ？', hint: 'かんは、また つかえる しげんだよ。', options: [{ id: 'resource', label: 'しげんの はこ', correct: true, feedback: 'せいかい！ また使えるように 分けられた。' }, { id: 'burn', label: 'もやす はこ', correct: false, feedback: 'かんは もえないね。しげんの はこへ なおそう。' }, { id: 'danger', label: 'あぶない はこ', correct: false, feedback: 'われものではないね。しるしを 見なおそう。' }] } },
          { stationId: 'truck', instruction: '2つの はこに のせよう', action: '車に のせる', result: 'こぼれないように のせた', effort: 2, unit: 'はこ' },
        ],
        thanks: 'これで あんしんして あそべるよ！',
        createdValue: 'あんぜんな 公園',
      },
      {
        id: 'street-clean', customer: '商店がいの 店の人', request: '店の前の かんと紙を あつめてください', ticket: '店の前・ごみ 2こ',
        tasks: [
          { stationId: 'collect', instruction: 'かんと紙を 2こ あつめよう', action: 'トングで あつめる', result: '道から ごみが なくなった', effort: 2, unit: 'こ' },
          { stationId: 'sort', instruction: '紙の しるしを 見て はこを えらぼう', action: 'しるしを たしかめる', result: 'しげんを 見つけた', effort: 2, unit: 'かい', decision: { prompt: 'きれいな 紙は どうする？', hint: 'よごれていない紙は、また紙にできるよ。', options: [{ id: 'paper', label: '紙の しげんへ', correct: true, feedback: '紙として また使えるね！' }, { id: 'road', label: '道に おいておく', correct: false, feedback: '道にあると あぶないね。しげんへ 入れよう。' }] } },
          { stationId: 'truck', instruction: 'しげんの はこへ 2こ 入れよう', action: 'はこへ 入れる', result: 'また使えるように はこべた', effort: 2, unit: 'こ' },
        ],
        thanks: '店の前が きれいになったよ。ありがとう！',
        createdValue: 'きれいな 道と しげん',
      },
    ],
    townValue: '集めて分けたことで、街の安全と資源を守りました。',
  },
}

export function getShiftScenario(job: Job): ShiftScenario {
  const scenario = shiftScenarios[job.id]
  if (scenario) return scenario

  return {
    jobId: job.id,
    workplace: `${job.shortName}の しごとば`,
    roleLine: job.description,
    uniform: `${job.shortName}の せいふく`,
    uniformColor: job.color,
    shiftGoal: '2人の いらいを さいごまで とどけよう',
    stations: [
      { id: 'prepare', label: 'じゅんび', detail: job.tools.join('・'), icon: 'tools' },
      { id: 'work', label: 'しごと場', detail: job.mission, icon: 'briefcase' },
      { id: 'check', label: 'たしかめる', detail: 'まちがいが ないか見る', icon: 'check' },
    ],
    orders: [1, 2].map((number) => ({
      id: `request-${number}`,
      customer: number === 1 ? 'まっている人' : 'つぎに まっている人',
      request: job.mission,
      ticket: `いらい ${number}`,
      tasks: [
        { stationId: 'prepare', instruction: 'どうぐを 2つ たしかめよう', action: 'どうぐを たしかめる', result: 'じゅんびが できた', effort: 2, unit: 'つ' },
        { stationId: 'work', instruction: 'しごとを 3かい すすめよう', action: 'しごとを すすめる', result: 'いらいが できた', effort: 3, unit: 'かい' },
        { stationId: 'check', instruction: 'さいごに 2かい 見なおそう', action: 'できたものを 見る', result: 'あんしんして わたせる', effort: 2, unit: 'かい' },
      ],
      thanks: 'たすかったよ。ありがとう！',
      createdValue: job.townEffect,
    })),
    townValue: job.townEffect,
  }
}
