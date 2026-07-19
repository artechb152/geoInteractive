# Magnific prompts — Custom Style workflow + short prompts

הקובץ הזה עודכן לעבודה המומלצת ב-Magnific: **Custom Style קבוע + פרומפט קצר לכל נכס**.

**עדכון חשוב:** ברירת המחדל כאן היא **ללא רקע שקוף**. כל הנכסים יופקו על רקע קרם נקי (`#FFFBF7`) כדי שלא תקבל תצוגת משבצות / checkerboard.

במקום להדביק בכל פעם את כל תיאור הסגנון הארוך, קודם יוצרים Style אחד בשם
`Geo Course Isometric Papercut`, ואז בכל נכס מדביקים רק את תיאור האובייקט הספציפי.

## הגדרת ה-Style ב-Magnific

במסך `Create Style`, מלא כך:

**Name:**
```text
Geo Course Isometric Papercut
```

**Describe your new style:**
```text
Isometric papercut-style 3D illustration for a modern military geography educational interface. Clean, premium, editorial product-render quality. Camera angle: isometric, 30–45 degrees from above. Matte paper, clay, and cut-paper-layer materials, with visible layered terrain edges and subtle contour-line extrusion. Soft realistic studio lighting, gentle ambient occlusion, soft drop shadows, not glossy, not plastic, not toy-like.

Restrained muted palette: solid warm cream background, sand, olive green, sage green, dark sage, charcoal, and a small amount of orange used only as a focal accent such as a flag, pin, route marker, or highlight. Use a real cream background, not a transparent/alpha background. Professional, serious, operational, geographic, modern, clean. Minimal precise shapes, generous empty space, readable at small UI sizes. No text, no letters, no numbers, no labels, no logos, no watermark, no humans, no combat scene, no explosions, no neon, no sci-fi interface, no saturated colors, no transparent background, no checkerboard background.
```

אחרי יצירת ה-Style, בחר אותו בכל יצירת נכס. כך כל התמונות ישמרו על אותה שפה:
איזומטריה, שכבות נייר, חומר מט, פלטת קרם/מרווה/זית/חול/כתום, וללא טקסט.

## איך לעבוד עם הקובץ הזה

**חשוב:** ב-Magnific כבה כל אפשרות של `Solid warm cream background` / `Remove background` / `Alpha`. אם אתה רואה משבצות, זה אומר שהרקע שקוף — הפק מחדש עם רקע קרם מלא.

1. בחר ב-Magnific את ה-Style: `Geo Course Isometric Papercut`.
2. פתח Image Generator.
3. הגדר יחס תמונה לפי `aspect_ratio`.
4. אל תפעיל רקע שקוף. השאר `solid warm cream background (#FFFBF7), no transparency, no checkerboard background` כבוי בכל הנכסים, גם באייקונים.
5. הדבק את ה-`Prompt` הקצר של הנכס.
6. הדבק את ה-`Negative prompt` אם יש שדה כזה.
7. אל תחבר Quick connections כברירת מחדל. השתמש בהם רק אם נכס מסוים יוצא רחוק מדי מהסגנון,
   או אם אתה רוצה לחבר רפרנס ספציפי לאותו נכס.
8. שמור את התוצר בשם `suggested_filename` בדיוק.
9. אם התוצאה כוללת טקסט, גיבריש, watermark, בני אדם, כלי נשק בקלוז-אפ, או צבעים מחוץ לפלטה —
   הפק מחדש.

## מתי להשתמש בפרומפטים הארוכים

אם אתה לא משתמש ב-Custom Style, הדבק את תיאור ה-Style שמופיע למעלה בתחילת הפרומפט של כל נכס.
אבל בעבודה הרגילה שלך עדיף להשתמש ב-Style הקבוע ובפרומפטים הקצרים שלמטה.

---


## A. Home / Dashboard

### HOME-01 — `home-hero-terrain.png`

