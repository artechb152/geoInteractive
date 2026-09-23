# Topic 04 cover — terrain atlas assets

Approved mockup and image handoff for the terrain-features section only.

## Implementation prompt

עצב מחדש רק את ״3 צורות שטח שמשנות את חוקי המשחק״ בשיעור 4, לפי `design/mockups/topic-04-cover-terrain-atlas-v2.png`, עם התמונות שב־`public/assets/lessons/topic04/terrain-atlas/`. שמור במדויק על המלל הקיים, RTL, פלטת האתר וכללי העיצוב; בלי הכיתובים הדקורטיביים שנוספו במוקאפ. אמת התאמה חזותית ברוחב 1440px.

## Assets

- `chokepoint.png`: upper-left mountain pass.
- `summit.png`: middle-right commanding summit.
- `enclosed-valley.png`: lower-left enclosed valley.
- `mountain-footer.png`: decorative bottom panorama.

Public URL prefix: `/assets/lessons/topic04/terrain-atlas/`.

The illustrations are reconstructed from the approved mockup without baked-in text, using the built-in image generation tool. They are not pixel-identical crops. Preserve their orientation. Use real HTML for all lesson copy, and CSS/SVG for connecting lines and background contours. The existing `TERRAIN_FEATURES` strings in `src/components/lessons/topic-04/CoverScene.tsx` remain the copy source of truth. The mockup's extra slogans, decorative labels and numbers are not required copy. No lesson component was changed in this handoff.
