/* ─────────── WGS84 ↔ WGS84 / UTM — pure maths, no dependency ───────────
   Transverse Mercator by Krüger's series to order n⁶, in the form of
   C. F. F. Karney, "Transverse Mercator with an accuracy of a few
   nanometers", J. Geodesy 85 (2011) — the algorithm behind PROJ's default
   `+proj=utm` / `tmerc` and GeographicLib. Inside a UTM zone it agrees with
   PROJ far below a millimetre; scripts/qa/reference-systems.test.mjs checks
   it against PROJ's own outputs for this lesson's points.

   Field order is always explicit — { lat, lon } in degrees, { e, n } in
   metres — so latitude and longitude can never be swapped by position. */

export type LatLon = { lat: number; lon: number };
export type EastNorth = { e: number; n: number };
export type UtmZone = { zone: number; hemisphere: 'N' | 'S' };

// WGS84 ellipsoid (EPSG:7030)
const A_AXIS = 6378137;
const F = 1 / 298.257223563;
// UTM
const K0 = 0.9996;
const FALSE_EASTING = 500000;
const FALSE_NORTHING_SOUTH = 10000000;

const N = F / (2 - F);
const E2 = F * (2 - F);
const ECC = Math.sqrt(E2);
const N2 = N * N;
const N3 = N2 * N;
const N4 = N3 * N;
const N5 = N4 * N;
const N6 = N5 * N;

/** Rectifying radius. */
const A_RECT = (A_AXIS / (1 + N)) * (1 + N2 / 4 + N4 / 64 + N6 / 256);

const ALPHA = [
  N / 2 - (2 * N2) / 3 + (5 * N3) / 16 + (41 * N4) / 180 - (127 * N5) / 288 + (7891 * N6) / 37800,
  (13 * N2) / 48 - (3 * N3) / 5 + (557 * N4) / 1440 + (281 * N5) / 630 - (1983433 * N6) / 1935360,
  (61 * N3) / 240 - (103 * N4) / 140 + (15061 * N5) / 26880 + (167603 * N6) / 181440,
  (49561 * N4) / 161280 - (179 * N5) / 168 + (6601661 * N6) / 7257600,
  (34729 * N5) / 80640 - (3418889 * N6) / 1995840,
  (212378941 * N6) / 319334400,
];

const BETA = [
  N / 2 - (2 * N2) / 3 + (37 * N3) / 96 - N4 / 360 - (81 * N5) / 512 + (96199 * N6) / 604800,
  N2 / 48 + N3 / 15 - (437 * N4) / 1440 + (46 * N5) / 105 - (1118711 * N6) / 3870720,
  (17 * N3) / 480 - (37 * N4) / 840 - (209 * N5) / 4480 + (5569 * N6) / 90720,
  (4397 * N4) / 161280 - (11 * N5) / 504 - (830251 * N6) / 7257600,
  (4583 * N5) / 161280 - (108847 * N6) / 3991680,
  (20648693 * N6) / 638668800,
];

const RAD = Math.PI / 180;

/** Longitude of a zone's central meridian, in degrees. */
export const centralMeridian = (zone: number) => -183 + 6 * zone;

/** Geographic (WGS84, EPSG:4326) → UTM on WGS84 (EPSG:326zz / 327zz). */
export function toUtm({ lat, lon }: LatLon, { zone, hemisphere }: UtmZone): EastNorth {
  const phi = lat * RAD;
  const dLam = (lon - centralMeridian(zone)) * RAD;

  // conformal latitude, as τ′ = tan χ
  const sinPhi = Math.sin(phi);
  const t = Math.sinh(Math.atanh(sinPhi) - ECC * Math.atanh(ECC * sinPhi));
  const xiP = Math.atan2(t, Math.cos(dLam));
  const etaP = Math.atanh(Math.sin(dLam) / Math.sqrt(1 + t * t));

  let xi = xiP;
  let eta = etaP;
  for (let j = 1; j <= 6; j++) {
    xi += ALPHA[j - 1] * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += ALPHA[j - 1] * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }
  return {
    e: FALSE_EASTING + K0 * A_RECT * eta,
    n: (hemisphere === 'S' ? FALSE_NORTHING_SOUTH : 0) + K0 * A_RECT * xi,
  };
}

/** UTM on WGS84 → geographic (WGS84). */
export function fromUtm({ e, n }: EastNorth, { zone, hemisphere }: UtmZone): LatLon {
  const xi = (n - (hemisphere === 'S' ? FALSE_NORTHING_SOUTH : 0)) / (K0 * A_RECT);
  const eta = (e - FALSE_EASTING) / (K0 * A_RECT);

  let xiP = xi;
  let etaP = eta;
  for (let j = 1; j <= 6; j++) {
    xiP -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const tauP = Math.sin(xiP) / Math.sqrt(Math.sinh(etaP) ** 2 + Math.cos(xiP) ** 2);
  const dLam = Math.atan2(Math.sinh(etaP), Math.cos(xiP));

  // τ from τ′ by Newton's method (Karney 2011, eqs. 19–21); converges in 2–3 steps.
  let tau = tauP;
  for (let i = 0; i < 8; i++) {
    const sigma = Math.sinh(ECC * Math.atanh((ECC * tau) / Math.sqrt(1 + tau * tau)));
    const tauI = tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau);
    const d = ((tauP - tauI) / Math.sqrt(1 + tauI * tauI)) * ((1 + (1 - E2) * tau * tau) / ((1 - E2) * Math.sqrt(1 + tau * tau)));
    tau += d;
    if (Math.abs(d) < 1e-14) break;
  }

  return { lat: Math.atan(tau) / RAD, lon: centralMeridian(zone) + dLam / RAD };
}

/* ── Degrees, minutes, seconds ─────────────────────────────────────────── */

export type Dms = { deg: number; min: number; sec: number; hemi: 'N' | 'S' | 'E' | 'W' };

/** Splits a decimal angle into D/M/S with `secDecimals` places, carrying 60″ → 1′ → 1°. */
export function toDms(value: number, axis: 'lat' | 'lon', secDecimals = 1): Dms {
  const hemi = axis === 'lat' ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E';
  const scale = 10 ** secDecimals;
  let total = Math.round(Math.abs(value) * 3600 * scale); // in units of 10^-d seconds
  const perMin = 60 * scale;
  const perDeg = 3600 * scale;
  const deg = Math.floor(total / perDeg);
  total -= deg * perDeg;
  const min = Math.floor(total / perMin);
  total -= min * perMin;
  return { deg, min, sec: total / scale, hemi };
}

export const dmsToDecimal = ({ deg, min, sec, hemi }: Dms) => (hemi === 'S' || hemi === 'W' ? -1 : 1) * (deg + min / 60 + sec / 3600);

/** "31°48′12.3″N" — or without the hemisphere letter. */
export function formatDms(d: Dms, secDecimals = 1, withHemi = true) {
  const sec = d.sec.toFixed(secDecimals).padStart(secDecimals ? 3 + secDecimals : 2, '0');
  return `${d.deg}°${String(d.min).padStart(2, '0')}′${sec}″${withHemi ? d.hemi : ''}`;
}
