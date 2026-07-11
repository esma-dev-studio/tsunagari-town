import type { IconName } from './Icon'
import type { JobId } from './types'

export interface WorkCheck {
  id: string
  label: string
  why: string
  icon: IconName
}

export interface WorkRoutine {
  preparationTitle: string
  checks: WorkCheck[]
  process: [string, string, string]
  deliverAction: string
  value: string
  customer: string
}

export const workRoutines: Record<JobId, WorkRoutine> = {
  bakery: {
    preparationTitle: 'パンを 作る まえの じゅんび',
    checks: [
      { id: 'hands', label: '手を きれいにする', why: '食べる人が あんしんできるように', icon: 'heart' },
      { id: 'order', label: 'ちゅうもんを 見る', why: '何を いくつ作るか たしかめる', icon: 'book' },
      { id: 'oven', label: 'オーブンを たしかめる', why: 'あんぜんに おいしく やくため', icon: 'tools' },
    ],
    process: ['数を たしかめる', 'パンを 作る', '店に ならべる'],
    deliverAction: 'できた パンを おきゃくさんへ',
    value: '朝ごはんを 食べられるようになった',
    customer: 'パンを まっていた人',
  },
  bus: {
    preparationTitle: 'バスを うごかす まえの じゅんび',
    checks: [
      { id: 'tire', label: 'タイヤを 見る', why: 'あんぜんに 走れるか たしかめる', icon: 'bus' },
      { id: 'mirror', label: 'ミラーを 合わせる', why: 'まわりを よく見るため', icon: 'info' },
      { id: 'route', label: '道と 時こくを見る', why: '行きたい ばしょへ とどけるため', icon: 'map' },
    ],
    process: ['あんぜんを 見る', '道を えらぶ', '人を とどける'],
    deliverAction: 'さいごの人を バスていへ',
    value: '学校や 病院へ いけるようになった',
    customer: 'いどうしたい人',
  },
  nurse: {
    preparationTitle: '人を あんないする まえの じゅんび',
    checks: [
      { id: 'space', label: '休める ばしょを見る', why: 'つらい人が むりをしないように', icon: 'heart' },
      { id: 'chair', label: '車いすを たしかめる', why: 'ひつような人を たすけるため', icon: 'tools' },
      { id: 'record', label: 'きろく用紙を ようい', why: '聞いたことを わすれないため', icon: 'book' },
    ],
    process: ['話を 聞く', 'ようすを きろく', 'ばしょへ あんない'],
    deliverAction: 'あんしんできる ばしょへ あんない',
    value: '不安だった人が つぎにすることを 分かった',
    customer: '病院で まっていた人',
  },
  waste: {
    preparationTitle: 'ごみを あつめる まえの じゅんび',
    checks: [
      { id: 'gloves', label: '手ぶくろを つける', why: 'けがを しないように', icon: 'heart' },
      { id: 'truck', label: 'しゅうしゅう車を 見る', why: 'あんぜんに はこぶため', icon: 'waste' },
      { id: 'map', label: 'あつめる 道を 見る', why: '街を じゅんばんに 回るため', icon: 'map' },
    ],
    process: ['ごみを あつめる', 'しゅるいに 分ける', 'あんぜんに はこぶ'],
    deliverAction: '分けた ごみを しせつへ はこぶ',
    value: '道と 公園が きれいで あんぜんになった',
    customer: '街で くらす みんな',
  },
  farmer: {
    preparationTitle: '野菜を とる まえの じゅんび',
    checks: [
      { id: 'weather', label: '天気を 見る', why: '雨や あつさに そなえるため', icon: 'weather' },
      { id: 'order', label: '店の ちゅうもんを見る', why: 'ひつような 数を とるため', icon: 'shop' },
      { id: 'basket', label: 'かごを よういする', why: '野菜を きずつけず はこぶため', icon: 'tools' },
    ],
    process: ['育ちを 見る', '野菜を とる', '店へ はこぶ'],
    deliverAction: '野菜の かごを 店へ とどける',
    value: '新せんな 野菜で ごはんを 作れる',
    customer: '野菜を 食べる人と 店の人',
  },
  library: {
    preparationTitle: '本を さがす まえの じゅんび',
    checks: [
      { id: 'return', label: 'かえった 本を 見る', why: 'つぎの人が 読めるように', icon: 'book' },
      { id: 'label', label: '本だなの しるしを見る', why: '本を もとの ばしょへ もどすため', icon: 'info' },
      { id: 'request', label: 'さがす 本を 聞く', why: 'ぴったりの 本を 見つけるため', icon: 'community' },
    ],
    process: ['話を 聞く', '本だなを さがす', '本を わたす'],
    deliverAction: '見つけた 本を 読む人へ わたす',
    value: '知りたいことを 本で しらべられる',
    customer: '本を さがしていた人',
  },
}