- **suggested_filename:** `home-hero-terrain.png`
- **target_path:** `public/assets/isometric/home-hero-terrain.png`
- **intended_usage:** נכס גיבור למסך הבית — לוח טריין איזומטרי לצד כותרת ה-Hero.
- **aspect_ratio:** 16:9 or 21:9
- **transparent_background:** no

**Prompt:**
```text
A single isometric terrain slab / diorama block, like a physical paper relief map: gentle
contour-line ridges, a winding river cutting through a valley, a small cluster of low hills, a
few simplified papercut trees, and one small orange flag on a pole planted on the highest
point as the focal marker. The slab has a visible clean-cut edge on its sides (like a cake
slice / museum diorama base) showing layered paper strata in warm sand and olive tones.
Nothing else in frame. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable
at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, roads, buildings, vehicles, people,
arrows, compass markings, grid lines with numbers
```

### HOME-02 — `home-feature-map-layers.png`

- **suggested_filename:** `home-feature-map-layers.png`
- **target_path:** `public/assets/isometric/home-feature-map-layers.png`
- **intended_usage:** אייקון קטן לכרטיס יתרון קורס — GIS/שכבות.
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small stack of 3-4 thin flat translucent map layers (like glass/paper sheets), offset
diagonally in isometric view, each sheet a slightly different muted tone (sand, olive, sage),
suggesting GIS data layers. Compact object, centered, isolated. Centered composition, isolated
object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, large scene, background terrain,
numbers on sheets
```

### HOME-03 — `home-feature-recon.png`

- **suggested_filename:** `home-feature-recon.png`
- **target_path:** `public/assets/isometric/home-feature-recon.png`
- **intended_usage:** אייקון קטן לכרטיס תצפית/איסוף מודיעין.
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small pair of simplified field binoculars, papercut/clay style, resting at a slight
isometric angle, olive and charcoal tones with one small orange detail (strap or button).
Compact object, centered, isolated. Centered composition, isolated object, solid warm cream
background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, hands, eyes, camouflage pattern
clutter
```

### HOME-04 — `home-feature-folded-map.png`

- **suggested_filename:** `home-feature-folded-map.png`
- **target_path:** `public/assets/isometric/home-feature-folded-map.png`
- **intended_usage:** אייקון קטן לכרטיס קריאת מפה/סילבוס.
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small folded paper topographic map, partially unfolded showing faint contour-line texture on
top, cream and sand tones, sitting at an isometric angle. Compact object, centered, isolated.
Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no
text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, readable text on map, coordinates,
compass rose printed on the map
```

### HOME-05 — `home-feature-compass.png`

- **suggested_filename:** `home-feature-compass.png`
- **target_path:** `public/assets/isometric/home-feature-compass.png`
- **intended_usage:** אייקון קטן לכרטיס ניווט.
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small classic lensatic field compass, papercut/clay style, olive-brown body, orange needle
tip as the only bright accent, angled isometrically. Compact object, centered, isolated.
Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no
text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, printed degree numbers, letters
N/S/E/W
```

### HOME-06 — `home-feature-route.png`

