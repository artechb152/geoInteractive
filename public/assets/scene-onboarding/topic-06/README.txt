Lesson 06 onboarding media

Source videos are stored under /assets/video/topic-06/onboarding/.
transition-1-2.mp4 = lesson06scene01.mp4 (planning)
transition-2-3.mp4 = lesson06scene02.mp4 (direction)
transition-3-4.mp4 = lesson06scene03.mp4 (position check)
transition-4-5.mp4 = locally corrected transition-4-fixed.mp4 (arrival)

Playback uses the same canvas + WebP frame-sequence mechanism as topic 02,
including reverse playback, interrupted navigation and reduced motion.
Baseline is internal: opening the activity plays baseline -> planning once.
The four accordion states are plan, start, travel, arrive.

Build: node scripts/media/build-topic06-onboarding.mjs
Frames: 12fps, 1280x720, WebP quality 80. Counts are in manifest.json.
Each segment starts on the preceding resting frame to prevent boundary flicker.
The canvas contains the whole image without cropping geography for RTL.
Source audio is retained in the MP4s; the frame-sequence player is silent,
matching the lesson 02 technology.
