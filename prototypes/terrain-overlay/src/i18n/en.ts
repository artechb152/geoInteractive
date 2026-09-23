import type { Dict } from './he';

/**
 * en.ts — English UI chrome.
 *
 * This file exists to prove the i18n layer actually works: it is a second
 * locale with a different `dir`, and adding it required no change to any
 * component. The learning content itself (feature definitions, glossary)
 * still ships Hebrew-only — content translation is a separate, editorial job.
 */
export const en: Dict = {
  dir: 'ltr' as never,
  localeTag: 'en',

  title: 'Terrain Feature Simulator',
  subtitle: 'Identifying landforms in aerial photography and on a topographic map',
  titleWithArea: (area: string) => `Terrain Feature Simulator — ${area}`,

  modeExplore: 'Explore',
  modeQuiz: 'Practice',
  modeLesson: 'Lesson',
  glossary: 'Glossary',
  helpLabel: 'Keyboard shortcuts and help',
  showAll: 'Show all',
  clearSelection: 'Clear selection',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  skip: 'Skip',
  start: 'Start',
  retry: 'Try again',
  print: 'Print',
  copy: 'Copy',
  copied: 'Copied',

  layerAerial: 'Aerial',
  layerAerialFull: 'Vertical aerial photograph',
  layerTopo: 'Map',
  layerTopoFull: 'Topographic map',
  layerHillshade: 'Hillshade',
  compareGroup: 'Layer comparison mode',
  compareWipe: 'Wipe',
  compareFade: 'Fade',
  compareSplit: 'Side by side',
  compareHillshade: 'Hillshade',
  compareWipeHint:
    'A draggable divider. Both layers stay fully sharp, so the comparison is local and exact.',
  compareFadeHint:
    'A continuous cross-fade. Useful for seeing exactly where a contour sits on the ground.',
  compareSplitHint: 'Two synchronised panes — zoom and pan are shared.',
  compareHillshadeHint: 'Relief lit from the north-west — the bridge between photo and map.',
  onlyLayer: (layer: string) => `Show ${layer} only`,
  betweenLayers: (a: string, b: string) => `Blend between ${a} and ${b}`,

  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomFit: 'Fit to screen',
  loupe: 'Loupe',
  zoomLevel: (k: string) => `Zoom ${k}×`,

  hint: 'Click a landform on the map to learn how it looks in the photo and on the map — and drag the slider to compare the two layers over the same ground.',
  hintQuiz: 'Answer the question above. The legend, zoom and loupe are all available.',
  hintLoading: 'Loading map layers…',
  hintShowAll: 'All landforms are outlined. Click one to open its card.',
  hintRemaining: (n: number) => `${n} landforms not yet viewed. Click a dot on the map.`,

  progressLabel: 'Learning progress',
  progressSeen: (seen: number, total: number) => `${seen} of ${total} landforms viewed`,
  progressComplete: 'Complete ✓',
  resetProgress: 'Reset progress',
  resetConfirm: 'Reset all progress stored on this device?',
  resetDone: 'Progress has been reset.',
  privacyNote:
    'Progress is stored on your device only (localStorage). Nothing is sent to a server and no personal identifier is stored.',
  shareLink: 'Copy a link to the current view',

  quizScore: (score: number) => `Score ${score}`,
  quizStreak: (n: number) => `Streak ${n}`,
  quizHint: 'Hint',
  quizExit: 'Leave practice',
  quizNext: 'Next question',
  quizCorrect: 'Correct',
  quizWrong: (name: string) => `Incorrect. The right landform is ${name}`,
  quizNotEnough: 'This area does not have enough landforms to practise on.',
  quizRetryMissed: 'Practise what you missed',
  quizRestart: 'New round',

  lessonGoalsTitle: 'What you will know by the end',
  lessonEstimate: (min: number) => `Estimated time: about ${min} minutes`,
  lessonStart: 'Start the lesson',
  lessonSkipToExplore: 'Skip to free exploration',
  lessonStageIntro: 'Introduction',
  lessonStageExplore: 'Guided exploration',
  lessonStagePractice: 'Practice',
  lessonStageTest: 'Test',
  lessonStageSummary: 'Summary',
  lessonNextFeature: 'Next landform',
  lessonPrevFeature: 'Previous landform',
  lessonToPractice: 'Go to practice',
  lessonOf: (i: number, n: number) => `Landform ${i} of ${n}`,
  lessonStageOf: (i: number, n: number) => `Stage ${i} of ${n}`,

  profileTitle: 'Elevation profile',
  profileStart: 'Draw a profile',
  profileHint: 'Drag a line across the map — its elevation graph opens below.',
  profileClear: 'Clear the profile',
  profileTypical: 'The typical profile of this landform',
  profileLength: (m: number) => `Length ${m} m`,
  profileRange: (min: number, max: number) => `${min}–${max} m`,

  speakStart: 'Read aloud',
  speakStop: 'Stop reading',
  speakRate: 'Reading speed',
  speakUnavailable: 'This browser has no speech synthesis available.',

  selected: (name: string, definition: string) => `${name} selected. ${definition}`,
  cleared: 'Selection cleared',
  areaChanged: (name: string, intro: string) => `Area changed: ${name}. ${intro}`,
  loadError: (area: string) => `We could not load the map layers for ${area}.`,
  loadErrorDetail: 'You may be offline, or the assets were not uploaded to the course server.',
  loadSlow: 'Loading is slower than usual — still trying…',
  attribution: 'Sources and licensing',
};