- **suggested_filename:** `home-feature-route.png`
- **target_path:** `public/assets/isometric/home-feature-route.png`
- **intended_usage:** אייקון קטן לכרטיס תכנון ציר/מסלול.
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A short isometric dotted path made of small papercut waypoint markers (simple pin shapes, not
letters) climbing over a tiny terrain fold, ending at one small orange flag. Compact object,
centered, isolated. Centered composition, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at
small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, arrows with letters, distance
numbers
```

### HOME-07 — `home-progress-panel-bg.webp`

- **suggested_filename:** `home-progress-panel-bg.webp`
- **target_path:** `public/assets/isometric/home-progress-panel-bg.webp`
- **intended_usage:** רקע דקורטיבי לפאנל התקדמות כהה.
- **aspect_ratio:** 21:9
- **transparent_background:** no

**Prompt:**
```text
A dark sage / deep olive full-bleed background panel, softly lit, showing a faint, low-
contrast silhouette of a topographic terrain fold and a tiny distant soldier silhouette
walking along a ridge line, everything muted and low-key so foreground white text remains
highly legible. No bright colors except one small dim orange accent point in the distance. No
text. Keep the image clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings, bright busy background, high
contrast figures, visible facial features
```


---

## B. Lesson card icons

### LESSON-01-CARD — `lesson-01-strategy-terrain.png`

- **suggested_filename:** `lesson-01-strategy-terrain.png`
- **target_path:** `public/assets/isometric/lesson-01-strategy-terrain.png`
- **intended_usage:** כרטיס שיעור 01 — מבוא/מרחב/אסטרטגיה
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small layered terrain block viewed like a strategy chessboard, with three subtly stepped
tiers (strategic/operational/tactical), one thin orange line connecting the tiers top to
bottom. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI
size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-02-CARD — `lesson-02-map-reading.png`

- **suggested_filename:** `lesson-02-map-reading.png`
- **target_path:** `public/assets/isometric/lesson-02-map-reading.png`
- **intended_usage:** כרטיס שיעור 02 — קרטוגרפיה/קווי גובה
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small stack of contour-line "cake" layers (like a topographic layer cake), sage-to-sand
gradient, one thin paper ruler resting diagonally beside it. Centered composition, isolated
object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-03-CARD — `lesson-03-navigation.png`

- **suggested_filename:** `lesson-03-navigation.png`
- **target_path:** `public/assets/isometric/lesson-03-navigation.png`
- **intended_usage:** כרטיס שיעור 03 — ניווט/מצפן/מסלול
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small compass sitting on a terrain fold with a short dotted waypoint path leading to one
orange flag. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small
UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-04-CARD — `lesson-04-landforms.png`

- **suggested_filename:** `lesson-04-landforms.png`
- **target_path:** `public/assets/isometric/lesson-04-landforms.png`
- **intended_usage:** כרטיס שיעור 04 — טופוגרפיה/מורפולוגיה
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small cluster of classic landform shapes side by side in papercut relief: a rounded dome
hill, a ridge, a saddle dip, each a distinct muted terrain tone. Centered composition,
isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-05-CARD — `lesson-05-mobility.png`

- **suggested_filename:** `lesson-05-mobility.png`
- **target_path:** `public/assets/isometric/lesson-05-mobility.png`
- **intended_usage:** כרטיס שיעור 05 — ניידות/עבירות/הסתרה
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small terrain patch split into a smooth trafficable path and a rougher vegetated patch, with
one tiny simplified papercut vehicle silhouette midway along the path. Centered composition,
isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-06-CARD — `lesson-06-los.png`

- **suggested_filename:** `lesson-06-los.png`
- **target_path:** `public/assets/isometric/lesson-06-los.png`
- **intended_usage:** כרטיס שיעור 06 — LOS/תצפית
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small hill with a tiny observation post silhouette on top and a soft translucent visibility
cone fan spreading down the slope in a pale sage tone. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-07-CARD — `lesson-07-weather.png`

- **suggested_filename:** `lesson-07-weather.png`
- **target_path:** `public/assets/isometric/lesson-07-weather.png`
- **intended_usage:** כרטיס שיעור 07 — אקלים/מזג אוויר/סנסורים
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small terrain fold partly covered by a soft low papercut cloud layer, with one small sensor-
tower silhouette poking above the cloud. Centered composition, isolated object, solid warm cream
background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-08-CARD — `lesson-08-logistics.png`

- **suggested_filename:** `lesson-08-logistics.png`
- **target_path:** `public/assets/isometric/lesson-08-logistics.png`
- **intended_usage:** כרטיס שיעור 08 — לוגיסטיקה/תשתיות
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small terrain slab with a simple road ribbon and one tiny simplified papercut supply-truck
silhouette on it, ending at a small depot-shape block. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-09-CARD — `lesson-09-chokepoints.png`

- **suggested_filename:** `lesson-09-chokepoints.png`
- **target_path:** `public/assets/isometric/lesson-09-chokepoints.png`
- **intended_usage:** כרטיס שיעור 09 — משאבים/נקודות חנק
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small strait-like terrain formation — two landmasses narrowing around a thin water channel,
with one tiny ship silhouette passing through the narrow gap. Centered composition, isolated
object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-10-CARD — `lesson-10-urban.png`

- **suggested_filename:** `lesson-10-urban.png`
- **target_path:** `public/assets/isometric/lesson-10-urban.png`
- **intended_usage:** כרטיס שיעור 10 — עירוני/MOUT
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small isometric city block made of a few simplified low-rise papercut buildings of varying
heights on a terrain base, narrow streets between them. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-11-CARD — `lesson-11-borders.png`

- **suggested_filename:** `lesson-11-borders.png`
- **target_path:** `public/assets/isometric/lesson-11-borders.png`
- **intended_usage:** כרטיס שיעור 11 — גבולות/עומק אסטרטגי
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small terrain slab visually split into two zones by one thin dashed border line, with a soft
buffer band of a third muted tone between them. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-12-CARD — `lesson-12-gis-layers.png`

- **suggested_filename:** `lesson-12-gis-layers.png`
- **target_path:** `public/assets/isometric/lesson-12-gis-layers.png`
- **intended_usage:** כרטיס שיעור 12 — GIS/שכבות/רשת
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small exploded stack of 3-4 thin translucent data-layer sheets above a terrain base,
connected by a few thin network node-dots and lines. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```


