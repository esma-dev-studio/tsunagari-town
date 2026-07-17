import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { ArcadeGameProps } from './types';

type WasteKind = 'burnable' | 'resource' | 'danger';
type WastePhase = 'patrol' | 'compacting' | 'done';
type FeedbackTone = 'info' | 'good' | 'try';
type LocationId = 'park' | 'street' | 'river';

interface TrashItem {
  id: string;
  label: string;
  emoji: string;
  kind: WasteKind;
  location: LocationId;
  x: number;
  y: number;
  tilt: number;
  hint: string;
  reason: string;
}

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
}

const KIND_LABEL: Record<WasteKind, string> = {
  burnable: 'もえる',
  resource: 'しげん',
  danger: 'きけん',
};

const BINS: Array<{ kind: WasteKind; label: string; emoji: string; hint: string }> = [
  { kind: 'burnable', label: 'もえる', emoji: '🔥', hint: 'かわ・紙くず・木' },
  { kind: 'resource', label: 'しげん', emoji: '♻️', hint: 'ボトル・かん・新聞' },
  { kind: 'danger', label: 'きけん', emoji: '⚠️', hint: 'でんち・われもの' },
];

const LOCATIONS: Array<{
  id: LocationId;
  label: string;
  shortLabel: string;
  icon: string;
  mission: string;
  clearMessage: string;
  friend: string;
}> = [
  {
    id: 'park',
    label: 'ひだまり公園',
    shortLabel: '公園',
    icon: '🌳',
    mission: '遊具やベンチのまわりをパトロール',
    clearMessage: 'ちょうちょと子どもたちが帰ってきた！',
    friend: '🦋',
  },
  {
    id: 'street',
    label: 'にぎわい通り',
    shortLabel: '商店街',
    icon: '🏪',
    mission: 'お店の前と道路のすみをチェック',
    clearMessage: 'お店の人とわんちゃんがにっこり！',
    friend: '🐕',
  },
  {
    id: 'river',
    label: 'きらきら川べり',
    shortLabel: '川べり',
    icon: '🌊',
    mission: '橋の下や草むらをよく見てみよう',
    clearMessage: '魚とカモがきれいな川へもどってきた！',
    friend: '🦆',
  },
];

const TRASH_ITEMS: TrashItem[] = [
  {
    id: 'banana',
    label: 'バナナのかわ',
    emoji: '🍌',
    kind: 'burnable',
    location: 'park',
    x: 19,
    y: 69,
    tilt: -11,
    hint: '食べものの「かわ」だよ。かわは燃やしてしょりできるね。',
    reason: 'バナナのかわは食べもののごみだから「もえる」へ入れるよ。',
  },
  {
    id: 'tissue',
    label: 'つかったティッシュ',
    emoji: '🧻',
    kind: 'burnable',
    location: 'park',
    x: 51,
    y: 79,
    tilt: 7,
    hint: 'よごれた紙は、もう新しい紙にしにくいよ。',
    reason: 'よごれたティッシュはリサイクルできないから「もえる」へ入れるよ。',
  },
  {
    id: 'battery',
    label: 'つかったでんち',
    emoji: '🔋',
    kind: 'danger',
    location: 'park',
    x: 82,
    y: 61,
    tilt: -7,
    hint: '中に薬品が入っているよ。火や水にふれるとあぶないね。',
    reason: 'でんちは中の薬品がもれるとあぶないから「きけん」へ入れるよ。',
  },
  {
    id: 'can',
    label: 'あきかん',
    emoji: '🥫',
    kind: 'resource',
    location: 'street',
    x: 18,
    y: 76,
    tilt: -10,
    hint: '金ぞくでできているよ。また新しい物に生まれかわれるかな？',
    reason: 'あきかんの金ぞくは何度も使えるから「しげん」へ入れるよ。',
  },
  {
    id: 'paper',
    label: 'しんぶんし',
    emoji: '📰',
    kind: 'resource',
    location: 'street',
    x: 50,
    y: 62,
    tilt: 6,
    hint: 'きれいな紙は、集めると新しい紙に生まれかわるよ。',
    reason: 'しんぶんしは新しい紙に生まれかわるから「しげん」へ入れるよ。',
  },
  {
    id: 'bulb',
    label: 'われたでんきゅう',
    emoji: '💡',
    kind: 'danger',
    location: 'street',
    x: 82,
    y: 78,
    tilt: 10,
    hint: 'われたガラスで手を切るかもしれないよ。',
    reason: 'われたでんきゅうは手を切るきけんがあるから「きけん」へ入れるよ。',
  },
  {
    id: 'bottle',
    label: 'ペットボトル',
    emoji: '🧴',
    kind: 'resource',
    location: 'river',
    x: 28,
    y: 72,
    tilt: 11,
    hint: 'マークをたよりに集めると、服やボトルに生まれかわるよ。',
    reason: 'ペットボトルは新しい物に生まれかわるから「しげん」へ入れるよ。',
  },
  {
    id: 'branch',
    label: 'おれた木のえだ',
    emoji: '🪵',
    kind: 'burnable',
    location: 'river',
    x: 72,
    y: 67,
    tilt: -7,
    hint: '川からひろった小さな木だよ。かわかすと燃やせるね。',
    reason: '小さな木のえだは燃やしてしょりできるから「もえる」へ入れるよ。',
  },
];

