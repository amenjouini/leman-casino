// File: components/Roulette.tsx
import React, { useEffect, useRef, useState } from 'react';
import styles from '../app/index.module.less';

const TIMER = 9000;
const red = [32,19,21,25,34,27,36,30,23,5,16,1,14,9,18,7,12,3];

export function Roulette(): JSX.Element {
  const innerRef = useRef<HTMLUListElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [maskText, setMaskText] = useState('Place Your Bets');
  const [result, setResult] = useState<{ number: number|string; color: string } | null>(null);
  const [previousResults, setPreviousResults] = useState<Array<{number:number|string,color:string}>>([]);

  // helper to find the li that contains a given numeric value
  function findLiByValue(val: number | string) {
    if (!innerRef.current) return null;
    const items = Array.from(innerRef.current.querySelectorAll('li'));
    return items.find(item => {
      const input = item.querySelector('input');
      return input && (input as HTMLInputElement).value === String(val);
    }) as HTMLLIElement | undefined || null;
  }

  function doSpin() {
    if (!innerRef.current || isSpinning) return;
    setIsSpinning(true);

    // pick a random roulette number between 0 and 36 (inclusive)
    const randomNumber = Math.floor(Math.random() * 37);

    // set the data-spinto attr on the .inner so the LESS animation triggers
    innerRef.current.setAttribute('data-spinto', String(randomNumber));

    // check the input for the matching li (keeps visual parity with original)
    const found = findLiByValue(randomNumber);
    if (found) {
      const input = found.querySelector('input') as HTMLInputElement | null;
      if (input) input.checked = true;
    }

    // UI changes while spinning
    setMaskText('Place Your Bets');

    // No more bets halfway
    setTimeout(() => setMaskText('No More Bets'), TIMER / 2);
    setTimeout(() => setMaskText('Place Your Bets'), TIMER + 500);

    // after the ball stops
    setTimeout(() => {
      // determine color
      let color = 'black';
      if (randomNumber === 0) color = 'green';
      else if (red.indexOf(randomNumber) !== -1) color = 'red';

      setResult({ number: randomNumber, color });
      setPreviousResults(prev => [{ number: randomNumber, color }, ...prev]);
      setIsSpinning(false);

      // add class to reveal .data and rest state to inner element (handled by classnames in DOM)
      if (innerRef.current) innerRef.current.classList.add('rest');
    }, TIMER);
  }

  function doReset() {
    if (!innerRef.current) return;
    innerRef.current.removeAttribute('data-spinto');
    innerRef.current.classList.remove('rest');
    // uncheck all inputs
    Array.from(innerRef.current.querySelectorAll('input')).forEach((i: Element) => {
      (i as HTMLInputElement).checked = false;
    });
    setResult(null);
    setIsSpinning(false);
  }

  // simple touch-swipe handler (left/right swipe)
  useEffect(() => {
    const plate = plateRef.current;
    if (!plate) return;
    let startX: number | null = null;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
    }
    function onTouchEnd(e: TouchEvent) {
      if (startX === null) return;
      const endX = (e.changedTouches && e.changedTouches[0].clientX) || null;
      if (!endX) { startX = null; return; }
      const diff = endX - startX;
      if (Math.abs(diff) > 40) {
        // if not disabled
        if (!isSpinning) doSpin();
        else doReset();
      }
      startX = null;
    }

    plate.addEventListener('touchstart', onTouchStart);
    plate.addEventListener('touchend', onTouchEnd);
    return () => {
      plate.removeEventListener('touchstart', onTouchStart);
      plate.removeEventListener('touchend', onTouchEnd);
    };
  }, [isSpinning]);

  return (
    <div className={styles.main + ' ' + 'roulette-component'}>
      <button
        type="button"
        className={`${styles.btn} ${styles['btn-spin']}`}
        id="spin"
        onClick={doSpin}
        disabled={isSpinning}
        style={{ display: isSpinning ? 'none' : undefined }}
      >
        <span className={styles['btn-label']}>Spin</span>
      </button>

      <button
        type="button"
        className={`${styles.btn} ${styles['btn-reset']}`}
        id="reset"
        onClick={doReset}
        disabled={!isSpinning}
        style={{ display: isSpinning ? undefined : 'none' }}
      >
        <span className={styles['btn-label']}>New Game</span>
      </button>

      <div className={styles.plate} id="plate" ref={plateRef}>
        <ul className={styles.inner} ref={innerRef} data-spinto="">
          {/* keep the original order and values to preserve the design/rotation mapping */}
          {[
            32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26,0
          ].map((v, i) => (
            <li className={styles.number} key={i}>
              <label>
                <input type="radio" name="pit" value={String(v)} />
                <span className={styles.pit}>{v}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className={styles.data}>
          <div className={styles['data-inner'] + (result ? ' ' + styles.reveal : '')}>
            <div className={styles.mask}>{maskText}</div>
            <div className={styles.result}>
              <div className={styles['result-number']}>{result ? String(result.number) : '00'}</div>
              <div className={styles['result-color']}>{result ? result.color : 'red'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['previous-results']}>
        <ol className={styles['previous-list']}>
          {previousResults.length === 0 ? (
            <li className={`${styles.visuallyhidden} ${styles.placeholder}`}>No results yet.</li>
          ) : null}

          {previousResults.map((r, idx) => (
            <li key={idx} className={`${styles['previous-result']} ${styles['color-' + r.color]}`}>
              <span className={styles['previous-number']}>{r.number}</span>
              <span className={styles['previous-color']}>{r.color}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}