---

## C. Lesson Hook / Hero assets

### LESSON-01-HOOK — `lesson-01-strategy-terrain-hook.webp`

- **suggested_filename:** `lesson-01-strategy-terrain-hook.webp`
- **target_path:** `public/assets/isometric/lesson-01-strategy-terrain-hook.webp`
- **intended_usage:** Hook שיעור 01
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide atmospheric isometric terrain panorama seen from a strategic high vantage, layered
ridgelines fading into a soft cream haze at the horizon, one distant orange marker on a far
ridge suggesting a strategic objective. No text. Keep the image clean, calm, and suitable as a
supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-02-HOOK — `lesson-02-map-reading-hook.webp`

- **suggested_filename:** `lesson-02-map-reading-hook.webp`
- **target_path:** `public/assets/isometric/lesson-02-map-reading-hook.webp`
- **intended_usage:** Hook שיעור 02
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide scene of a large folded topographic map partly unfurled across a terrain surface,
contour lines flowing like gentle waves, soft raking light across the paper texture. No text.
Keep the image clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-03-HOOK — `lesson-03-navigation-hook.webp`

- **suggested_filename:** `lesson-03-navigation-hook.webp`
- **target_path:** `public/assets/isometric/lesson-03-navigation-hook.webp`
- **intended_usage:** Hook שיעור 03
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide terrain panorama at dusk-lit cream tones with a single faint dotted path winding
between hills toward one distant orange flag, conveying a long solo trek. No text. Keep the
image clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-04-HOOK — `lesson-04-landforms-hook.webp`

- **suggested_filename:** `lesson-04-landforms-hook.webp`
- **target_path:** `public/assets/isometric/lesson-04-landforms-hook.webp`
- **intended_usage:** Hook שיעור 04
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide panorama of varied papercut landforms — dome, ridge, valley, saddle — arranged in a
naturalistic isometric terrain sweep with soft shadow depth between each form. No text. Keep
the image clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-05-HOOK — `lesson-05-mobility-hook.webp`

- **suggested_filename:** `lesson-05-mobility-hook.webp`
- **target_path:** `public/assets/isometric/lesson-05-mobility-hook.webp`
- **intended_usage:** Hook שיעור 05
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide terrain panorama split between a smooth open trafficable plain and a denser vegetated
patch, one faint tire-track path curving between them. No text. Keep the image clean, calm,
and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-06-HOOK — `lesson-06-los-hook.webp`

- **suggested_filename:** `lesson-06-los-hook.webp`
- **target_path:** `public/assets/isometric/lesson-06-los-hook.webp`
- **intended_usage:** Hook שיעור 06
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide elevated terrain panorama at golden light, a single hill in the foreground with a soft
translucent visibility fan sweeping over the valley below. No text. Keep the image clean,
calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-07-HOOK — `lesson-07-weather-hook.webp`