function binAtPoint(clientX: number, clientY: number): WasteKind | null {
  if (typeof document === 'undefined') return null;

  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const bin = element.closest<HTMLElement>('[data-waste-bin]');
    const kind = bin?.dataset.wasteBin;
    if (kind === 'burnable' || kind === 'resource' || kind === 'danger') return kind;
  }
  return null;
}

export function WasteGame({ skillLevel, onComplete }: ArcadeGameProps) {
  const level = Math.max(1, Number.isFinite(skillLevel) ? skillLevel : 1);
  const [phase, setPhase] = useState<WastePhase>('patrol');
  const [currentLocation, setCurrentLocation] = useState(0);
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [spottedIds, setSpottedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [rejectedId, setRejectedId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('まずは「ひだまり公園」を歩いて、ごみを見つけよう！');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('info');
  const [gauge, setGauge] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [compactAttempts, setCompactAttempts] = useState(0);
  const [compactRound, setCompactRound] = useState(0);

  const startedAtRef = useRef(Date.now());
  const sortedRef = useRef(new Set<string>());
  const spottedRef = useRef(new Set<string>());
  const scoreRef = useRef(0);
  const mistakesRef = useRef(0);
  const streakRef = useRef(0);
  const holdingRef = useRef(false);
  const gaugeRef = useRef(0);
  const compactAttemptsRef = useRef(0);
  const compactRoundRef = useRef(0);
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const firstWasteItemRef = useRef<HTMLButtonElement | null>(null);
  const nextLocationRef = useRef<HTMLButtonElement | null>(null);
  const compactorLeverRef = useRef<HTMLButtonElement | null>(null);

  const location = LOCATIONS[currentLocation] ?? LOCATIONS[0];
  const locationItems = TRASH_ITEMS.filter((item) => item.location === location.id);
  const visibleItems = locationItems.filter((item) => !sortedRef.current.has(item.id));
  const localSortedCount = locationItems.length - visibleItems.length;
  const locationComplete = localSortedCount === locationItems.length;
  const cleanPercent = Math.round((sortedIds.length / TRASH_ITEMS.length) * 100);
  const selectedItem = TRASH_ITEMS.find((item) => item.id === selectedId) ?? null;

  const skillHelp = Math.min(8, Math.max(0, level - 1) * 3);
  const retryHelp = Math.min(18, compactAttempts * 6);
  const roundStart = compactRound === 0 ? 42 : 61;
  const roundEnd = compactRound === 0 ? 69 : 84;
  const greenStart = Math.max(18, roundStart - skillHelp - retryHelp);
  const greenEnd = Math.min(98, roundEnd + skillHelp + retryHelp);

  const schedule = useCallback((task: () => void, delay: number) => {
    const timer = window.setTimeout(task, delay);
    timersRef.current.push(timer);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const changeScore = useCallback((amount: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + amount);
    setScore(scoreRef.current);
  }, []);

  const spotItem = useCallback(
    (itemId: string) => {
      const item = TRASH_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item || spottedRef.current.has(itemId) || sortedRef.current.has(itemId)) return;

      spottedRef.current.add(itemId);
      setSpottedIds(Array.from(spottedRef.current));
      changeScore(10);
      setLastPoints(10);
      setFeedback('見つけた！ ' + item.label + 'だ。どの箱へ運ぶ？');
      setFeedbackTone('good');
      schedule(() => setLastPoints((value) => (value === 10 ? null : value)), 650);
    },
    [changeScore, schedule],
  );

  const sortIntoBin = useCallback(
    (itemId: string, binKind: WasteKind) => {
      const item = TRASH_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item || sortedRef.current.has(itemId) || phase !== 'patrol') return;
      spotItem(itemId);

      if (item.kind !== binKind) {
        mistakesRef.current += 1;
        setMistakes(mistakesRef.current);
        changeScore(-10);
        streakRef.current = 0;
        setStreak(0);
        setRejectedId(itemId);
        setSelectedId(itemId);
        setHintId(itemId);
        setFeedback('ちがう箱だね。' + item.reason + ' もういちどやってみよう！');
        setFeedbackTone('try');
        schedule(() => {
          setRejectedId((current) => (current === itemId ? null : current));
        }, 520);
        return;
      }

      sortedRef.current.add(itemId);
      const nextSorted = Array.from(sortedRef.current);
      const nextStreak = streakRef.current + 1;
      const earned = 100 + Math.min(100, (nextStreak - 1) * 25);
      const isAreaClear = locationItems.every((candidate) => sortedRef.current.has(candidate.id));

      streakRef.current = nextStreak;
      setStreak(nextStreak);
      setSortedIds(nextSorted);
      changeScore(earned);
      setLastPoints(earned);
      setSelectedId(null);
      setHintId(null);
      setRejectedId(null);
      setFeedback(
        isAreaClear
          ? location.label + 'をきれいにできた！ ' + location.clearMessage
          : 'せいかい！ ' + item.reason + (nextStreak >= 2 ? ' ' + nextStreak + 'コンボ！' : ''),
      );
      setFeedbackTone('good');
      schedule(() => setLastPoints((value) => (value === earned ? null : value)), 800);
    },
    [changeScore, location.clearMessage, location.label, locationItems, phase, schedule, spotItem],
  );

  const chooseItem = useCallback(
    (itemId: string) => {
      const item = TRASH_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item || sortedRef.current.has(itemId)) return;
      spotItem(itemId);
      setSelectedId(itemId);
      setHintId(null);
      setFeedback(item.label + 'をひろったよ。マークを見て、箱をえらぼう！');
      setFeedbackTone('info');
    },
    [spotItem],
  );

  const advancePatrol = () => {
    if (!locationComplete) return;

    setSelectedId(null);
    setHintId(null);
    setDragging(null);
    if (currentLocation < LOCATIONS.length - 1) {
      const nextIndex = currentLocation + 1;
      const nextLocation = LOCATIONS[nextIndex];
      setCurrentLocation(nextIndex);
      setFeedback('てくてく移動！ つぎは「' + nextLocation.label + '」をパトロールしよう。');
      setFeedbackTone('info');
      return;
    }

    setPhase('compacting');
    setFeedback('町じゅうのごみを回収！ 回収車で2回ギュッとして、しゅっぱつさせよう。');
    setFeedbackTone('info');
  };

  const finishRun = useCallback(
    (compactPoints: number, compactMistake: number, compactQuality: 'great' | 'okay' | 'rough') => {
      if (completedRef.current) return;
      completedRef.current = true;
      holdingRef.current = false;
      setIsHolding(false);

      const totalMistakes = mistakesRef.current + compactMistake;
      const finalScore = Math.max(0, scoreRef.current + compactPoints + Math.min(60, level * 8));
      const stars: 1 | 2 | 3 =
        compactQuality === 'great' && totalMistakes <= 1 ? 3 : totalMistakes <= 4 ? 2 : 1;
      const title =
        stars === 3 ? '町をすくう清掃名人！' : stars === 2 ? 'ぴかぴかパトロール隊！' : 'やりぬいた町のヒーロー！';
      const detail =
        stars === 3
          ? '3つの場所を見回り、正しく分けて、回収車までばっちり動かせたよ。'
          : stars === 2
            ? '理由をたしかめながら、住民や生きものが帰れる町にできたよ。'
            : 'まちがえても直して、さいごまで町をきれいにできたことがすごい！';

      scoreRef.current = finalScore;
      setScore(finalScore);
      setMistakes(totalMistakes);
      setPhase('done');
      setFeedback('回収車しゅっぱつ！ 町のみんなから「ありがとう！」がとどいたよ。');
      setFeedbackTone('good');

      schedule(() => {
        onComplete({
          score: finalScore,
          mistakes: totalMistakes,
          stars,
          title,
          detail,
          seconds: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        });
      }, 1150);
    },
    [level, onComplete, schedule],
  );

  const settleCompactor = useCallback(
    (rawValue: number) => {
      if (phase !== 'compacting' || completedRef.current) return;
      holdingRef.current = false;
      setIsHolding(false);
      const value = Math.max(0, Math.min(100, Math.round(rawValue)));

      if (value >= greenStart && value <= greenEnd) {
        if (compactRoundRef.current === 0) {
          compactRoundRef.current = 1;
          setCompactRound(1);
          changeScore(140);
          gaugeRef.current = 0;
          setGauge(0);
          setFeedback('ズシン！ 1回目せいこう。ごみが小さくなった！ つぎは、ふたをしっかりロックしよう。');
          setFeedbackTone('good');
          return;
        }

        finishRun(180, compactAttemptsRef.current, compactAttemptsRef.current === 0 ? 'great' : 'okay');
        return;
      }

      const nextAttempts = compactAttemptsRef.current + 1;
      compactAttemptsRef.current = nextAttempts;
      setCompactAttempts(nextAttempts);
      gaugeRef.current = 0;
      setGauge(0);

      if (nextAttempts >= 3) {
        setFeedback('3回しっかり試せたね！ 安全そうちが手伝って、回収できる強さになったよ。');
        setFeedbackTone('good');
        finishRun(125, nextAttempts, 'okay');
        return;
      }

      const reason =
        value < greenStart
          ? 'すこし早くはなしたから、力がまだ足りなかったよ。'
          : '長く押して、力が強くなりすぎたよ。';
      setFeedback(
        reason +
          ' みどりの場所が広くなったから、' +
          (nextAttempts === 1 ? 'もういちどねらおう！' : 'あと1回で安全そうちも手伝うよ！'),
      );
      setFeedbackTone('try');
    },
    [changeScore, finishRun, greenEnd, greenStart, phase],
  );

  useEffect(() => {
    if (!isHolding || phase !== 'compacting') return;

    const timer = window.setInterval(() => {
      setGauge((current) => {
        if (!holdingRef.current || completedRef.current) return current;
        const next = Math.min(100, current + 1.7);
        gaugeRef.current = next;
        return next;
      });
    }, 38);

    return () => window.clearInterval(timer);
  }, [isHolding, phase]);

  useEffect(() => {
    if (phase === 'compacting' && gauge >= 100 && holdingRef.current) {
      settleCompactor(100);
    }
  }, [gauge, phase, settleCompactor]);

  const startHolding = useCallback(() => {
    if (phase !== 'compacting' || completedRef.current || holdingRef.current) return;
    gaugeRef.current = 0;
    setGauge(0);
    holdingRef.current = true;
    setIsHolding(true);
    setFeedback(compactRoundRef.current === 0 ? 'ギューッ！ みどりで手をはなそう！' : 'カチッとロック！ みどりをねらおう！');
    setFeedbackTone('info');
  }, [phase]);

  const stopHolding = useCallback(() => {
    if (!holdingRef.current) return;
    settleCompactor(gaugeRef.current);
  }, [settleCompactor]);

  const cancelHolding = useCallback(() => {
    const wasHolding = holdingRef.current;
    holdingRef.current = false;
    setIsHolding(false);
    if (!wasHolding || phase !== 'compacting' || completedRef.current) return;

    gaugeRef.current = 0;
    setGauge(0);
    setFeedback('いったん止めたよ。もういちど長押しすればだいじょうぶ！');
    setFeedbackTone('info');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'compacting') return;

    const handleWindowBlur = () => cancelHolding();
    const handleVisibilityChange = () => {
      if (document.hidden) cancelHolding();
    };
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cancelHolding, phase]);

  const handleItemPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, itemId: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    chooseItem(itemId);
    setDragging({ id: itemId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 });
  };

  const handleItemPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      !dragging ||
      dragging.id !== event.currentTarget.dataset.wasteItem ||
      dragging.pointerId !== event.pointerId
    ) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      setDragging(null);
      return;
    }
    event.preventDefault();
    setDragging((current) =>
      current
        ? {
            ...current,
            dx: event.clientX - current.startX,
            dy: event.clientY - current.startY,
          }
        : null,
    );
  };

  const handleItemPointerUp = (event: ReactPointerEvent<HTMLButtonElement>, itemId: string) => {
    if (!dragging || dragging.id !== itemId || dragging.pointerId !== event.pointerId) return;
    event.preventDefault();
    const targetBin = binAtPoint(event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
    if (targetBin) sortIntoBin(itemId, targetBin);
  };

  const cancelItemDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    setDragging((current) => current?.pointerId === event.pointerId ? null : current);
  };

  const handleLeverKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      startHolding();
    }
  };

  const handleLeverKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      stopHolding();
    }
  };

  useEffect(() => {
    if (phase === 'patrol' && currentLocation === 0 && sortedIds.length === 0) return;
    let target: HTMLButtonElement | null = null;
    if (phase === 'patrol') {
      target = locationComplete ? nextLocationRef.current : firstWasteItemRef.current;
    } else if (phase === 'compacting') {
      target = compactorLeverRef.current;
    }
    if (!target) return;
    const frame = window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [currentLocation, locationComplete, phase, sortedIds.length]);

  const gaugeMessage =
    gauge < 24 ? 'まだまだ' : gauge < greenStart ? 'もうすこし' : gauge <= greenEnd ? 'いま！' : '押しすぎ注意';
  const townClassName = [
    'waste-town',
    'waste-location-' + location.id,
    'waste-local-clean-' + localSortedCount,
    locationComplete ? 'is-area-clear' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="arcade-game waste-game" aria-labelledby="waste-game-title">
      <header className="arcade-game-header waste-game-header">
        <div>
          <span className="arcade-job-chip waste-job-chip">まち美化センター</span>
          <h2 id="waste-game-title">クリーン・タウン パトロール</h2>
        </div>
        <div className="waste-live-hud" aria-label={'スコア ' + score + '点、' + streak + 'コンボ'}>
          <div className="arcade-score-card waste-score-card">
            <span>スコア</span>
            <strong>{score.toLocaleString()}</strong>
            {lastPoints !== null && <em aria-hidden="true">+{lastPoints}</em>}
          </div>
          <div className={'waste-combo-card ' + (streak >= 2 ? 'is-hot' : '')}>
            <span>れんぞく</span>
            <strong>{streak}</strong>
            <small>COMBO</small>
          </div>
        </div>
      </header>

      <div className="arcade-step-row waste-step-row" aria-label="仕事の進みぐあい">
        <span className={phase === 'patrol' ? 'is-current' : 'is-done'}>1 町をパトロール</span>
        <span aria-hidden="true">→</span>
        <span className={phase === 'compacting' ? 'is-current' : phase === 'done' ? 'is-done' : ''}>
          2 回収車を動かす
        </span>
      </div>

      {phase === 'patrol' && (
        <div className="waste-patrol-stage">
          <ol className="waste-route" aria-label="パトロールする3つの場所">
            {LOCATIONS.map((place, index) => {
              const state = index < currentLocation ? 'is-done' : index === currentLocation ? 'is-current' : 'is-next';
              return (
                <li key={place.id} className={state} aria-current={index === currentLocation ? 'step' : undefined}>
                  <span aria-hidden="true">{index < currentLocation ? '✓' : place.icon}</span>
                  <strong>{place.shortLabel}</strong>
                </li>
              );
            })}
          </ol>

          <div className="arcade-instruction waste-instruction">
            <span aria-hidden="true">🔎</span>
            <p>
              <strong>{location.label}</strong>：{location.mission}
              <small>ごみを見つけて選ぶか、そのまま箱へドラッグしよう。</small>
            </p>
          </div>

          <div
            className={townClassName}
            aria-label={
              location.label +
              'のようす。ごみを' +
              localSortedCount +
              'こ回収、町ぜんたいのきれいさ' +
              cleanPercent +
              'パーセント'
            }
          >
            <div className="waste-scene-art" aria-hidden="true">
              <div className="waste-sky">
                <span className="waste-sun">☀</span>
                <span className="waste-cloud waste-cloud-one">☁</span>
                <span className="waste-cloud waste-cloud-two">☁</span>
              </div>
              <div className="waste-haze"><i /><i /><i /></div>

              {location.id === 'park' && (
                <div className="waste-park-art">
                  <span className="waste-tree tree-one">🌳</span>
                  <span className="waste-tree tree-two">🌳</span>
                  <span className="waste-playground">🛝</span>
                  <span className="waste-bench">🪑</span>
                </div>
              )}
              {location.id === 'street' && (
                <div className="waste-street-art">
                  <div className="waste-shop shop-one"><i /><b>パン</b></div>
                  <div className="waste-shop shop-two"><i /><b>やおや</b></div>
                  <div className="waste-shop shop-three"><i /><b>ほん</b></div>
                  <span className="waste-street-lamp">💡</span>
                </div>
              )}
              {location.id === 'river' && (
                <div className="waste-river-art">
                  <div className="waste-river-water"><i /><i /><i /></div>
                  <div className="waste-bridge"><i /><i /><i /></div>
                  <span className="waste-reeds reeds-one">🌾</span>
                  <span className="waste-reeds reeds-two">🌾</span>
                </div>
              )}

              <div className="waste-ground" />
              <div className="waste-walk-path" />
              <div className="waste-worker">
                <span>🧑‍🔧</span>
                <i>•••</i>
              </div>
              {localSortedCount >= 1 && (
                <span className="waste-returning-friend friend-one">{location.friend}</span>
              )}
              {localSortedCount >= 2 && (
                <span className="waste-returning-friend friend-two">
                  {location.id === 'park' ? '🐿️' : location.id === 'street' ? '🧑‍🍳' : '🐟'}
                </span>
              )}
              {locationComplete && (
                <span className="waste-returning-friend friend-celebrate">
                  {location.id === 'park' ? '👧👦' : location.id === 'street' ? '👨‍👩‍👧' : '✨'}
                </span>
              )}
            </div>

            <div className="waste-area-sign">
              <span aria-hidden="true">{location.icon}</span>
              <strong>{location.label}</strong>
              <small>あと {visibleItems.length}こ</small>
            </div>

            {visibleItems.map((item, index) => {
              const drag = dragging?.id === item.id ? dragging : null;
              const itemStyle: CSSProperties = {
                left: item.x + '%',
                top: item.y + '%',
                transform: drag
                  ? 'translate(calc(-50% + ' +
                    drag.dx +
                    'px), calc(-50% + ' +
                    drag.dy +
                    'px)) rotate(' +
                    item.tilt +
                    'deg) scale(1.12)'
                  : 'translate(-50%, -50%) rotate(' + item.tilt + 'deg)',
                zIndex: drag ? 50 : 8,
                touchAction: 'none',
              };
              const isSpotted = spottedIds.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  ref={index === 0 ? firstWasteItemRef : undefined}
                  data-waste-item={item.id}
                  className={[
                    'waste-trash-item',
                    selectedId === item.id ? 'is-selected' : '',
                    rejectedId === item.id ? 'is-rejected' : '',
                    drag ? 'is-dragging' : '',
                    isSpotted ? 'is-spotted' : 'is-unspotted',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={itemStyle}
                  aria-pressed={selectedId === item.id}
                  aria-label={item.label + '。選ぶか、下の箱へドラッグします'}
                  onClick={(event) => {
                    if (event.detail === 0) chooseItem(item.id);
                  }}
                  onPointerDown={(event) => handleItemPointerDown(event, item.id)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={(event) => handleItemPointerUp(event, item.id)}
                  onPointerCancel={cancelItemDrag}
                  onLostPointerCapture={cancelItemDrag}
                >
                  <span className="waste-find-ring" aria-hidden="true">＋</span>
                  <span className="waste-trash-emoji" aria-hidden="true">{item.emoji}</span>
                  <span className="waste-trash-label">{item.label}</span>
                </button>
              );
            })}

            {locationComplete && (
              <div className="waste-clean-scene-message" role="status">
                <span aria-hidden="true">✨</span>
                <strong>エリア クリア！</strong>
                <small>{location.clearMessage}</small>
              </div>
            )}
          </div>

          <div className="waste-clean-meter" aria-label={'町のきれいさ ' + cleanPercent + 'パーセント'}>
            <span>町のきれいさ</span>
            <div
              className="waste-clean-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={cleanPercent}
            >
              <span className="waste-clean-fill" style={{ width: cleanPercent + '%' }} />
              <i aria-hidden="true">🌱</i>
            </div>
            <strong>{sortedIds.length}/{TRASH_ITEMS.length}</strong>
          </div>

          <div className="waste-sort-console">
            <section className="waste-toolbelt" aria-label="いま調べているごみ">
              {selectedItem ? (
                <>
                  <div className="waste-selected-item">
                    <span aria-hidden="true">{selectedItem.emoji}</span>
                    <div>
                      <small>ひろったもの</small>
                      <strong>{selectedItem.label}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="waste-hint-button"
                    aria-expanded={hintId === selectedItem.id}
                    onClick={() => {
                      setHintId((current) => (current === selectedItem.id ? null : selectedItem.id));
                      setFeedbackTone('info');
                    }}
                  >
                    <span aria-hidden="true">💡</span>
                    {hintId === selectedItem.id ? 'ヒントをとじる' : 'まよったらヒント'}
                  </button>
                  {hintId === selectedItem.id && (
                    <p className="waste-hint-text" role="status">{selectedItem.hint}</p>
                  )}
                </>
              ) : (
                <div className="waste-search-prompt">
                  <span aria-hidden="true">👀</span>
                  <strong>{locationComplete ? 'この場所はぴかぴか！' : '町の中をよく見よう'}</strong>
                  <small>{locationComplete ? 'つぎの場所へ歩いていこう。' : 'ごみは道や草むらにかくれているよ。'}</small>
                </div>
              )}
            </section>

            <div className="waste-bins" role="group" aria-label="ごみを入れる3つの箱">
              {BINS.map((bin) => (
                <button
                  type="button"
                  key={bin.kind}
                  data-waste-bin={bin.kind}
                  className={'waste-bin waste-bin-' + bin.kind}
                  aria-label={bin.label + 'の箱。' + bin.hint}
                  onClick={() => {
                    if (selectedId) {
                      sortIntoBin(selectedId, bin.kind);
                    } else {
                      setFeedback('さきに、町のごみをひとつ見つけてひろおう！');
                      setFeedbackTone('info');
                    }
                  }}
                >
                  <span className="waste-bin-lid" aria-hidden="true"><i /></span>
                  <span className="waste-bin-emoji" aria-hidden="true">{bin.emoji}</span>
                  <strong>{bin.label}</strong>
                  <small>{bin.hint}</small>
                </button>
              ))}
            </div>
          </div>

          {locationComplete && (
            <button ref={nextLocationRef} type="button" className="waste-next-location" onClick={advancePatrol}>
              <span aria-hidden="true">{currentLocation < LOCATIONS.length - 1 ? '👟' : '🚛'}</span>
              <span>
                <small>{location.clearMessage}</small>
                <strong>
                  {currentLocation < LOCATIONS.length - 1
                    ? 'つぎの「' + LOCATIONS[currentLocation + 1].label + '」へ歩く'
                    : '回収車へごみを運ぶ'}
                </strong>
              </span>
              <b aria-hidden="true">→</b>
            </button>
          )}
        </div>
      )}

      {(phase === 'compacting' || phase === 'done') && (
        <div className={'waste-compactor-stage ' + (phase === 'done' ? 'is-complete' : '')}>
          <div className="arcade-instruction waste-instruction">
            <span aria-hidden="true">{compactRound === 0 ? '💪' : '🔒'}</span>
            <p>
              <strong>{compactRound === 0 ? '工程1：ごみを小さくする' : '工程2：ふたをロックする'}</strong>
              <small>赤いレバーを長押し。メーターがみどりに入ったら手をはなそう。</small>
            </p>
          </div>

          <div className="waste-compact-rounds" aria-label={'回収車の工程、' + (compactRound + 1) + 'つ目'}>
            <span className={compactRound >= 0 ? 'is-current' : ''}><i>1</i> ギュッと圧縮</span>
            <b aria-hidden="true">→</b>
            <span className={compactRound >= 1 ? 'is-current' : ''}><i>2</i> ふたをロック</span>
          </div>

          <div className="waste-compactor-scene" aria-label="ごみ回収車の圧縮機">
            <div
              className={[
                'waste-truck',
                'is-round-' + compactRound,
                isHolding ? 'is-working' : '',
                phase === 'done' ? 'is-departing' : '',
              ].join(' ')}
              aria-hidden="true"
            >
              <div className="waste-truck-bin">
                <span className="waste-truck-load">♻</span>
                <i className="waste-crush-plate" />
                <b>つなぐクリーン</b>
              </div>
              <div className="waste-truck-cab">
                <i className="waste-truck-window">☺</i>
                <i className="waste-truck-light" />
                <b>eco</b>
              </div>
              <i className="waste-wheel wheel-back" />
              <i className="waste-wheel wheel-front" />
              <span className="waste-truck-action">
                {phase === 'done' ? 'しゅっぱつ！' : isHolding ? 'ガガガ…！' : compactRound === 0 ? '圧縮まち' : 'ロックまち'}
              </span>
              <span className="waste-truck-sparkles">{phase === 'done' ? '✨✨' : ''}</span>
            </div>

            <div className="waste-control-panel">
              <div className="waste-control-title">
                <span aria-hidden="true">⚙️</span>
                <div>
                  <small>安全コントロール</small>
                  <strong>{compactRound === 0 ? 'あつりょくメーター' : 'ロックメーター'}</strong>
                </div>
                <em>{compactRound + 1}/2</em>
              </div>

              <div className="waste-gauge-wrap">
                <div className="waste-gauge-labels" aria-hidden="true">
                  <span>たりない</span>
                  <strong>みどりで はなす！</strong>
                  <span>つよすぎ</span>
                </div>
                <div
                  className="waste-gauge-track"
                  role="progressbar"
                  aria-label={compactRound === 0 ? '圧縮メーター' : 'ロックメーター'}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(gauge)}
                  aria-valuetext={gaugeMessage + '、' + Math.round(gauge) + 'パーセント'}
                >
                  <span
                    className="waste-gauge-green-zone"
                    style={{ left: greenStart + '%', width: greenEnd - greenStart + '%' }}
                  >
                    <i aria-hidden="true">ここ！</i>
                  </span>
                  <span className="waste-gauge-fill" style={{ width: gauge + '%' }} />
                  <span className="waste-gauge-needle" style={{ left: gauge + '%' }} />
                </div>
                <strong className={'waste-gauge-message ' + (gauge >= greenStart && gauge <= greenEnd ? 'is-green' : '')}>
                  {phase === 'done' ? '回収できた！' : gaugeMessage}
                </strong>
              </div>

              <button
                ref={compactorLeverRef}
                type="button"
                className={'waste-lever ' + (isHolding ? 'is-holding' : '')}
                style={{ touchAction: 'none' }}
                disabled={phase === 'done'}
                aria-label="赤いレバー。みどりまで長押し。長押しがむずかしいときは、音声操作で1回押しても進めます"
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse' && event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  startHolding();
                }}
                onPointerUp={(event) => {
                  event.preventDefault();
                  stopHolding();
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={cancelHolding}
                onLostPointerCapture={cancelHolding}
                onBlur={cancelHolding}
                onKeyDown={handleLeverKeyDown}
                onKeyUp={handleLeverKeyUp}
                onClick={(event) => {
                  if (event.detail === 0) settleCompactor((greenStart + greenEnd) / 2);
                }}
              >
                <span className="waste-lever-handle" aria-hidden="true"><i /></span>
                <span>
                  <small>{isHolding ? 'そのまま！' : '押してためる'}</small>
                  <strong>{isHolding ? 'ギューッ！' : '長押しスタート'}</strong>
                </span>
              </button>

              <button
                type="button"
                className="waste-lever-assist"
                disabled={phase === 'done'}
                onClick={() => settleCompactor((greenStart + greenEnd) / 2)}
              >
                <span aria-hidden="true">🛟</span>
                長おしが むずかしいとき：安全そうちで 1回
              </button>

              <p className="waste-safety-note">
                <span aria-hidden="true">🛟</span>
                3回チャレンジすると安全そうちが手伝うから、かならず先へ進めるよ。
              </p>
            </div>
          </div>

          {phase === 'done' && (
            <div className="arcade-celebration waste-celebration" role="status">
              <span aria-hidden="true">🎉</span>
              <strong>町じゅうがぴかぴか！</strong>
              <span aria-hidden="true">🌈</span>
            </div>
          )}
        </div>
      )}

      <div className="arcade-feedback waste-feedback" data-tone={feedbackTone} aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">{feedbackTone === 'good' ? '⭐' : feedbackTone === 'try' ? '💡' : '📣'}</span>
        <strong>{feedback}</strong>
      </div>

      <footer className="arcade-game-footer waste-game-footer">
        <span>見つけた：{spottedIds.length}/{TRASH_ITEMS.length}</span>
        <span>まちがい：{mistakes + (phase === 'compacting' ? compactAttempts : 0)}</span>
        <span>しごとレベル：{level}</span>
      </footer>
    </section>
  );
}
