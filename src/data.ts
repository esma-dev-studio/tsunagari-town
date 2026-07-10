import type {
  ExpenseChoice,
  Job,
  MoneyFlow,
  PublicService,
  TownProblem,
  UnexpectedEvent,
} from './types'

export const jobs: Job[] = [
  {
    id: 'bakery', name: 'パン屋の仕事', shortName: 'パン屋',
    description: '数をたしかめ、食べる人に合わせてパンを作ります。',
    helpsWhom: '朝ごはんや、お昼のパンを楽しみにする人',
    relatedJobs: ['農家', '運送の仕事', 'お店の仕事'],
    tools: ['オーブン', 'トング', 'はかり'],
    mission: '注文どおりに、2しゅるいのパンをそろえよう。',
    reward: 12, shared: 2,
    townEffect: 'おなかをすかせた人に、パンがとどきました。',
    comment: '数をまちがえないよう、声をかけ合って作ったよ。',
    question: '材料を作る人がいなかったら、どうなるかな？',
    color: '#d9854f', facilityId: 'bakery',
  },
  {
    id: 'bus', name: 'バス運転手の仕事', shortName: 'バス運転手',
    description: '安全をたしかめ、街の人を行きたい場所へ運びます。',
    helpsWhom: '学校や病院、店へ出かける人',
    relatedJobs: ['整備の仕事', '道路の仕事', '案内の仕事'],
    tools: ['バス', 'ミラー', '時こく表'],
    mission: '乗る人の行き先を見て、安全な順に回ろう。',
    reward: 13, shared: 2,
    townEffect: '街の人が、時間に間に合って移動できました。',
    comment: '急がず、安全をいちばんにして運転したよ。',
    question: 'バスを使えないと、だれが困るかな？',
    color: '#3f78a8', facilityId: 'bus-stop',
  },
  {
    id: 'nurse', name: '看護師の仕事', shortName: '看護師',
    description: '話を聞いて、安心できる場所へ人を案内します。',
    helpsWhom: 'けがや体のつらさで不安な人と、その家族',
    relatedJobs: ['医師', '薬を用意する仕事', 'そうじの仕事'],
    tools: ['体温計', '車いす', 'きろく用紙'],
    mission: '話をよく聞いて、合う場所へ案内しよう。',
    reward: 13, shared: 2,
    townEffect: '待っていた人が、安心して案内を受けました。',
    comment: '決めつけずに、まず話をよく聞いたよ。',
    question: '病院では、ほかにどんな人が働いているかな？',
    color: '#4b8c7a', facilityId: 'hospital',
  },
  {
    id: 'waste', name: 'ごみ収集の仕事', shortName: 'ごみ収集',
    description: '街のごみを集め、安全に分けて運びます。',
    helpsWhom: 'きれいで安全な街でくらすすべての人',
    relatedJobs: ['リサイクルの仕事', '車の整備', '清そうの仕事'],
    tools: ['収集車', '手ぶくろ', '安全ベスト'],
    mission: 'ごみを、合う集め場所へ安全に分けよう。',
    reward: 12, shared: 2,
    townEffect: '公園と道がきれいになり、資源も生かせました。',
    comment: '危ない物がないか、よく見て集めているよ。',
    question: 'ごみ集めが一週間止まったら、どうなるかな？',
    color: '#527b53', facilityId: 'waste',
  },
  {
    id: 'farmer', name: '農家の仕事', shortName: '農家',
    description: '天気と育ち方を見て、食べ物を育てます。',
    helpsWhom: '毎日のごはんを食べる人と、料理する人',
    relatedJobs: ['パン屋', '運送の仕事', '道具を作る仕事'],
    tools: ['くわ', 'かご', '水やり道具'],
    mission: '天気と注文を見て、野菜をしゅうかくしよう。',
    reward: 12, shared: 2,
    townEffect: '新せんな野菜が、店とパン屋にとどきました。',
    comment: '天気はえらべないから、みんなで工夫したよ。',
    question: '大雨の日、農家だけで何とかできるかな？',
    color: '#718b3c', facilityId: 'farm',
  },
  {
    id: 'library', name: '図書館の仕事', shortName: '図書館',
    description: '知りたいことに合う本を、見つけやすくします。',
    helpsWhom: '本を楽しむ人、調べものや勉強をする人',
    relatedJobs: ['本を作る仕事', '学校の先生', '配送の仕事'],
    tools: ['本だな', '返きゃく台', 'けんさく道具'],
    mission: 'さがしている本を、本だなの分類から見つけよう。',
    reward: 12, shared: 2,
    townEffect: '知りたかった本が見つかり、学びが広がりました。',
    comment: '聞きたいことをいっしょに整理してさがしたよ。',
    question: '本を買わなくても読める場所は、だれを助ける？',
    color: '#76679a', facilityId: 'library',
  },
]