- **suggested_filename:** `lesson-07-weather-hook.webp`
- **target_path:** `public/assets/isometric/lesson-07-weather-hook.webp`
- **intended_usage:** Hook שיעור 07
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide terrain panorama half-shrouded in soft low papercut cloud layers drifting over
ridgelines, muted cool-sage undertones suggesting shifting weather. No text. Keep the image
clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-08-HOOK — `lesson-08-logistics-hook.webp`

- **suggested_filename:** `lesson-08-logistics-hook.webp`
- **target_path:** `public/assets/isometric/lesson-08-logistics-hook.webp`
- **intended_usage:** Hook שיעור 08
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide terrain panorama with a long ribbon road threading through hills toward a small distant
depot silhouette, suggesting a long supply line. No text. Keep the image clean, calm, and
suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-09-HOOK — `lesson-09-chokepoints-hook.webp`

- **suggested_filename:** `lesson-09-chokepoints-hook.webp`
- **target_path:** `public/assets/isometric/lesson-09-chokepoints-hook.webp`
- **intended_usage:** Hook שיעור 09
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide panorama of a narrow strait between two landmasses under soft light, a single small
ship silhouette passing through the narrow passage. No text. Keep the image clean, calm, and
suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-10-HOOK — `lesson-10-urban-hook.webp`

- **suggested_filename:** `lesson-10-urban-hook.webp`
- **target_path:** `public/assets/isometric/lesson-10-urban-hook.webp`
- **intended_usage:** Hook שיעור 10
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide isometric panorama of a small dense papercut city district with varied low-rise
rooftops and narrow streets, soft late-day shadows between buildings. No text. Keep the image
clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-11-HOOK — `lesson-11-borders-hook.webp`

- **suggested_filename:** `lesson-11-borders-hook.webp`
- **target_path:** `public/assets/isometric/lesson-11-borders-hook.webp`
- **intended_usage:** Hook שיעור 11
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide terrain panorama divided by a long dashed border line running diagonally across hills,
a soft muted buffer band glowing faintly along the line. No text. Keep the image clean, calm,
and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-12-HOOK — `lesson-12-gis-layers-hook.webp`

- **suggested_filename:** `lesson-12-gis-layers-hook.webp`
- **target_path:** `public/assets/isometric/lesson-12-gis-layers-hook.webp`
- **intended_usage:** Hook שיעור 12
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A wide terrain panorama with several large translucent data-layer sheets floating above it in
soft parallax, faint connecting threads between a few marked points. No text. Keep the image
clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```


---

## D. Reusable UI decorative assets

### UI-PIN — `ui-pin-orange.png`

- **suggested_filename:** `ui-pin-orange.png`
- **target_path:** `public/assets/isometric/ui-pin-orange.png`
- **intended_usage:** סמן מיקום כתום קטן לשימוש כללי
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified orange map pin / teardrop marker, papercut style, clean drop shadow.
Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no
text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-FLAG — `ui-flag-orange.png`

- **suggested_filename:** `ui-flag-orange.png`
- **target_path:** `public/assets/isometric/ui-flag-orange.png`
- **intended_usage:** דגל כתום על מוט
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified orange flag on a thin pole, papercut style, gentle fold in the fabric.
Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no
text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-COMPASS-ROSE — `ui-compass-rose.png`

- **suggested_filename:** `ui-compass-rose.png`
- **target_path:** `public/assets/isometric/ui-compass-rose.png`
- **intended_usage:** ורד מצפן דקורטיבי
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small stylized papercut compass rose (4-point star), sand and charcoal tones, no printed
letters. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI
size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-MAP-TILE — `ui-folded-map-tile.png`

- **suggested_filename:** `ui-folded-map-tile.png`
- **target_path:** `public/assets/isometric/ui-folded-map-tile.png`
- **intended_usage:** אריח מפה מקופלת
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small folded paper map tile corner, cream tones with faint abstract contour texture, no
readable labels. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at
small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-CONTOUR-BG — `ui-contour-paper-texture.webp`

- **suggested_filename:** `ui-contour-paper-texture.webp`
- **target_path:** `public/assets/isometric/ui-contour-paper-texture.webp`
- **intended_usage:** מרקם רקע נייר-קונטור לשימוש כללי
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A seamless-feeling wide soft cream paper texture background with extremely faint embossed
contour lines, very low contrast, meant to sit behind UI content. No text. Keep the image
clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-TOPO-OVERLAY — `ui-topo-grid-overlay.png`

- **suggested_filename:** `ui-topo-grid-overlay.png`
- **target_path:** `public/assets/isometric/ui-topo-grid-overlay.png`
- **intended_usage:** שכבת-על שקופה של גריד טופוגרפי
- **aspect_ratio:** 16:9
- **transparent_background:** no

**Prompt:**
```text
A solid warm cream background overlay of extremely faint thin contour lines and a soft survey grid,
sage tone at low opacity, no numbers or labels. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-ROUTE-A — `ui-route-marker-a.png`

