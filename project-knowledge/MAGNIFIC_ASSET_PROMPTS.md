# MAGNIFIC_ASSET_PROMPTS.md — חבילת פרומפטים להפקה ידנית ב-Magnific

> **מסמך ייצור מעשי.** כל הפרומפטים כתובים **באנגלית** (מודלים ויזואליים מגיבים טוב יותר
> לאנגלית). ההסברים סביבם בעברית. זהו קובץ-בת של
> [ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md](ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md) — כל כלל שם
> (פלטה, בלי טקסט עברי, בלי דיוק גיאוגרפי בנכס) תקף לכל פרומפט כאן.
>
> ⚠️ **שלב זה בלבד: הפקה.** לא מייצרים כאן תמונות בפועל (אין MCP ליצירת תמונות בשימוש,
> ואין הבאה של נכסים חיצוניים). המשתמש מפיק ידנית ב-Magnific ומביא את הקבצים בחזרה.
> לאחר ההבאה — ראו [ASSET_INTEGRATION_WORKFLOW.md](ASSET_INTEGRATION_WORKFLOW.md).

---

## איך להשתמש בקובץ הזה (הסבר בעברית)

1. **הפרומפט הבסיסי הגלובלי (Global base prompt)** למטה מגדיר את השפה הוויזואלית המשותפת
   לכל נכס: זווית איזומטרית, חומר נייר/חימר, פלטת הצבעים הקיימת של הקורס, טון רציני.
   **כל פרומפט ספציפי בקובץ הזה כבר כולל את הבסיס הגלובלי משולב בתוכו** — אפשר להעתיק
   ולהדביק ישירות ל-Magnific בלי הרכבה ידנית.
2. **הפרומפט השלילי הגלובלי (Global negative prompt)** צריך להתלוות לכל הפקה — הוא חוסם
   טקסט, בני-אדם, אלימות, וסגנון "צעצוע"/משחק שלא מתאימים לקורס.
3. לכל נכס יש שדות סטנדרטיים: `asset_id`, `suggested_filename`, `target_path`,
   `intended_usage`, `aspect_ratio`, `transparent_background`, `prompt`, `negative_prompt`,
   `notes_for_integration`. השתמש ב-`asset_id` כדי לעקוב אילו נכסים כבר הופקו.