export const problems: TownProblem[] = [
  { id: 'bread-shortage', title: '朝のパンが足りない', description: 'パン屋に、いつもより多い注文が来ています。', relatedJobs: ['bakery'], affectedFacilities: ['bakery', 'farm'], difficulty: 1 },
  { id: 'bus-crowd', title: '朝のバスがこんでいる', description: '学校や病院へ行く人が待っています。', relatedJobs: ['bus'], affectedFacilities: ['bus-stop', 'school', 'hospital'], difficulty: 2 },
  { id: 'hospital-wait', title: '病院で待っている人がいる', description: 'どこへ行けばよいか、不安な人がいます。', relatedJobs: ['nurse'], affectedFacilities: ['hospital'], difficulty: 1 },
  { id: 'park-waste', title: '公園にごみがふえている', description: '安全に遊べるよう、ごみを分けて集めます。', relatedJobs: ['waste'], affectedFacilities: ['park', 'waste'], difficulty: 2 },
  { id: 'harvest', title: '野菜のしゅうかく日だ', description: '店からの注文と、天気をたしかめます。', relatedJobs: ['farmer'], affectedFacilities: ['farm', 'market'], difficulty: 2 },
  { id: 'lost-book', title: '読みたい本が見つからない', description: '本をさがしている人が図書館にいます。', relatedJobs: ['library'], affectedFacilities: ['library', 'school'], difficulty: 1 },
]

export const expenseChoices: ExpenseChoice[] = [
  { id: 'meal', name: '夕ごはんの材料', category: 'need', cost: 3, effect: '家の人と食べる物をそろえた', childDescription: 'くらしに使う' },
  { id: 'notebook', name: 'ほしかったノート', category: 'want', cost: 2, effect: 'かく楽しみがふえた', childDescription: 'ほしい物に使う' },
  { id: 'savings', name: 'もしものための貯金', category: 'save', cost: 3, effect: 'あとで使えるお金をのこした', childDescription: '貯めておく' },
  { id: 'share', name: '食べ物を分ける活動', category: 'help', cost: 2, effect: '食事を必要とする人を応えんした', childDescription: 'だれかを助ける' },
  { id: 'local-shop', name: '街の店で買い物', category: 'shop', cost: 2, effect: '店の仕事と次の仕入れにつながった', childDescription: '街で使う' },
]