- **suggested_filename:** `ui-route-marker-a.png`
- **target_path:** `public/assets/isometric/ui-route-marker-a.png`
- **intended_usage:** סמן מסלול A
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified isometric waypoint marker shaped like a flat disc with a single bold
letter-free notch, sage tone with a thin orange ring, marking a route start point. Centered
composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-ROUTE-B — `ui-route-marker-b.png`

- **suggested_filename:** `ui-route-marker-b.png`
- **target_path:** `public/assets/isometric/ui-route-marker-b.png`
- **intended_usage:** סמן מסלול B
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
The same small isometric waypoint marker family as the route start, but in solid orange,
marking a route end point. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background,
readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-RETICLE — `ui-target-reticle.png`

- **suggested_filename:** `ui-target-reticle.png`
- **target_path:** `public/assets/isometric/ui-target-reticle.png`
- **intended_usage:** רשת מטרה קטנה
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified papercut target reticle (concentric rings and crosshair), charcoal and
orange, flat clean geometric style, not a weapon sight. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-WATCHTOWER — `ui-observation-post.png`

- **suggested_filename:** `ui-observation-post.png`
- **target_path:** `public/assets/isometric/ui-observation-post.png`
- **intended_usage:** עמדת תצפית/מגדל
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified isometric observation post / watchtower, wooden-and-charcoal papercut
style, sitting on a tiny terrain mound. Centered composition, isolated object, solid warm cream
background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-VEHICLE — `ui-armored-vehicle.png`

- **suggested_filename:** `ui-armored-vehicle.png`
- **target_path:** `public/assets/isometric/ui-armored-vehicle.png`
- **intended_usage:** סילואט רכב משוריין
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified papercut silhouette of a generic armored vehicle, low detail, olive-
charcoal tones, non-aggressive toy-free industrial-diagram feel. Centered composition,
isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-TRUCK — `ui-logistics-truck.png`

- **suggested_filename:** `ui-logistics-truck.png`
- **target_path:** `public/assets/isometric/ui-logistics-truck.png`
- **intended_usage:** סילואט משאית לוגיסטית
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified papercut silhouette of a generic logistics/supply truck, sand-charcoal
tones, low detail. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at
small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-SATELLITE — `ui-satellite-layers.png`

- **suggested_filename:** `ui-satellite-layers.png`
- **target_path:** `public/assets/isometric/ui-satellite-layers.png`
- **intended_usage:** לוויין/מחסנית שכבות GIS
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small simplified papercut satellite shape above a thin stack of translucent data-layer
sheets, sage and sand tones with one small orange signal dot. Centered composition, isolated
object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```


---

## E. Important variants

### HOME-01-MINIMAL — `home-hero-terrain-minimal.png`

- **suggested_filename:** `home-hero-terrain-minimal.png`
- **target_path:** `public/assets/isometric/home-hero-terrain-minimal.png`
- **intended_usage:** וריאנט מינימלי ל-HOME-01
- **aspect_ratio:** 16:9 or 21:9
- **transparent_background:** no

**Prompt:**
```text
A single isometric terrain slab / diorama block, like a physical paper relief map. Extremely
minimal version: one smooth terrain mound, one contour ring, one orange flag. No river, no
trees, no extra detail. The slab has a visible clean-cut edge on its sides showing layered
paper strata in warm sand and olive tones. Nothing else in frame. Centered composition,
isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### HOME-01-PREMIUM — `home-hero-terrain-premium.png`

