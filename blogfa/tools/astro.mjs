/* ==========================================================================
   آینده‌نگار · astro — reference positions of the Sun and the Moon for the tests of the live sky.
   The blog itself uses short approximations (src/js/early.js: the sun's height from the day of the year and the hour;
   src/js/live.js: the moon's age from the mean length of a lunation). tools/behaviour.mjs compares them with the
   fuller formulas below, so the size of the approximation is measured and not assumed.
   Formulas: J. Meeus, "Astronomical Algorithms", 2nd ed., ch. 12 (sidereal time), ch. 25 (solar coordinates, low
   accuracy, about 0.01°) and ch. 47 (lunar longitude, the sixteen largest terms, about 0.3°). Node only; nothing
   here is sent to the browser.
   ========================================================================== */
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
export const jd = date => date.getTime() / 864e5 + 2440587.5;
const cent = date => (jd(date) - 2451545) / 36525;

// apparent ecliptic longitude of the Sun, degrees
export function sunLon(date) {
  const T = cent(date);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = rad(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return ((L0 + C - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * T))) % 360 + 360) % 360;
}
// ecliptic longitude of the Moon, degrees
export function moonLon(date) {
  const T = cent(date);
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = rad(297.8501921 + 445267.1114034 * T), M = rad(357.5291092 + 35999.0502909 * T);
  const Mp = rad(134.9633964 + 477198.8675055 * T), F = rad(93.272095 + 483202.0175233 * T);
  const terms = [[6.288774, Mp], [1.274027, 2 * D - Mp], [0.658314, 2 * D], [0.213618, 2 * Mp], [-0.185116, M], [-0.114332, 2 * F],
    [0.058793, 2 * D - 2 * Mp], [0.057066, 2 * D - M - Mp], [0.053322, 2 * D + Mp], [0.045758, 2 * D - M], [-0.040923, M - Mp],
    [-0.03472, D], [-0.030383, M + Mp], [0.015327, 2 * D - 2 * F], [-0.012528, Mp + 2 * F], [0.01098, Mp - 2 * F]];
  return ((Lp + terms.reduce((s, [a, x]) => s + a * Math.sin(x), 0)) % 360 + 360) % 360;
}
// how far the Moon is through its cycle: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter
export const moonAge = date => (((moonLon(date) - sunLon(date)) % 360 + 360) % 360) / 360;

// the Sun's height above the horizon in degrees, for a place (latitude north, longitude east), without refraction
export function sunAlt(date, lat, lon) {
  const T = cent(date), l = rad(sunLon(date));
  const eps = rad(23.439291 - 0.0130042 * T + 0.00256 * Math.cos(rad(125.04 - 1934.136 * T)));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l)), dec = Math.asin(Math.sin(eps) * Math.sin(l));
  const d = jd(date) - 2451545, gmst = rad(((280.46061837 + 360.98564736629 * d + 0.000387933 * T * T) % 360 + 360) % 360);
  const H = gmst + rad(lon) - ra, la = rad(lat);
  return deg(Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H)));
}
// the moment between two times at which the Sun's height passes a given value (bisection; the height must be on
// opposite sides of the value at the two ends)
export function crossing(from, to, lat, lon, height) {
  let a = from.getTime(), b = to.getTime();
  const up = sunAlt(new Date(a), lat, lon) > height;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if ((sunAlt(new Date(m), lat, lon) > height) === up) a = m; else b = m; }
  return new Date((a + b) / 2);
}
