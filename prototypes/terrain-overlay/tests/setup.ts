import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

/**
 * jsdom אינו מממש חלק מה-API הגרפי שהרכיב נשען עליו. בלי הכפילים האלה כל
 * בדיקה שמרנדרת את המפה נופלת על `not a function` — כלומר הבדיקות לא היו
 * בודקות את הקוד אלא את מגבלות סביבת הריצה.
 */

// getBBox — משמש למיקום הכרטיס ולזום לצורה
if (!('getBBox' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    writable: true,
    value: () => ({ x: 100, y: 100, width: 200, height: 200 }),
  });
}

// createSVGPoint / getScreenCTM — משמשים בהמרת לחיצה למרחב ה-viewBox
if (!('createSVGPoint' in SVGSVGElement.prototype)) {
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
    writable: true,
    value: () => ({
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: 500, y: 500 }),
    }),
  });
}
if (!('getScreenCTM' in SVGSVGElement.prototype)) {
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    writable: true,
    value: () => ({ inverse: () => ({}) }),
  });
}

// ResizeObserver — מודד את גובה לוח התרגול
if (!('ResizeObserver' in window)) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// matchMedia — נבדק ע"י prefers-reduced-motion בהוק הזום
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// setPointerCapture — הזזת המפה
if (!('setPointerCapture' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    writable: true,
    value: () => {},
  });
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    writable: true,
    value: () => {},
  });
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    writable: true,
    value: () => false,
  });
}

// scrollIntoView — בורר האזורים
if (!('scrollIntoView' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { writable: true, value: () => {} });
}