- **suggested_filename:** `home-hero-terrain-premium.png`
- **target_path:** `public/assets/isometric/home-hero-terrain-premium.png`
- **intended_usage:** וריאנט פרימיום ל-HOME-01
- **aspect_ratio:** 16:9 or 21:9
- **transparent_background:** no

**Prompt:**
```text
A single isometric terrain slab / diorama block, like a physical paper relief map: gentle
contour-line ridges, a winding river cutting through a valley, a small cluster of low hills, a
few simplified papercut trees, and one small orange flag on a pole planted on the highest
point as the focal marker. Higher-fidelity render: more refined lighting, subtle ambient
occlusion in the valley, finely detailed paper-grain texture on the terrain surface, still
fully matte (not glossy). Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background,
readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### HOME-01-PAPERCUT — `home-hero-terrain-papercut.png`

- **suggested_filename:** `home-hero-terrain-papercut.png`
- **target_path:** `public/assets/isometric/home-hero-terrain-papercut.png`
- **intended_usage:** וריאנט פייפרקאט ל-HOME-01
- **aspect_ratio:** 16:9 or 21:9
- **transparent_background:** no

**Prompt:**
```text
A single isometric terrain slab / diorama block, like a physical paper relief map. Strongly
emphasize visible stacked paper-layer construction: each elevation band is a distinct physical
cut-paper sheet with a visible thin edge, like a real laser-cut layered terrain model. One
small orange flag on the highest point. Nothing else in frame. Centered composition, isolated
object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-COMPASS-ROSE-MINIMAL — `ui-compass-rose-minimal.png`

- **suggested_filename:** `ui-compass-rose-minimal.png`
- **target_path:** `public/assets/isometric/ui-compass-rose-minimal.png`
- **intended_usage:** וריאנט מינימלי ל-UI-COMPASS-ROSE
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small stylized compass rose. Reduce to a single thin 4-point star outline, no ornamentation.
Sand and charcoal tones, no printed letters. Centered, isolated. Centered composition,
isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-COMPASS-ROSE-PREMIUM — `ui-compass-rose-premium.png`

- **suggested_filename:** `ui-compass-rose-premium.png`
- **target_path:** `public/assets/isometric/ui-compass-rose-premium.png`
- **intended_usage:** וריאנט פרימיום ל-UI-COMPASS-ROSE
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small stylized papercut compass rose (4-point star), sand and charcoal tones, no printed
letters. Add fine brass-like engraved detail lines and subtle metallic-matte sheen (still not
glossy plastic), aged-map aesthetic. Centered, isolated. Centered composition, isolated
object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### UI-COMPASS-ROSE-PAPERCUT — `ui-compass-rose-papercut.png`

- **suggested_filename:** `ui-compass-rose-papercut.png`
- **target_path:** `public/assets/isometric/ui-compass-rose-papercut.png`
- **intended_usage:** וריאנט פייפרקאט ל-UI-COMPASS-ROSE
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small stylized compass rose (4-point star), sand and charcoal tones, no printed letters.
Build the compass rose from visibly layered die-cut paper points at slightly different
heights, casting small soft shadows on each other. Centered, isolated. Centered composition,
isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-10-CARD-MINIMAL — `lesson-10-urban-minimal.png`

- **suggested_filename:** `lesson-10-urban-minimal.png`
- **target_path:** `public/assets/isometric/lesson-10-urban-minimal.png`
- **intended_usage:** וריאנט מינימלי לכרטיס שיעור 10
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small isometric city block on a terrain base. Reduce to 3 simple block shapes of varying
height, no street detail. Professional urban terrain teaching icon, centered, isolated.
Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no
text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-10-CARD-PREMIUM — `lesson-10-urban-premium.png`

