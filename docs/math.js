// Exact fractions keep decimal arithmetic accurate (for example, 0.1 + 0.2 = 0.3).
const gcd = (a, b) => b ? gcd(b, a % b) : a < 0n ? -a : a;
function fraction(n, d = 1n) { if (!d) throw new Error('Division by zero is undefined. Choose a nonzero divisor.'); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
export function parseNumber(raw) {
  const s = String(raw).trim();
  if (!s || s.length > 40 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) throw new Error('Please enter a valid number in every field.');
  const value = Number(s);
  if (!Number.isFinite(value) || Math.abs(value) > 1e12 || (value !== 0 && Math.abs(value) < 1e-12)) throw new Error('Use numbers between −1 trillion and 1 trillion, with nonzero magnitudes of at least 0.000000000001.');
  const [base, exponent = '0'] = s.toLowerCase().split('e');
  const exp = Number(exponent);
  if (Math.abs(exp) > 24) throw new Error('Use an exponent between −24 and 24.');
  const decimals = (base.split('.')[1] || '').length;
  let n = BigInt(base.replace('.', '')); let d = 10n ** BigInt(decimals);
  if (exp >= 0) n *= 10n ** BigInt(exp); else d *= 10n ** BigInt(-exp);
  return fraction(n, d);
}
export const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
export const subtract = (a, b) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
export const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
export const divide = (a, b) => fraction(a.n * b.d, a.d * b.n);
export function format(a) { return a.d === 1n ? String(a.n) : `${a.n}/${a.d}`; }
export function approximate(a) { return Number((Number(a.n) / Number(a.d)).toPrecision(10)).toString(); }
export function solve(aRaw, bRaw, cRaw) {
  const a = parseNumber(aRaw), b = parseNumber(bRaw), c = parseNumber(cRaw);
  if (a.n === 0n) return { type: subtract(b, c).n === 0n ? 'infinite' : 'none', a, b, c };
  return { type: 'unique', a, b, c, difference: subtract(c, b), x: divide(subtract(c, b), a) };
}
export function arithmetic(left, operation, right) {
  const operations = { add, subtract, multiply, divide };
  if (!operations[operation]) throw new Error('Choose a valid operation.');
  return operations[operation](parseNumber(left), parseNumber(right));
}