export const unexpectedEvents: UnexpectedEvent[] = [
  { id: 'bike', title: '自転車のタイヤがこわれた', description: 'なおすには3コイン。明日の予定もあります。', availableResponses: [
    { id: 'pay', label: '今あるお金でなおす', consequence: 'すぐ乗れるようになりました。ほかの買い物は少し待ちます。', walletChange: -3 },
    { id: 'save', label: '貯金から出す', consequence: '予定をかえずになおせました。貯金はへりました。', savingsChange: -3 },
    { id: 'walk', label: '歩いて、あとで考える', consequence: '時間はかかりましたが、お金をのこせました。' },
    { id: 'help', label: '修理を助ける仕組みを聞く', consequence: '街の相談員が、安く直せる場所を教えてくれました。', walletChange: -1, usesSupport: true },
  ]},
  { id: 'rain', title: '大雨でバスがおくれている', description: '出かける方法を、もう一度考えます。', availableResponses: [
    { id: 'wait', label: '安全な場所で待つ', consequence: '少しおくれましたが、安全に移動できました。' },
    { id: 'change', label: '予定を明日にかえる', consequence: '今日でなくてもよい用事を、明日にしました。' },
    { id: 'info', label: '街の案内をたしかめる', consequence: '市役所の案内で、安全な道が分かりました。', usesSupport: true },
  ]},
  { id: 'family', title: '家の人が体調をくずした', description: '今日は家のことを、だれかがする必要があります。', availableResponses: [
    { id: 'care', label: '予定をかえ、家のことをする', consequence: '給料の出ない仕事も、くらしを支えると気づきました。' },
    { id: 'ask', label: 'まわりの人に助けをたのむ', consequence: 'できることを分け合い、みんなで休めました。', usesSupport: true },
    { id: 'service', label: '街の相談先を使う', consequence: '使えるサービスを聞き、安心できました。', usesSupport: true },
  ]},
  { id: 'festival', title: '街のお祭りがひらかれる', description: '楽しむことと、のこすお金を考えます。', availableResponses: [
    { id: 'small', label: '2コインだけ使う', consequence: '決めた分で楽しみ、ほかのお金ものこせました。', walletChange: -2 },
    { id: 'volunteer', label: 'お手つだいで参加する', consequence: '給料はなくても、祭りを支える仕事ができました。' },
    { id: 'skip', label: '今回は行かない', consequence: 'お金をのこし、家でちがう楽しみを見つけました。' },
  ]},
]

export const publicServices: PublicService[] = [
  { id: 'learning', name: '学校・図書館', description: '学ぶ場所と本をととのえる', townEffects: ['本や学ぶ道具がふえる', '使える時間は少し短いまま'] },
  { id: 'transport', name: '道路・バス', description: '安全に移動しやすくする', townEffects: ['バスが時間どおり動きやすい', 'ほかの場所の工事は待つ'] },
  { id: 'health', name: '病院', description: '安心して相談できるようにする', townEffects: ['待つ時間が短くなる', '夜の受け入れはまだ少ない'] },
  { id: 'park', name: '公園', description: '遊び、休める場所を守る', townEffects: ['遊具を安全に直せる', '花だんの手入れは少ない'] },
  { id: 'waste', name: 'ごみ処理', description: '集め、分け、安全に処理する', townEffects: ['回収の回数がふえる', '新しい設備はまだ買えない'] },
  { id: 'disaster', name: '災害への備え', description: '大雨や地しんに備える', townEffects: ['水や毛布をそなえられる', '道の工事は少し待つ'] },
]

export const moneyFlows: MoneyFlow[] = [
  { id: 'resident-shop', from: '住民', to: 'パン屋', amount: 4, purpose: 'パンを買う', createdValue: '食事と、ほっとする時間' },
  { id: 'shop-farm', from: 'パン屋', to: '農家', amount: 2, purpose: '小麦や野菜を買う', createdValue: '次のパンの材料' },
  { id: 'farm-bus', from: '農家', to: '運送', amount: 1, purpose: '材料を運ぶ', createdValue: '必要な場所へ食べ物がとどく' },
  { id: 'worker-store', from: '働く人', to: '街の店', amount: 3, purpose: 'くらしの物を買う', createdValue: 'くらしと、店の次の仕事' },
  { id: 'people-town', from: 'みんな', to: '共通サービス', amount: 2, purpose: '少しずつ出し合う', createdValue: '学校、道、公園などを支える' },
]

export const reflectionQuestions = [
  { id: 'important', label: '一番大切だと思った仕事は？' },
  { id: 'missing', label: 'その仕事がなくなると、だれが困る？' },
  { id: 'spending', label: 'お金を使う時に、何を考えた？' },
  { id: 'again', label: 'もう一度なら、同じえらび方をする？' },
  { id: 'unpaid', label: '給料が出なくても大切な仕事は？' },
]

export const parentPrompts = [
  'その仕事は、だれの役に立っていた？',
  '給料が高い仕事が、一番大切なのかな？',
  'ごみ収集が一週間止まったら、どうなる？',
  'みんなのお金を、何に使うとよいと思う？',
  '家の中に、給料は出ないけれど大切な仕事はある？',
]

export const jobById = (id: string | null) => jobs.find((job) => job.id === id)
export const problemById = (id: string | null) => problems.find((problem) => problem.id === id)
