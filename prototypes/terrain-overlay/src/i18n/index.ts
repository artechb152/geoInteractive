import { createContext, useContext } from 'react';
import { he, type Dict } from './he';
import { en } from './en';

export type Locale = 'he' | 'en';
export type { Dict };

const DICTS: Record<Locale, Dict> = { he, en };

/**
 * כיוון הכתיבה נגזר מהשפה ואינו קבוע בקוד.
 * ‎`dir="rtl"`‎ קשיח על העוטף היה שובר כל שפה שאינה עברית — כולל אנגלית,
 * שהיא הדרישה הראשונה שתגיע מקורס שמוגש גם ליחידה דוברת אנגלית.
 */
export const dirFor = (locale: Locale): 'rtl' | 'ltr' => DICTS[locale].dir;

export function getDict(locale: Locale | undefined): Dict {
  return DICTS[locale ?? 'he'] ?? he;
}

/** ברירת המחדל היא עברית — זו שפת הקורס. */
const I18nContext = createContext<Dict>(he);

export const I18nProvider = I18nContext.Provider;

/** מילון המחרוזות של הרכיב. */
export function useI18n(): Dict {
  return useContext(I18nContext);
}

export const LOCALES: Locale[] = ['he', 'en'];
