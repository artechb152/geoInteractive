'use client';

import { createContext } from 'react';

/**
 * SceneStepContext — מיקום הסצנה הפעילה בתוך השיעור.
 * PagedLearn מספק; SceneHeader צורך כדי לרנדר chip "סצנה X מתוך Y"
 * (design-system §13) בלי prop-drilling דרך כל סצנה.
 */
export type SceneStep = { idx: number; total: number };

export const SceneStepContext = createContext<SceneStep | null>(null);
