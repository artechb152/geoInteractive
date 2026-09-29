// Verifies the sample point used by
// src/components/lessons/topic-02/CoordinateSystemsComparison.tsx.
//
// proj4 is not a project dependency, so run it from a scratch folder:
//   mkdir %TEMP%\proj && cd %TEMP%\proj && npm init -y && npm i proj4@2
//   copy <repo>\design\handoff\coordinates-itm-wgs84\verify-sample-point.mjs .
//   node verify-sample-point.mjs
//
// Result on 2026-09-29 (proj4 2.x):
//   EPSG:2039 + 7-param towgs84   E 219102.03  N 632555.49  → 219102 / 632555
//   EPSG:2039 + 3-param (-48,55,52) E 219095.46  N 632548.26  (≈ 9.7 m away)
//   no datum shift                  E 219168.07  N 632596.42  (≈ 78 m away)
import proj4 from 'proj4';

const lat = 31.7857;
const lon = 35.2007;

// Verbatim from https://epsg.io/2039.proj4 (checked 2026-09-29).
const EPSG_2039 =
  '+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 +units=m +no_defs +type=crs';
const base = EPSG_2039.replace(/\+towgs84=\S+ /, '');

const variants = {
  'EPSG:2039 + 7-param towgs84': EPSG_2039,
  'EPSG:2039 + 3-param (-48,55,52)': `${base} +towgs84=-48,55,52,0,0,0,0`,
  'no datum shift': `${base} +towgs84=0,0,0,0,0,0,0`,
};

for (const [name, def] of Object.entries(variants)) {
  const [E, N] = proj4('EPSG:4326', def, [lon, lat]);
  const [lon2, lat2] = proj4(def, 'EPSG:4326', [Math.round(E), Math.round(N)]);
  console.log(
    name.padEnd(34),
    `E ${E.toFixed(2)}  N ${N.toFixed(2)}`,
    `| rounded pair back to WGS84: ${lat2.toFixed(6)}, ${lon2.toFixed(6)}`,
  );
}