4. **אחרי הפקה — בדוק מול הצ'קליסט** ב-
   [ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md](ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md#צקליסט-איכות-לנכס)
   לפני שמביאים את הקובץ לשילוב בקוד: בלי טקסט, בלי watermark, זווית עקבית, פלטה נכונה,
   קריא בגודל קטן.
5. אם התוצאה כוללת טקסט מעוות/גיבריש (AI לפעמים "ממציא" אותיות דמויות-טקסט על מפות/שלטים)
   — **אל תשתמש בתמונה כמו שהיא**. גזור את האזור הבעייתי, או ייצר מחדש עם פרומפט מתוקן
   שמדגיש שוב "no text, no labels, no signage".
6. שמור את שם הקובץ **בדיוק** לפי מוסכמת השמות למטה — כך שסשן שילוב עתידי ימצא את הקובץ
   הנכון בלי ניחוש.

## Global base prompt (English)

```
Isometric papercut-style 3D illustration for a modern military-map educational
interface. Clean, premium, editorial product-render quality. Camera angle:
isometric, 30-45 degrees from above, consistent across the whole set. Soft
realistic studio lighting with soft drop shadows (not hard game-engine
shadows). Matte paper / clay / cut-paper-layer material — not glossy plastic,
not rubber, not metal-shiny. Restrained, muted color palette only: cream
#FFFBF7, warm sand #C2A26B, olive green #7A8A3F, sage green #749C75, dark sage
#5B7C5C, charcoal #3a3a3a, and orange accent #EB9E48 used sparingly as a
focal highlight (flag, marker, pin). Minimal, precise geometric shapes with
subtle paper-layer / contour-line extrusion. Professional, serious,
operational tone — a geography and intelligence teaching tool, not a toy.
Centered composition, generous empty space around the subject, plain neutral
or transparent background suitable for isolation. No text of any kind, no
watermark, no logo, no signature.
```

## Global negative prompt (English)

```
text, letters, numbers, words, captions, labels, signage, Hebrew text,
English text, gibberish text, watermark, signature, logo, UI chrome,
screenshot, photorealistic human faces, humans, crowds, blood, gore, violent
battle scene, close-up weapons, dramatic cinematic explosions, dark sci-fi
interface, neon colors, saturated rainbow colors, random off-palette hues,
cartoon style, toy-like glossy plastic, low-poly video-game asset, cluttered
background, busy composition, motion blur, blurry, distorted geometry, extra
limbs, jpeg artifacts, inaccurate or nonsensical map markings
```

## מוסכמת שמות (naming convention)

כל הנכסים יושבים תחת:

```
public/assets/isometric/
```

עם שמות תיאוריים, kebab-case, לפי הדפוס:

```
home-hero-terrain.png
home-feature-map-layers.png
home-feature-recon.png
home-feature-folded-map.png
home-feature-compass.png
home-feature-route.png
home-progress-panel-bg.webp
lesson-01-strategy-terrain.png
lesson-01-strategy-terrain-hook.webp
lesson-02-map-reading.png
lesson-02-map-reading-hook.webp
...
lesson-12-gis-layers.png
lesson-12-gis-layers-hook.webp
ui-pin-orange.png
ui-flag-orange.png
ui-compass-rose.png
...
```

- אין רווחים, אין אותיות גדולות, אין תווים עבריים בשם הקובץ.
- סיומת `-hook` = הנכס האטמוספרי הרחב לסצנת Hook, לא הכרטיס הריבועי.
- וריאנטים מסומנים בסיומת: `-minimal` / `-premium` / `-papercut` (ראו סעיף E).

## פורמטים מועדפים

| שימוש | פורמט | הערה |
|---|---|---|
| נכס עם רקע שקוף (אייקון, אובייקט, hero על גבי UI) | **PNG** | שקיפות אמיתית, בלי דחיסת JPEG |
| פאנל hero/רקע מלא (לא צריך שקיפות) | **WEBP** קביל | קובץ קטן יותר, טעינה מהירה |
| מרקם פוטוגרפי (רק אם ממש נדרש מרקם נייר/צילום) | JPG | להימנע אלא אם יש צורך ספציפי |

## כללי יחס רוחב-גובה (aspect ratio)

| שימוש | יחס | שקיפות |
|---|---|---|
| Home hero | 16:9 או 21:9 | כן, PNG שקוף מועדף |
| אייקון כרטיס שיעור | 1:1 | כן, PNG שקוף |
| נכס Hook רחב (אטמוספרי) | 16:9 | PNG שקוף או WEBP רקע-רך |
| אריח מדור (section tile) | 4:3 | כן, PNG שקוף |
| אובייקט/אייקון קטן | 1:1 | כן, PNG שקוף |

---

## A. נכסי בית/דשבורד גלובליים

### A1 — Home hero isometric terrain slab

- **asset_id:** `HOME-01`
- **suggested_filename:** `home-hero-terrain.png`
- **target_path:** `public/assets/isometric/home-hero-terrain.png`
- **intended_usage:** נכס גיבור למסך הבית — לוח טרֵיין איזומטרי לצד כותרת ה-Hero.
- **aspect_ratio:** 16:9 (וריאנט 21:9 קביל לפאנל רחב)
- **transparent_background:** yes
- **prompt:**
  ```
  [GLOBAL BASE PROMPT] A single isometric terrain slab / diorama block,
  like a physical paper relief map: gentle contour-line ridges, a winding
  river cutting through a valley, a small cluster of low hills, a few
  simplified papercut trees, and one small orange flag on a pole planted
  on the highest point as the focal marker. The slab has a visible clean-cut
  edge on its sides (like a cake slice / museum diorama base) showing
  layered paper strata in warm sand and olive tones. Nothing else in frame.
  ```
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + roads, buildings, vehicles, people, arrows, compass markings, grid lines with numbers`
- **notes_for_integration:** יעד עתידי: `<IsometricHeroAsset>`. שים לב שקיים כבר `TerrainDiorama` אינטראקטיבי ב-`Hero.tsx` — החלטה על החלפה/שילוב נעשית בזמן האינטגרציה, ראו [ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md](ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md).

### A2 — Small layer-stack icon

- **asset_id:** `HOME-02`
- **suggested_filename:** `home-feature-map-layers.png`
- **target_path:** `public/assets/isometric/home-feature-map-layers.png`
- **intended_usage:** אייקון קטן לכרטיס "יתרון קורס" (GIS/שכבות).
- **aspect_ratio:** 1:1
- **transparent_background:** yes
- **prompt:** `[GLOBAL BASE PROMPT] A small stack of 3-4 thin flat translucent map layers (like glass/paper sheets), offset diagonally in isometric view, each sheet a slightly different muted tone (sand, olive, sage), suggesting GIS data layers. Compact object, centered, isolated.`
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + large scene, background terrain, numbers on sheets`
- **notes_for_integration:** יעד: `<LessonVisualTile>` או כרטיס Features בדף הבית.

### A3 — Small binoculars / recon icon

- **asset_id:** `HOME-03`
- **suggested_filename:** `home-feature-recon.png`
- **target_path:** `public/assets/isometric/home-feature-recon.png`
- **intended_usage:** אייקון כרטיס "תצפית/איסוף מודיעין".
- **aspect_ratio:** 1:1
- **transparent_background:** yes
- **prompt:** `[GLOBAL BASE PROMPT] A small pair of simplified field binoculars, papercut/clay style, resting at a slight isometric angle, olive and charcoal tones with one small orange detail (strap or button). Compact object, centered, isolated.`
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + hands, eyes, camouflage pattern clutter`
- **notes_for_integration:** אין להשתמש בגרסה עם "עדשות" ריאליסטיות-מדי — לשמור סגנון חימר.

### A4 — Small folded military map icon

- **asset_id:** `HOME-04`
- **suggested_filename:** `home-feature-folded-map.png`
- **target_path:** `public/assets/isometric/home-feature-folded-map.png`
- **intended_usage:** אייקון כרטיס "קריאת מפה/סילבוס".
- **aspect_ratio:** 1:1
- **transparent_background:** yes
- **prompt:** `[GLOBAL BASE PROMPT] A small folded paper topographic map, partially unfolded showing faint contour-line texture on top, cream and sand tones, sitting at an isometric angle. Compact object, centered, isolated.`
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + readable text on map, coordinates, compass rose printed on the map`
- **notes_for_integration:** המפה על גבי האייקון עצמה חייבת להיראות כמו קווי קונטור מופשטים בלבד — לא כתמונת מפה אמיתית עם תוויות.

### A5 — Small compass / navigation icon

- **asset_id:** `HOME-05`
- **suggested_filename:** `home-feature-compass.png`
- **target_path:** `public/assets/isometric/home-feature-compass.png`
- **intended_usage:** אייקון כרטיס "ניווט".
- **aspect_ratio:** 1:1
- **transparent_background:** yes
- **prompt:** `[GLOBAL BASE PROMPT] A small classic lensatic field compass, papercut/clay style, olive-brown body, orange needle tip as the only bright accent, angled isometrically. Compact object, centered, isolated.`
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + printed degree numbers, letters N/S/E/W`
- **notes_for_integration:** שמור על מחט אחת פשוטה — לא לוח דגלים/מספרים.

### A6 — Small route/waypoint icon

- **asset_id:** `HOME-06`
- **suggested_filename:** `home-feature-route.png`
- **target_path:** `public/assets/isometric/home-feature-route.png`
- **intended_usage:** אייקון כרטיס "תכנון ציר/מסלול".
- **aspect_ratio:** 1:1
- **transparent_background:** yes
- **prompt:** `[GLOBAL BASE PROMPT] A short isometric dotted path made of small papercut waypoint markers (simple pin shapes, not letters) climbing over a tiny terrain fold, ending at one small orange flag. Compact object, centered, isolated.`
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + arrows with letters, distance numbers`
- **notes_for_integration:** המסלול עצמו דקורטיבי בלבד — לא מחליף שום מפת ניווט אינטראקטיבית אמיתית.

### A7 — Dark sage progress-panel background

- **asset_id:** `HOME-07`
- **suggested_filename:** `home-progress-panel-bg.webp`
- **target_path:** `public/assets/isometric/home-progress-panel-bg.webp`
- **intended_usage:** רקע דקורטיבי לפאנל התקדמות כהה (`<CourseProgressPanel>`), טקסט מגיע מ-React מעל.
- **aspect_ratio:** 21:9 (פאנל רחב ונמוך)
- **transparent_background:** no (רקע מלא, כהה)
- **prompt:** `[GLOBAL BASE PROMPT] A dark sage / deep olive full-bleed background panel, softly lit, showing a faint, low-contrast silhouette of a topographic terrain fold and a tiny distant soldier silhouette walking along a ridge line, everything muted and low-key so foreground white text remains highly legible. No bright colors except one small dim orange accent point in the distance.`
- **negative_prompt:** `[GLOBAL NEGATIVE PROMPT] + bright busy background, high contrast figures, visible facial features`
- **notes_for_integration:** בדוק ניגודיות טקסט לפני שילוב — הרקע חייב להישאר כהה/שקט מספיק כדי שטקסט לבן/קרם יעבור ניגודיות נגישה (AA/AAA).

---

## B. אייקוני כרטיס שיעור — 12 השיעורים (1:1, PNG שקוף)

כל פרומפט כאן בנוי מהבסיס הגלובלי + נושא השיעור. `negative_prompt` בכולם = הפרומפט
השלילי הגלובלי, אלא אם צוין אחרת.

| asset_id | lesson | suggested_filename | intended_usage | prompt (scene addition to global base) |
|---|---|---|---|---|
| `LESSON-01-CARD` | 01 מבוא/מרחב/אסטרטגיה | `lesson-01-strategy-terrain.png` | כרטיס שיעור 01 | A small layered terrain block viewed like a strategy chessboard, with three subtly stepped tiers (strategic/operational/tactical), one thin orange line connecting the tiers top to bottom. |
| `LESSON-02-CARD` | 02 קרטוגרפיה/קווי גובה | `lesson-02-map-reading.png` | כרטיס שיעור 02 | A small stack of contour-line "cake" layers (like a topographic layer cake), sage-to-sand gradient, one thin paper ruler resting diagonally beside it. |
| `LESSON-03-CARD` | 03 ניווט/מצפן/מסלול | `lesson-03-navigation.png` | כרטיס שיעור 03 | A small compass sitting on a terrain fold with a short dotted waypoint path leading to one orange flag. |
| `LESSON-04-CARD` | 04 טופוגרפיה/מורפולוגיה | `lesson-04-landforms.png` | כרטיס שיעור 04 | A small cluster of classic landform shapes side by side in papercut relief: a rounded dome hill, a ridge, a saddle dip, each a distinct muted terrain tone. |
| `LESSON-05-CARD` | 05 ניידות/עבירות/הסתרה | `lesson-05-mobility.png` | כרטיס שיעור 05 | A small terrain patch split into a smooth trafficable path and a rougher vegetated patch, with one tiny simplified papercut vehicle silhouette midway along the path. |
| `LESSON-06-CARD` | 06 LOS/תצפית | `lesson-06-los.png` | כרטיס שיעור 06 | A small hill with a tiny observation post silhouette on top and a soft translucent visibility cone fan spreading down the slope in a pale sage tone. |
| `LESSON-07-CARD` | 07 אקלים/מזג אוויר/סנסורים | `lesson-07-weather.png` | כרטיס שיעור 07 | A small terrain fold partly covered by a soft low papercut cloud layer, with one small sensor-tower silhouette poking above the cloud. |
| `LESSON-08-CARD` | 08 לוגיסטיקה/תשתיות | `lesson-08-logistics.png` | כרטיס שיעור 08 | A small terrain slab with a simple road ribbon and one tiny simplified papercut supply-truck silhouette on it, ending at a small depot-shape block. |
| `LESSON-09-CARD` | 09 משאבים/נקודות חנק | `lesson-09-chokepoints.png` | כרטיס שיעור 09 | A small strait-like terrain formation — two landmasses narrowing around a thin water channel, with one tiny ship silhouette passing through the narrow gap. |
| `LESSON-10-CARD` | 10 עירוני/MOUT | `lesson-10-urban.png` | כרטיס שיעור 10 | A small isometric city block made of a few simplified low-rise papercut buildings of varying heights on a terrain base, narrow streets between them. |
| `LESSON-11-CARD` | 11 גבולות/עומק אסטרטגי | `lesson-11-borders.png` | כרטיס שיעור 11 | A small terrain slab visually split into two zones by one thin dashed border line, with a soft buffer band of a third muted tone between them. |
| `LESSON-12-CARD` | 12 GIS/שכבות/רשת | `lesson-12-gis-layers.png` | כרטיס שיעור 12 | A small exploded stack of 3-4 thin translucent data-layer sheets above a terrain base, connected by a few thin network node-dots and lines. |

- **target_path (כל השורות):** `public/assets/isometric/<suggested_filename>`
- **aspect_ratio (כל השורות):** 1:1
- **transparent_background (כל השורות):** yes
- **notes_for_integration (כל השורות):** יעד: `<LessonVisualTile lessonId="topic-NN">`. השם/מספר השיעור עצמו **לא** מופיע בתמונה — התווית מגיעה מ-`lessons.ts` דרך React.

---

## C. נכסי Hook/Hero לשיעור — 12 גרסאות רחבות ואטמוספריות (16:9)

פחות "אייקוניים", יותר אטמוספריים — משמשים ברקע/צד סצנת ה-Hook של כל שיעור. עדיין ללא
טקסט, עדיין לא אלימים.

| asset_id | lesson | suggested_filename | prompt (scene addition to global base) |
|---|---|---|---|
| `LESSON-01-HOOK` | 01 | `lesson-01-strategy-terrain-hook.webp` | A wide atmospheric isometric terrain panorama seen from a strategic high vantage, layered ridgelines fading into a soft cream haze at the horizon, one distant orange marker on a far ridge suggesting a strategic objective. |
| `LESSON-02-HOOK` | 02 | `lesson-02-map-reading-hook.webp` | A wide scene of a large folded topographic map partly unfurled across a terrain surface, contour lines flowing like gentle waves, soft raking light across the paper texture. |
| `LESSON-03-HOOK` | 03 | `lesson-03-navigation-hook.webp` | A wide terrain panorama at dusk-lit cream tones with a single faint dotted path winding between hills toward one distant orange flag, conveying a long solo trek. |
| `LESSON-04-HOOK` | 04 | `lesson-04-landforms-hook.webp` | A wide panorama of varied papercut landforms — dome, ridge, valley, saddle — arranged in a naturalistic isometric terrain sweep with soft shadow depth between each form. |
| `LESSON-05-HOOK` | 05 | `lesson-05-mobility-hook.webp` | A wide terrain panorama split between a smooth open trafficable plain and a denser vegetated patch, one faint tire-track path curving between them. |
| `LESSON-06-HOOK` | 06 | `lesson-06-los-hook.webp` | A wide elevated terrain panorama at golden light, a single hill in the foreground with a soft translucent visibility fan sweeping over the valley below. |
| `LESSON-07-HOOK` | 07 | `lesson-07-weather-hook.webp` | A wide terrain panorama half-shrouded in soft low papercut cloud layers drifting over ridgelines, muted cool-sage undertones suggesting shifting weather. |
| `LESSON-08-HOOK` | 08 | `lesson-08-logistics-hook.webp` | A wide terrain panorama with a long ribbon road threading through hills toward a small distant depot silhouette, suggesting a long supply line. |
| `LESSON-09-HOOK` | 09 | `lesson-09-chokepoints-hook.webp` | A wide panorama of a narrow strait between two landmasses under soft light, a single small ship silhouette passing through the narrow passage. |
| `LESSON-10-HOOK` | 10 | `lesson-10-urban-hook.webp` | A wide isometric panorama of a small dense papercut city district with varied low-rise rooftops and narrow streets, soft late-day shadows between buildings. |
| `LESSON-11-HOOK` | 11 | `lesson-11-borders-hook.webp` | A wide terrain panorama divided by a long dashed border line running diagonally across hills, a soft muted buffer band glowing faintly along the line. |
| `LESSON-12-HOOK` | 12 | `lesson-12-gis-layers-hook.webp` | A wide terrain panorama with several large translucent data-layer sheets floating above it in soft parallax, faint connecting threads between a few marked points. |

- **target_path (כל השורות):** `public/assets/isometric/<suggested_filename>`
- **aspect_ratio (כל השורות):** 16:9
- **transparent_background (כל השורות):** no (רקע רך/מלא — WEBP)
- **negative_prompt (כל השורות):** `[GLOBAL NEGATIVE PROMPT]`
- **notes_for_integration (כל השורות):** אלה נכסים אטמוספריים-תומכים בלבד לסצנת Hook; אסור שיחליפו את משפט ה-Hook העברי או את ה-CTA — הם רקע/צד, לא התוכן המרכזי.

---

## D. נכסי UI דקורטיביים לשימוש חוזר

| asset_id | suggested_filename | intended_usage | aspect_ratio | prompt (scene addition to global base) |
|---|---|---|---|---|
| `UI-PIN` | `ui-pin-orange.png` | סמן מיקום כתום קטן, לשימוש בכל מסך | 1:1 | A small simplified orange map pin / teardrop marker, papercut style, clean drop shadow. |
| `UI-FLAG` | `ui-flag-orange.png` | דגל כתום על מוט | 1:1 | A small simplified orange flag on a thin pole, papercut style, gentle fold in the fabric. |
| `UI-COMPASS-ROSE` | `ui-compass-rose.png` | ורד מצפן דקורטיבי | 1:1 | A small stylized papercut compass rose (4-point star), sand and charcoal tones, no printed letters. |
| `UI-MAP-TILE` | `ui-folded-map-tile.png` | אריח מפה מקופלת | 1:1 | A small folded paper map tile corner, cream tones with faint abstract contour texture, no readable labels. |
| `UI-CONTOUR-BG` | `ui-contour-paper-texture.webp` | מרקם רקע נייר-קונטור לשימוש כללי | 16:9 | A seamless-feeling wide soft cream paper texture background with extremely faint embossed contour lines, very low contrast, meant to sit behind UI content. |
| `UI-TOPO-OVERLAY` | `ui-topo-grid-overlay.png` | שכבת-על שקופה של גריד טופוגרפי | 16:9 | A transparent-background overlay of extremely faint thin contour lines and a soft survey grid, sage tone at low opacity, no numbers or labels. |
| `UI-ROUTE-A` | `ui-route-marker-a.png` | סמן מסלול A | 1:1 | A small simplified isometric waypoint marker shaped like a flat disc with a single bold letter-free notch, sage tone with a thin orange ring, marking a route start point. |
| `UI-ROUTE-B` | `ui-route-marker-b.png` | סמן מסלול B | 1:1 | The same small isometric waypoint marker family as the route start, but in solid orange, marking a route end point. |
| `UI-RETICLE` | `ui-target-reticle.png` | רשת מטרה קטנה | 1:1 | A small simplified papercut target reticle (concentric rings and crosshair), charcoal and orange, flat clean geometric style, not a weapon sight. |
| `UI-WATCHTOWER` | `ui-observation-post.png` | עמדת תצפית/מגדל | 1:1 | A small simplified isometric observation post / watchtower, wooden-and-charcoal papercut style, sitting on a tiny terrain mound. |
| `UI-VEHICLE` | `ui-armored-vehicle.png` | סילואט רכב משוריין | 1:1 | A small simplified papercut silhouette of a generic armored vehicle, low detail, olive-charcoal tones, non-aggressive toy-free industrial-diagram feel. |
| `UI-TRUCK` | `ui-logistics-truck.png` | סילואט משאית לוגיסטית | 1:1 | A small simplified papercut silhouette of a generic logistics/supply truck, sand-charcoal tones, low detail. |
| `UI-SATELLITE` | `ui-satellite-layers.png` | לוויין/מחסנית שכבות GIS | 1:1 | A small simplified papercut satellite shape above a thin stack of translucent data-layer sheets, sage and sand tones with one small orange signal dot. |

- **target_path (כל השורות):** `public/assets/isometric/<suggested_filename>`
- **transparent_background:** yes לכל השורות חוץ מ-`UI-CONTOUR-BG` (רקע מלא, ראה עמודה).
- **negative_prompt (כל השורות):** `[GLOBAL NEGATIVE PROMPT]`
- **notes_for_integration:** אלה נכסי "ספרייה" לשימוש חוזר בכל הקורס — לא ייחודיים לשיעור אחד. שמור עקביות זווית/גודל בין כולם כדי שיתחלפו זה בזה בלי "לקפוץ" ויזואלית.

---

## E. וריאנטים לנכסים חשובים (2–3 אלטרנטיבות לכל אחד)

לנכסים המרכזיים ביותר — Home hero, Compass rose, Lesson-10 (עירוני), Progress panel —
מומלץ להפיק כמה גרסאות ולבחור את המנצחת בעריכה, לא רק גרסה אחת.

### E1 — Home hero terrain (וריאנטים ל-`HOME-01`)

| וריאנט | suggested_filename | תוספת לפרומפט הבסיס |
|---|---|---|
| **מינימלי** | `home-hero-terrain-minimal.png` | `Extremely minimal version: one smooth terrain mound, one contour ring, one orange flag. No river, no trees, no extra detail.` |
| **פרימיום/ריאליסטי** | `home-hero-terrain-premium.png` | `Higher-fidelity render: more refined lighting, subtle ambient occlusion in the valley, finely detailed paper-grain texture on the terrain surface, still fully matte (not glossy).` |
| **פייפרקאט/רב-שכבתי** | `home-hero-terrain-papercut.png` | `Strongly emphasize visible stacked paper-layer construction: each elevation band is a distinct physical cut-paper sheet with a visible thin edge, like a real laser-cut layered terrain model.` |

### E2 — Compass rose (וריאנטים ל-`UI-COMPASS-ROSE`)

| וריאנט | suggested_filename | תוספת לפרומפט הבסיס |
|---|---|---|
| **מינימלי** | `ui-compass-rose-minimal.png` | `Reduce to a single thin 4-point star outline, no ornamentation.` |
| **פרימיום/ריאליסטי** | `ui-compass-rose-premium.png` | `Add fine brass-like engraved detail lines and subtle metallic-matte sheen (still not glossy plastic), aged-map aesthetic.` |
| **פייפרקאט** | `ui-compass-rose-papercut.png` | `Build the compass rose from visibly layered die-cut paper points at slightly different heights, casting small soft shadows on each other.` |

### E3 — Lesson 10 urban card (וריאנטים ל-`LESSON-10-CARD`)

| וריאנט | suggested_filename | תוספת לפרומפט הבסיס |
|---|---|---|
| **מינימלי** | `lesson-10-urban-minimal.png` | `Reduce to 3 simple block shapes of varying height, no street detail.` |
| **פרימיום/ריאליסטי** | `lesson-10-urban-premium.png` | `Add finer architectural massing detail, subtle window-grid texture (no readable text), richer shadow occlusion between buildings.` |
| **פייפרקאט** | `lesson-10-urban-papercut.png` | `Emphasize each building as a distinct layered paper block with a visible cut edge, stacked like architectural paper models.` |

### E4 — Progress panel background (וריאנטים ל-`HOME-07`)

| וריאנט | suggested_filename | תוספת לפרומפט הבסיס |
|---|---|---|
| **מינימלי** | `home-progress-panel-bg-minimal.png` | `Remove the silhouette entirely — just a smooth dark sage gradient with an extremely faint contour texture.` |
| **פרימיום/ריאליסטי** | `home-progress-panel-bg-premium.png` | `Slightly richer lighting gradient and finer terrain silhouette detail on the horizon line, still very low-contrast and dark.` |
| **פייפרקאט** | `home-progress-panel-bg-papercut.png` | `Suggest the dark terrain as stacked dark-toned paper layers barely visible in the low light, rather than a flat silhouette.` |

- **target_path (כל הוריאנטים):** `public/assets/isometric/<suggested_filename>`
- **negative_prompt (כל הוריאנטים):** `[GLOBAL NEGATIVE PROMPT]`
- **notes_for_integration:** לשמור רק וריאנט אחד סופי לכל `asset_id` בקוד בפועל (למחוק/לארכב את שאר הוריאנטים אחרי הבחירה) — לא לשלב את כולם בו-זמנית.

---

## אילוצי פרומפט חשובים — תזכורת מרוכזת

- ❌ אין טקסט עברי
- ❌ אין טקסט אנגלי
- ❌ אין תוויות
- ❌ אין watermark
- ❌ אין לוגואים
- ❌ אין בני-אדם פוטוריאליסטיים
- ❌ אין סצנת קרב אלימה
- ❌ אין דם
- ❌ אין פיצוצים דרמטיים-קולנועיים
- ❌ אין ממשק דארק-סייפיי
- ❌ אין סגנון קריקטורה/צעצוע
- ❌ אין צבעים רוויים מדי
- ❌ אין פלטת צבעים אקראית
- ❌ אין תוויות מפה לא מדויקות
- ✅ זווית עקבית: איזומטרי / תלת-ממד זוויתי / 30–45 מעלות מלמעלה
- ✅ קרם, ירוק-מרווה, זית, חול חם, שחור-פחם מושתק, וכתום כאקסנט

---

### קבצים קשורים
- [ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md](ISOMETRIC_PAPERCUT_VISUAL_SYSTEM.md) — עקרונות הסגנון.
- [ASSET_INTEGRATION_WORKFLOW.md](ASSET_INTEGRATION_WORKFLOW.md) — מה עושים עם הקבצים אחרי ההפקה.