- **suggested_filename:** `lesson-10-urban-premium.png`
- **target_path:** `public/assets/isometric/lesson-10-urban-premium.png`
- **intended_usage:** וריאנט פרימיום לכרטיס שיעור 10
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small isometric city block made of a few simplified low-rise papercut buildings of varying
heights on a terrain base, narrow streets between them. Add finer architectural massing
detail, subtle window-grid texture (no readable text), richer shadow occlusion between
buildings. Centered composition, isolated object, solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI
size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### LESSON-10-CARD-PAPERCUT — `lesson-10-urban-papercut.png`

- **suggested_filename:** `lesson-10-urban-papercut.png`
- **target_path:** `public/assets/isometric/lesson-10-urban-papercut.png`
- **intended_usage:** וריאנט פייפרקאט לכרטיס שיעור 10
- **aspect_ratio:** 1:1
- **transparent_background:** no

**Prompt:**
```text
A small isometric city block made of a few simplified low-rise buildings of varying heights on
a terrain base. Emphasize each building as a distinct layered paper block with a visible cut
edge, stacked like architectural paper models. Centered composition, isolated object,
solid warm cream background (#FFFBF7), no transparency, no checkerboard background, readable at small UI size, no text.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### HOME-07-MINIMAL — `home-progress-panel-bg-minimal.png`

- **suggested_filename:** `home-progress-panel-bg-minimal.png`
- **target_path:** `public/assets/isometric/home-progress-panel-bg-minimal.png`
- **intended_usage:** וריאנט מינימלי לרקע פאנל התקדמות
- **aspect_ratio:** 21:9
- **transparent_background:** no

**Prompt:**
```text
A dark sage / deep olive full-bleed background panel. Remove the silhouette entirely — just a
smooth dark sage gradient with an extremely faint contour texture. Very low contrast so
foreground white text remains highly legible. No text. Keep the image clean, calm, and
suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### HOME-07-PREMIUM — `home-progress-panel-bg-premium.png`

- **suggested_filename:** `home-progress-panel-bg-premium.png`
- **target_path:** `public/assets/isometric/home-progress-panel-bg-premium.png`
- **intended_usage:** וריאנט פרימיום לרקע פאנל התקדמות
- **aspect_ratio:** 21:9
- **transparent_background:** no

**Prompt:**
```text
A dark sage / deep olive full-bleed background panel, softly lit, showing a faint, low-
contrast silhouette of a topographic terrain fold. Slightly richer lighting gradient and finer
terrain silhouette detail on the horizon line, still very low-contrast and dark. No text. Keep
the image clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```

### HOME-07-PAPERCUT — `home-progress-panel-bg-papercut.png`

- **suggested_filename:** `home-progress-panel-bg-papercut.png`
- **target_path:** `public/assets/isometric/home-progress-panel-bg-papercut.png`
- **intended_usage:** וריאנט פייפרקאט לרקע פאנל התקדמות
- **aspect_ratio:** 21:9
- **transparent_background:** no

**Prompt:**
```text
A dark sage / deep olive full-bleed background panel. Suggest the dark terrain as stacked
dark-toned paper layers barely visible in the low light, rather than a flat silhouette.
Everything muted and low-key so foreground white text remains highly legible. No text. Keep
the image clean, calm, and suitable as a supporting UI background.
```

**Negative prompt:**
```text
text, letters, numbers, labels, signage, Hebrew text, English text, gibberish text, watermark,
signature, logo, UI chrome, screenshot, humans, crowds, weapons, close-up weapons, explosions,
blood, gore, neon colors, saturated colors, random off-palette hues, glossy plastic, toy-like
style, cartoon style, low-poly game asset, cluttered background, busy composition, blurry,
motion blur, distorted geometry, transparent background, checkerboard background, alpha channel, inaccurate map markings
```
