import { useCallback, useEffect, useState } from 'react';
import { useLatestRef } from './useLatestRef';

/**
 * useSpeech — הקראת טקסטי הכרטיסים (Web Speech API).
 *
 * שני מקרי קצה שקובעים את כל ההתנהגות כאן:
 *
 * 1. **`getVoices()` מחזיר רשימה ריקה בקריאה הראשונה** בכרום ובאדג׳ — הקולות
 *    נטענים אסינכרונית ומגיעים באירוע `voiceschanged`. בדיקה חד-פעמית בטעינה
 *    הייתה מסיקה "אין קול עברי" בכל מכשיר.
 *
 * 2. **אין קול עברי מותקן בהרבה מכשירים.** במקרה כזה עדיף להסתיר את הכפתור
 *    מאשר להקריא עברית במבטא אנגלי — זה לא נגישות, זה רעש.
 */
export interface SpeechControl {
  supported: boolean;
  speaking: boolean;
  rate: number;
  setRate: (r: number) => void;
  speak: (text: string) => void;
  stop: () => void;
}

const LANG = 'he-IL';

export function useSpeech(lang = LANG): SpeechControl {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [checked, setChecked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useLatestRef(rate);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setChecked(true);
      return;
    }
    const base = lang.split('-')[0];
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return false;
      const exact = voices.find((v) => v.lang === lang);
      const loose = voices.find((v) => v.lang.toLowerCase().startsWith(base));
      setVoice(exact ?? loose ?? null);
      setChecked(true);
      return true;
    };
    if (pick()) return;
    window.speechSynthesis.addEventListener('voiceschanged', pick);
    /* גם האירוע עצמו לא תמיד נורה (ספארי). מוותרים אחרי שנייה וחצי במקום
       להשאיר את הכפתור במצב "בודק" לנצח. */
    const t = window.setTimeout(() => setChecked(true), 1500);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pick);
      window.clearTimeout(t);
    };
  }, [lang]);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rateRef.current;
      if (voice) u.voice = voice;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang, rateRef, voice],
  );

  // ניווט משאיר הקראה תלויה באוויר — הדפדפן לא עוצר אותה מעצמו
  useEffect(() => stop, [stop]);

  return {
    supported: checked && Boolean(voice),
    speaking,
    rate,
    setRate,
    speak,
    stop,
  };
}
