/** Rolling click retention window — current month + previous closed months. */

export const CLICKS_CLOSED_MONTHS = 5;

export function spYmd(ts = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(ts));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')) };
}

/** Midnight SP → UTC ms. Brazil is UTC-3 year-round. */
export function spMidnightUtcMs(year, month, day = 1) {
  return Date.UTC(year, month - 1, day, 3, 0, 0);
}

/**
 * Rolling click window: current month + previous CLICKS_CLOSED_MONTHS.
 * With 5 closed + current (= 6 months): on 1 Sep, Mar drops; keep Apr–Aug closed + Sep current.
 */
export function clicksRetentionWindow(now = Date.now()) {
  const cur = spYmd(now);
  let y = cur.year;
  let m = cur.month - CLICKS_CLOSED_MONTHS;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  const cutoffMs = spMidnightUtcMs(y, m, 1);
  const months = [];
  let yy = y;
  let mm = m;
  for (let i = 0; i <= CLICKS_CLOSED_MONTHS; i++) {
    const key = `${yy}-${String(mm).padStart(2, '0')}`;
    months.push({
      year: yy,
      month: mm,
      key,
      isCurrent: yy === cur.year && mm === cur.month
    });
    mm += 1;
    if (mm > 12) {
      mm = 1;
      yy += 1;
    }
  }
  return {
    cutoffMs,
    months,
    closedMonths: CLICKS_CLOSED_MONTHS,
    totalMonths: CLICKS_CLOSED_MONTHS + 1,
    currentYm: `${cur.year}-${String(cur.month).padStart(2, '0')}`
  };
}
