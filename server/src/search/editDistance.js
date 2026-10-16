export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      min = Math.min(min, cur[j]);
    }
    if (min > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
// Compares only words within the length window sharing the first letter (cheap; misses first-letter typos by design).
export function closest(term, vocab, max = term.length <= 4 ? 1 : 2) {
  let best = null,
    bd = max + 1;
  for (const w of vocab) {
    if (Math.abs(w.length - term.length) > max || w[0] !== term[0]) continue;
    const d = levenshtein(term, w, max);
    if (d < bd || (d === bd && best && w < best)) {
      bd = d;
      best = w;
    }
  }
  return bd <= max && bd > 0 ? best : null;
}
