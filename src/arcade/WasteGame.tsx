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
type WastePhase = 'sorting' | 'compacting' | 'done';
type FeedbackTone = 'info' | 'good' | 'try';

interface TrashItem {
  id: string;
  label: string;
  emoji: string;
  kind: WasteKind;
  x: number;
  y: number;
  tilt: number;
}

interface DragState {
  id: string;
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
  { kind: 'burnable', label: 'もえる', emoji: '🔥', hint: 'かわ・ティッシュ・木' },
  { kind: 'resource', label: 'しげん', emoji: '♻️', hint: 'びん・かん・紙' },
  { kind: 'danger', label: 'きけん', emoji: '⚠️', hint: 'でんち・われもの' },
];

const TRASH_ITEMS: TrashItem[] = [
  { id: 'banana', label: 'バナナのかわ', emoji: '🍌', kind: 'burnable', x: 10, y: 62, tilt: -12 },
  { id: 'tissue', label: 'つかったティッシュ', emoji: '🧻', kind: 'burnable', x: 44, y: 57, tilt: 8 },
  { id: 'branch', label: '木のえだ', emoji: '🪵', kind: 'burnable', x: 77, y: 67, tilt: -7 },
  { id: 'bottle', label: 'ペットボトル', emoji: '🧴', kind: 'resource', x: 26, y: 72, tilt: 11 },
  { id: 'can', label: 'あきかん', emoji: '🥫', kind: 'resource', x: 61, y: 72, tilt: -10 },
  { id: 'paper', label: 'しんぶんし', emoji: '📰', kind: 'resource', x: 87, y: 53, tilt: 6 },
  { id: 'battery', label: 'つかったでんち', emoji: '🔋', kind: 'danger', x: 35, y: 82, tilt: -5 },
  { id: 'bulb', label: 'われたでんきゅう', emoji: '💡', kind: 'danger', x: 70, y: 84, tilt: 10 },
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
  const [phase, setPhase] = useState<WastePhase>('sorting');
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [rejectedId, setRejectedId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState('町におちたごみを、ぴったりの箱へはこぼう！');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('info');
  const [gauge, setGauge] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [compactAttempts, setCompactAttempts] = useState(0);

  const startedAtRef = useRef(Date.now());
  const sortedRef = useRef(new Set<string>());
  const holdingRef = useRef(false);
  const gaugeRef = useRef(0);
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const skillHelp = Math.min(10, Math.max(0, level - 1) * 2);
  const retryHelp = compactAttempts * 7;
  const greenStart = Math.max(36, 58 - skillHelp - retryHelp);
  const greenEnd = Math.min(97, 82 + skillHelp + retryHelp);
  const cleanPercent = Math.round((sortedIds.length / TRASH_ITEMS.length) * 100);

  const schedule = useCallback((task: () => void, delay: number) => {
    const timer = window.setTimeout(task, delay);
    timersRef.current.push(timer);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const sortIntoBin = useCallback(
    (itemId: string, binKind: WasteKind) => {
      const item = TRASH_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item || sortedRef.current.has(itemId) || phase !== 'sorting') return;

      if (item.kind !== binKind) {
        setMistakes((value) => value + 1);
        setScore((value) => Math.max(0, value - 15));
        setStreak(0);
        setRejectedId(itemId);
        setSelectedId(itemId);
        setFeedback(`${item.label}は「${KIND_LABEL[item.kind]}」だよ。もどして、もういちど！`);
        setFeedbackTone('try');
        schedule(() => {
          setRejectedId((current) => (current === itemId ? null : current));
        }, 520);
        return;
      }

      sortedRef.current.add(itemId);
      const nextSorted = [...sortedRef.current];
      const earned = 100 + Math.min(40, streak * 10);
      setSortedIds(nextSorted);
      setScore((value) => value + earned);
      setStreak((value) => value + 1);
      setSelectedId(null);
      setRejectedId(null);
      setFeedback(
        nextSorted.length === TRASH_ITEMS.length
          ? 'ぜんぶ回収できた！つぎは回収車でギュッと小さくしよう！'
          : `せいかい！ ${item.label}を回収。町がきれいになったよ！`,
      );
      setFeedbackTone('good');

      if (nextSorted.length === TRASH_ITEMS.length) {
        schedule(() => {
          setPhase('compacting');
          setFeedback('レバーを長押し。メーターがみどりで、手をはなそう！');
          setFeedbackTone('info');
        }, 850);
      }
    },
    [phase, schedule, streak],
  );

  const finishRun = useCallback(
    (compactPoints: number, compactMistake: number, compactQuality: 'great' | 'okay' | 'rough') => {
      if (completedRef.current) return;
      completedRef.current = true;
      holdingRef.current = false;
      setIsHolding(false);

      const totalMistakes = mistakes + compactMistake;
      const finalScore = Math.max(0, score + compactPoints + Math.min(60, level * 8));
      const stars: 1 | 2 | 3 =
        compactQuality === 'great' && totalMistakes <= 1 ? 3 : totalMistakes <= 3 ? 2 : 1;
      const title =
        stars === 3 ? '町そうじの名人！' : stars === 2 ? '分別チャレンジャー！' : 'おそうじヒーロー！';
      const detail =
        stars === 3
          ? 'ごみを正しく分けて、町も回収車もぴかぴかにできたよ。'
          : stars === 2
            ? 'まちがいを直しながら、さいごまで町をきれいにできたよ。'
            : 'さいごまでやりとげたね。つぎは箱のマークをよく見てみよう！';

      setMistakes(totalMistakes);
      setScore(finalScore);
      setPhase('done');
      setFeedback(stars === 3 ? 'ジャスト！回収車が元気に出発したよ！' : '回収できた！町のみんながよろこんでいるよ！');
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
      }, 950);
    },
    [level, mistakes, onComplete, schedule, score],
  );

  const settleCompactor = useCallback(
    (rawValue: number) => {
      if (phase !== 'compacting' || completedRef.current) return;
      holdingRef.current = false;
      setIsHolding(false);
      const value = Math.max(0, Math.min(100, Math.round(rawValue)));

      if (value >= greenStart && value <= greenEnd) {
        finishRun(260, compactAttempts, 'great');
        return;
      }

      const nextAttempts = compactAttempts + 1;
      setCompactAttempts(nextAttempts);
      gaugeRef.current = 0;
      setGauge(0);

      if (nextAttempts >= 3) {
        setFeedback('3回チャレンジできたね！回収できる強さになったよ。');
        setFeedbackTone('good');
        finishRun(175, nextAttempts, 'okay');
        return;
      }

      setFeedback(
        nextAttempts === 1
          ? 'おしい！みどりが少し広くなったよ。すぐにもういちど！'
          : 'だいじょうぶ！みどりがもっと広くなったよ。あと1回チャレンジ！',
      );
      setFeedbackTone('try');
    },
    [compactAttempts, finishRun, greenEnd, greenStart, phase],
  );

  useEffect(() => {
    if (!isHolding || phase !== 'compacting') return;

    const timer = window.setInterval(() => {
      setGauge((current) => {
        if (!holdingRef.current || completedRef.current) return current;
        const next = Math.min(100, current + 1.6);
        gaugeRef.current = next;
        return next;
      });
    }, 40);

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
    setFeedback('ギューッ……みどりをねらおう！');
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
    setSelectedId(itemId);
    setDragging({ id: itemId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 });
  };

  const handleItemPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging || dragging.id !== event.currentTarget.dataset.wasteItem) return;
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
    if (!dragging || dragging.id !== itemId) return;
    event.preventDefault();
    const targetBin = binAtPoint(event.clientX, event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
    if (targetBin) sortIntoBin(itemId, targetBin);
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

  const selectedItem = TRASH_ITEMS.find((item) => item.id === selectedId);
  const gaugeMessage =
    gauge < 30 ? 'まだまだ' : gauge < greenStart ? 'もうすこし' : gauge <= greenEnd ? 'いま！' : '押しすぎ注意';

  return (
    <section className="arcade-game waste-game" aria-labelledby="waste-game-title">
      <header className="arcade-game-header waste-game-header">
        <div>
          <span className="arcade-job-chip waste-job-chip">しげん回収センター</span>
          <h2 id="waste-game-title">町をぴかぴかにしよう！</h2>
        </div>
        <div className="arcade-score-card waste-score-card" aria-label={`いまのスコア ${score}点`}>
          <span>スコア</span>
          <strong>{score}</strong>
        </div>
      </header>

      <div className="arcade-step-row waste-step-row" aria-label="仕事の進みぐあい">
        <span className={phase === 'sorting' ? 'is-current' : 'is-done'}>1 ごみを分ける</span>
        <span aria-hidden="true">→</span>
        <span className={phase === 'compacting' ? 'is-current' : phase === 'done' ? 'is-done' : ''}>
          2 回収車でギュッ
        </span>
      </div>

      {phase === 'sorting' && (
        <div className="waste-sorting-stage">
          <div className="arcade-instruction waste-instruction">
            <span aria-hidden="true">☝️</span>
            <p>
              ごみをつかんで、同じなかまの箱へ！
              <small>キーボードなら、ごみを選んでから箱を押してね。</small>
            </p>
          </div>

          <div
            className={`waste-town waste-clean-${Math.min(4, Math.floor(sortedIds.length / 2))}`}
            aria-label={`町のようす。ごみを${sortedIds.length}こ回収、きれいさ${cleanPercent}パーセント`}
          >
            <div className="waste-town-sky" aria-hidden="true">
              <span className="waste-sun">☀️</span>
              <span className="waste-cloud waste-cloud-one">☁️</span>
              <span className="waste-cloud waste-cloud-two">☁️</span>
            </div>
            <div className="waste-town-buildings" aria-hidden="true">
              <span>🏠</span>
              <span>🏪</span>
              <span>🏫</span>
            </div>
            <div className="waste-town-road" aria-hidden="true" />
            {sortedIds.length >= 2 && <span className="waste-clean-reward waste-flower-one" aria-hidden="true">🌼</span>}
            {sortedIds.length >= 4 && <span className="waste-clean-reward waste-flower-two" aria-hidden="true">🌷</span>}
            {sortedIds.length >= 6 && <span className="waste-clean-reward waste-bird" aria-hidden="true">🐦</span>}
            {sortedIds.length === TRASH_ITEMS.length && (
              <span className="waste-clean-reward waste-rainbow" aria-hidden="true">🌈</span>
            )}

            {TRASH_ITEMS.filter((item) => !sortedRef.current.has(item.id)).map((item) => {
              const drag = dragging?.id === item.id ? dragging : null;
              const itemStyle: CSSProperties = {
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: drag
                  ? `translate3d(${drag.dx}px, ${drag.dy}px, 0) rotate(${item.tilt}deg) scale(1.12)`
                  : `rotate(${item.tilt}deg)`,
                zIndex: drag ? 20 : 3,
                touchAction: 'none',
              };
              return (
                <button
                  type="button"
                  key={item.id}
                  data-waste-item={item.id}
                  className={`waste-trash-item ${selectedId === item.id ? 'is-selected' : ''} ${
                    rejectedId === item.id ? 'is-rejected' : ''
                  } ${drag ? 'is-dragging' : ''}`}
                  style={itemStyle}
                  aria-pressed={selectedId === item.id}
                  aria-label={`${item.label}。ドラッグするか、選んでから箱を押します`}
                  onClick={() => {
                    if (sortedRef.current.has(item.id)) {
                      setSelectedId(null);
                      return;
                    }
                    setSelectedId(item.id);
                    setFeedback(`${item.label}をえらんだよ。どの箱かな？`);
                    setFeedbackTone('info');
                  }}
                  onPointerDown={(event) => handleItemPointerDown(event, item.id)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={(event) => handleItemPointerUp(event, item.id)}
                  onPointerCancel={() => setDragging(null)}
                >
                  <span className="waste-trash-emoji" aria-hidden="true">{item.emoji}</span>
                  <span className="waste-trash-label">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="waste-clean-meter" aria-label={`町のきれいさ ${cleanPercent}パーセント`}>
            <span>町のきれいさ</span>
            <div className="waste-clean-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={cleanPercent}>
              <span className="waste-clean-fill" style={{ width: `${cleanPercent}%` }} />
            </div>
            <strong>{sortedIds.length}/{TRASH_ITEMS.length}</strong>
          </div>

          <div className="waste-bins" role="group" aria-label="ごみを入れる3つの箱">
            {BINS.map((bin) => (
              <button
                type="button"
                key={bin.kind}
                data-waste-bin={bin.kind}
                className={`waste-bin waste-bin-${bin.kind}`}
                aria-label={`${bin.label}の箱。${bin.hint}`}
                onClick={() => {
                  if (selectedId) {
                    sortIntoBin(selectedId, bin.kind);
                  } else {
                    setFeedback('さきに、町のごみをひとつ選ぼう！');
                    setFeedbackTone('info');
                  }
                }}
              >
                <span className="waste-bin-lid" aria-hidden="true" />
                <span className="waste-bin-emoji" aria-hidden="true">{bin.emoji}</span>
                <strong>{bin.label}</strong>
                <small>{bin.hint}</small>
              </button>
            ))}
          </div>

          <p className="waste-selection-note">
            {selectedItem ? `いま持っているもの：${selectedItem.emoji} ${selectedItem.label}` : 'ごみをひとつ選んでね'}
          </p>
        </div>
      )}

      {(phase === 'compacting' || phase === 'done') && (
        <div className={`waste-compactor-stage ${phase === 'done' ? 'is-complete' : ''}`}>
          <div className="arcade-instruction waste-instruction">
            <span aria-hidden="true">✊</span>
            <p>
              レバーを長押しして、みどりで手をはなそう！
              <small>マウス・指・スペースキー、どれでも長押しできるよ。</small>
            </p>
          </div>

          <div className="waste-compactor-scene" aria-label="ごみ回収車の圧縮機">
            <div className="waste-truck" aria-hidden="true">
              <span className="waste-truck-load">♻️</span>
              <span className="waste-truck-body">🚛</span>
              {phase === 'done' && <span className="waste-truck-sparkles">✨✨</span>}
            </div>

            <div className="waste-gauge-wrap">
              <div className="waste-gauge-labels" aria-hidden="true">
                <span>まだ</span>
                <strong>みどりで はなす！</strong>
                <span>いっぱい</span>
              </div>
              <div
                className="waste-gauge-track"
                role="progressbar"
                aria-label="圧縮メーター"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(gauge)}
                aria-valuetext={`${gaugeMessage}、${Math.round(gauge)}パーセント`}
              >
                <span
                  className="waste-gauge-green-zone"
                  style={{ left: `${greenStart}%`, width: `${greenEnd - greenStart}%` }}
                />
                <span className="waste-gauge-fill" style={{ width: `${gauge}%` }} />
                <span className="waste-gauge-needle" style={{ left: `${gauge}%` }} />
              </div>
              <strong className={`waste-gauge-message ${gauge >= greenStart && gauge <= greenEnd ? 'is-green' : ''}`}>
                {phase === 'done' ? '回収できた！' : gaugeMessage}
              </strong>
            </div>

            <button
              type="button"
              className={`waste-lever ${isHolding ? 'is-holding' : ''}`}
              style={{ touchAction: 'none' }}
              disabled={phase === 'done'}
              aria-label="圧縮レバー。メーターがみどりになるまで長押しします"
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
            >
              <span className="waste-lever-handle" aria-hidden="true">⬇️</span>
              <strong>{isHolding ? 'ギューッ！' : '長押し！'}</strong>
            </button>
          </div>

          {phase === 'done' && (
            <div className="arcade-celebration waste-celebration" role="status">
              <span aria-hidden="true">🎉</span>
              <strong>町がぴかぴか！</strong>
              <span aria-hidden="true">🎉</span>
            </div>
          )}
        </div>
      )}

      <div className="arcade-feedback waste-feedback" data-tone={feedbackTone} aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">{feedbackTone === 'good' ? '⭐' : feedbackTone === 'try' ? '💡' : '📣'}</span>
        <strong>{feedback}</strong>
      </div>

      <footer className="arcade-game-footer waste-game-footer">
        <span>まちがい：{mistakes + (phase === 'compacting' ? compactAttempts : 0)}</span>
        <span>れんぞくせいかい：{streak}</span>
        <span>しごとレベル：{level}</span>
      </footer>
    </section>
  );
}
