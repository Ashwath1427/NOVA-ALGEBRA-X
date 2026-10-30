// Exact fractions keep decimal arithmetic accurate (for example, 0.1 + 0.2 = 0.3).
export const gcd = (a, b) => b ? gcd(b, a % b) : a < 0n ? -a : a;

export function fraction(n, d = 1n) {
  if (typeof n === 'number') n = BigInt(Math.round(n));
  if (typeof d === 'number') d = BigInt(Math.round(d));
  if (!d) throw new Error('Division by zero is undefined. Choose a nonzero divisor.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n < 0n ? -n : n, d);
  return { n: n / g, d: d / g };
}

export const ZERO = fraction(0n, 1n);
export const ONE = fraction(1n, 1n);

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
export const negate = a => fraction(-a.n, a.d);

export function format(a) {
  if (!a) return '0';
  return a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
}

export function approximate(a) {
  if (!a) return '0';
  return Number((Number(a.n) / Number(a.d)).toPrecision(10)).toString();
}

export function arithmetic(left, operation, right) {
  const operations = { add, subtract, multiply, divide };
  if (!operations[operation]) throw new Error('Choose a valid operation.');
  return operations[operation](parseNumber(left), parseNumber(right));
}

// Polynomial representation & operations
export function polyClean(p) {
  let len = p.length;
  while (len > 1 && p[len - 1].n === 0n) len--;
  return p.slice(0, len);
}

export function polyAdd(p1, p2) {
  const len = Math.max(p1.length, p2.length);
  const res = [];
  for (let i = 0; i < len; i++) res.push(add(p1[i] || ZERO, p2[i] || ZERO));
  return polyClean(res);
}

export function polySubtract(p1, p2) {
  const len = Math.max(p1.length, p2.length);
  const res = [];
  for (let i = 0; i < len; i++) res.push(subtract(p1[i] || ZERO, p2[i] || ZERO));
  return polyClean(res);
}

export function polyMultiply(p1, p2) {
  if ((p1.length === 1 && p1[0].n === 0n) || (p2.length === 1 && p2[0].n === 0n)) return [ZERO];
  const len = p1.length + p2.length - 1;
  const res = Array.from({ length: len }, () => ZERO);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] = add(res[i + j], multiply(p1[i], p2[j]));
    }
  }
  return polyClean(res);
}

export function polyDivideConst(p1, k) {
  if (k.n === 0n) throw new Error('Division by zero is undefined.');
  return polyClean(p1.map(c => divide(c, k)));
}

export function polyPow(p1, exp) {
  if (exp === 0) return [ONE];
  if (exp === 1) return p1;
  let res = p1;
  for (let i = 2; i <= exp; i++) res = polyMultiply(res, p1);
  return res;
}

export function polyToString(p, variable = 'x') {
  p = polyClean(p);
  if (p.length === 1 && p[0].n === 0n) return '0';
  const terms = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i];
    if (c.n === 0n) continue;
    let sign = c.n < 0n ? '−' : '+';
    let absC = c.n < 0n ? fraction(-c.n, c.d) : c;
    let cStr = format(absC);
    let varPart = '';
    if (i === 1) varPart = variable;
    else if (i === 2) varPart = `${variable}²`;
    else if (i === 3) varPart = `${variable}³`;
    else if (i > 3) varPart = `${variable}^${i}`;

    let termStr = '';
    if (varPart) {
      if (cStr === '1') termStr = varPart;
      else termStr = `${cStr}${varPart}`;
    } else {
      termStr = cStr;
    }

    if (terms.length === 0) {
      terms.push(c.n < 0n ? `−${termStr}` : termStr);
    } else {
      terms.push(`${sign} ${termStr}`);
    }
  }
  return terms.join(' ') || '0';
}

function polyEvaluate(p, value) {
  let result = ZERO;
  for (let i = p.length - 1; i >= 0; i--) result = add(multiply(result, value), p[i] || ZERO);
  return result;
}

function polyEvaluateNumber(p, value) {
  return p.reduceRight((result, coefficient) => result * value + Number(coefficient.n) / Number(coefficient.d), 0);
}

function parseTokenNumber(s) {
  const [base, exponent = '0'] = s.toLowerCase().split('e');
  const exp = Number(exponent);
  const decimals = (base.split('.')[1] || '').length;
  let n = BigInt(base.replace('.', ''));
  let d = 10n ** BigInt(decimals);
  if (exp >= 0) n *= 10n ** BigInt(exp);
  else d *= 10n ** BigInt(-exp);
  return fraction(n, d);
}

export function tokenize(input) {
  let s = String(input || '').trim();
  s = s.replace(/−/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/');
  s = s.replace(/²/g, '^2').replace(/³/g, '^3');

  const rawTokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '=' || ch === '(' || ch === ')' || ch === '[' || ch === ']' || ch === '{' || ch === '}') {
      let type = 'OP', val = ch;
      if (ch === '=') type = 'EQUALS';
      else if (ch === '(' || ch === '[' || ch === '{') { type = 'LPAREN'; val = '('; }
      else if (ch === ')' || ch === ']' || ch === '}') { type = 'RPAREN'; val = ')'; }
      rawTokens.push({ type, val });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < s.length && /[0-9.]/.test(s[i])) { numStr += s[i]; i++; }
      if (i < s.length && (s[i] === 'e' || s[i] === 'E') && i + 1 < s.length && /[0-9+-]/.test(s[i + 1])) {
        numStr += s[i]; i++;
        if (s[i] === '+' || s[i] === '-') { numStr += s[i]; i++; }
        while (i < s.length && /[0-9]/.test(s[i])) { numStr += s[i]; i++; }
      }
      rawTokens.push({ type: 'NUMBER', val: parseTokenNumber(numStr) });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      rawTokens.push({ type: 'VAR', val: ch.toLowerCase() });
      i++;
      continue;
    }
    i++;
  }

  // Insert implicit multiplication
  const tokens = [];
  for (let k = 0; k < rawTokens.length; k++) {
    tokens.push(rawTokens[k]);
    if (k + 1 < rawTokens.length) {
      const cur = rawTokens[k];
      const next = rawTokens[k + 1];
      const curCanMultiply = cur.type === 'NUMBER' || cur.type === 'VAR' || cur.type === 'RPAREN';
      const nextCanMultiply = next.type === 'VAR' || next.type === 'LPAREN' || (cur.type === 'RPAREN' && next.type === 'NUMBER');
      if (curCanMultiply && nextCanMultiply) {
        tokens.push({ type: 'OP', val: '*' });
      }
    }
  }
  return tokens;
}

export function parseExpression(tokens, targetVar = 'x') {
  let pos = 0;
  function peek() { return tokens[pos]; }
  function consume(expectedVal) {
    const tok = tokens[pos];
    if (!tok || (expectedVal && tok.val !== expectedVal)) {
      throw new Error(`Unexpected token: ${tok ? tok.val : 'end of input'}`);
    }
    pos++;
    return tok;
  }

  function parseExpr() {
    let left = parseTerm();
    while (pos < tokens.length && (peek().val === '+' || peek().val === '-')) {
      const op = consume().val;
      const right = parseTerm();
      left = op === '+' ? polyAdd(left, right) : polySubtract(left, right);
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (pos < tokens.length && (peek().val === '*' || peek().val === '/')) {
      const op = consume().val;
      const right = parsePower();
      if (op === '*') {
        left = polyMultiply(left, right);
      } else {
        if (right.length > 1) {
          throw new Error('Division by variable expressions is not supported in polynomial equations.');
        }
        left = polyDivideConst(left, right[0]);
      }
    }
    return left;
  }

  function parsePower() {
    let base = parseUnary();
    if (pos < tokens.length && peek().val === '^') {
      consume('^');
      const expTok = consume();
      if (expTok.type !== 'NUMBER' || expTok.val.d !== 1n || expTok.val.n < 0n || expTok.val.n > 4n) {
        throw new Error('Only integer powers between 0 and 4 are supported.');
      }
      base = polyPow(base, Number(expTok.val.n));
    }
    return base;
  }

  function parseUnary() {
    if (pos < tokens.length && (peek().val === '+' || peek().val === '-')) {
      const op = consume().val;
      const factor = parseFactor();
      return op === '-' ? polySubtract([ZERO], factor) : factor;
    }
    return parseFactor();
  }

  function parseFactor() {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of mathematical expression.');
    if (tok.type === 'NUMBER') {
      consume();
      return [tok.val];
    }
    if (tok.type === 'VAR') {
      consume();
      if (tok.val === targetVar) {
        return [ZERO, ONE];
      } else {
        throw new Error(`Found multiple variables ('${tok.val}' and '${targetVar}'). Choose one variable to solve for.`);
      }
    }
    if (tok.type === 'LPAREN') {
      consume('(');
      const inner = parseExpr();
      consume(')');
      return inner;
    }
    throw new Error(`Unexpected symbol: ${tok.val}`);
  }

  const result = parseExpr();
  return { poly: result, remainingPos: pos };
}

function bigintSqrt(n) {
  if (n < 0n) return null;
  if (n === 0n || n === 1n) return n;
  let x0 = n / 2n;
  if (x0 !== 0n) {
    let x1 = (x0 + n / x0) / 2n;
    while (x1 < x0) {
      x0 = x1;
      x1 = (x0 + n / x0) / 2n;
    }
    return x0 * x0 === n ? x0 : null;
  }
  return null;
}

function exactSqrtFraction(f) {
  if (f.n < 0n) return null;
  const sn = bigintSqrt(f.n);
  const sd = bigintSqrt(f.d);
  if (sn !== null && sd !== null) {
    return fraction(sn, sd);
  }
  return null;
}

export function solvePolynomialEquation(pLeft, pRight, variable = 'x', origLeftStr = '', origRightStr = '') {
  const pDiff = polySubtract(pLeft, pRight);
  const degree = pDiff.length - 1;

  if (degree <= 0) {
    const c0 = pDiff[0] || ZERO;
    if (c0.n === 0n) {
      return {
        type: 'infinite',
        variable,
        banner: 'Infinitely many solutions',
        formula: `0·${variable} = 0   ──➜   Identity (holds true for all real numbers)`,
        summary: `Every value of ${variable} makes this equation true.`,
        steps: [
          { text: `${origLeftStr || polyToString(pLeft, variable)} = ${origRightStr || polyToString(pRight, variable)}`, note: 'Start with your equation.' },
          { text: `${polyToString(pLeft, variable)} = ${polyToString(pRight, variable)}   ──➜   Both sides are equivalent`, note: 'Both sides simplify to equivalent expressions.' },
          { text: '0 = 0   ⟹   Identity confirmed! ✓', note: 'All terms cancel out. This is an identity true for all numbers.' }
        ]
      };
    } else {
      return {
        type: 'none',
        variable,
        banner: 'No solution',
        formula: `0·${variable} = ${format(c0)} (≠ 0)   ──➜   Contradiction (no solution exists)`,
        summary: `No value of ${variable} can make this equation true.`,
        steps: [
          { text: `${origLeftStr || polyToString(pLeft, variable)} = ${origRightStr || polyToString(pRight, variable)}`, note: 'Start with your equation.' },
          { text: `${format(c0)} = 0   ⟹   Contradiction! ✗`, note: 'The variable cancels out, leaving a false statement.' }
        ]
      };
    }
  }

  if (degree === 1) {
    const c0 = pDiff[0] || ZERO;
    const c1 = pDiff[1];
    const diffConst = negate(c0);
    const sol = divide(diffConst, c1);

    const steps = [];
    steps.push({ text: `${origLeftStr || polyToString(pLeft, variable)} = ${origRightStr || polyToString(pRight, variable)}`, note: 'Start with your equation.' });

    const simplifiedLeft = polyToString(pLeft, variable);
    const simplifiedRight = polyToString(pRight, variable);
    if ((origLeftStr && origLeftStr !== simplifiedLeft) || (origRightStr && origRightStr !== simplifiedRight)) {
      steps.push({ text: `${origLeftStr || polyToString(pLeft, variable)}   ──➜   ${simplifiedLeft} = ${simplifiedRight}`, note: 'Expand and simplify both sides.' });
    }

    const rightVarTerm = pRight[1] || ZERO;
    const leftConst = pLeft[0] || ZERO;

    if (rightVarTerm.n !== 0n) {
      steps.push({
        text: `${simplifiedLeft} = ${simplifiedRight}   ──➜   ${polyToString(polySubtract(pLeft, [ZERO, rightVarTerm]), variable)} = ${format(pRight[0] || ZERO)}`,
        note: `Move variable terms to one side (subtract ${polyToString([ZERO, rightVarTerm], variable)} from both sides).`
      });
    }

    if (leftConst.n !== 0n) {
      steps.push({
        text: `${format(c1)}${variable} + (${format(leftConst)}) = ${format(pRight[0] || ZERO)}   ──➜   ${format(c1)}${variable} = ${format(diffConst)}`,
        note: `Move constants to the other side (${leftConst.n > 0n ? `subtract ${format(leftConst)}` : `add ${format(negate(leftConst))}`} from both sides).`
      });
    }

    if (c1.n !== c1.d || c1.n !== 1n) {
      steps.push({
        text: `${format(c1)}${variable} = ${format(diffConst)}   ──➜   ${variable} = (${format(diffConst)}) ÷ (${format(c1)})   ⟹   ${variable} = ${format(sol)}`,
        note: `Divide both sides by ${format(c1)} to isolate ${variable}.`
      });
    }

    const leftCheck = polyEvaluate(pLeft, sol);
    const rightCheck = polyEvaluate(pRight, sol);
    steps.push({
      text: `Check at ${variable} = ${format(sol)}: LHS = ${format(leftCheck)}   ⟹   RHS = ${format(rightCheck)} ✓`,
      note: `Substitute ${variable} = ${format(sol)} into both original sides. They match exactly.`
    });

    return {
      type: 'unique',
      variable,
      x: sol,
      solution: sol,
      banner: `${variable} = ${format(sol)}`,
      formula: `a·${variable} + b = c   ──➜   a·${variable} = c − b   ──➜   ${variable} = (c − b) / a`,
      approx: sol.d !== 1n ? approximate(sol) : null,
      steps
    };
  }

  if (degree === 2) {
    const c = pDiff[0] || ZERO;
    const b = pDiff[1] || ZERO;
    const a = pDiff[2];

    const bSquared = multiply(b, b);
    const fourAC = multiply(fraction(4n), multiply(a, c));
    const delta = subtract(bSquared, fourAC);

    const steps = [];
    steps.push({ text: `${origLeftStr || polyToString(pLeft, variable)} = ${origRightStr || polyToString(pRight, variable)}`, note: 'Start with your equation.' });
    steps.push({ text: `${origLeftStr || polyToString(pLeft, variable)} = ${origRightStr || polyToString(pRight, variable)}   ──➜   ${polyToString(pDiff, variable)} = 0`, note: `Write in standard quadratic form: a${variable}² + b${variable} + c = 0.` });
    steps.push({ text: `a = ${format(a)},  b = ${format(b)},  c = ${format(c)}`, note: 'Identify the quadratic coefficients.' });
    steps.push({ text: `Δ = b² − 4ac = (${format(b)})² − 4(${format(a)})(${format(c)})   ──➜   Δ = ${format(delta)}`, note: 'Calculate discriminant Δ.' });

    const sqrtDelta = exactSqrtFraction(delta);

    if (delta.n > 0n) {
      if (sqrtDelta !== null) {
        const twoA = multiply(fraction(2n), a);
        const root1 = divide(add(negate(b), sqrtDelta), twoA);
        const root2 = divide(subtract(negate(b), sqrtDelta), twoA);

        steps.push({
          text: `Since Δ > 0 (${format(delta)} = (${format(sqrtDelta)})²)   ──➜   Two distinct rational roots exist`,
          note: `Apply the Quadratic Formula: ${variable} = (−b ± √Δ) / 2a.`
        });
        steps.push({
          text: `${variable} = (−(${format(b)}) ± ${format(sqrtDelta)}) ÷ (2 × ${format(a)})`,
          note: 'Substitute a, b, and √Δ into the formula.'
        });
        steps.push({
          text: `${variable}₁ = (${format(negate(b))} + ${format(sqrtDelta)}) ÷ ${format(twoA)}   ──➜   ${variable}₁ = ${format(root1)}`,
          note: 'First solution.'
        });
        steps.push({
          text: `${variable}₂ = (${format(negate(b))} − ${format(sqrtDelta)}) ÷ ${format(twoA)}   ──➜   ${variable}₂ = ${format(root2)}`,
          note: 'Second solution.'
        });
        steps.push({
          text: `Check ${variable}₁: LHS = ${format(polyEvaluate(pLeft, root1))}   ⟹   RHS = ${format(polyEvaluate(pRight, root1))} ✓`,
          note: 'Substitute the first exact root into the original equation.'
        });
        steps.push({
          text: `Check ${variable}₂: LHS = ${format(polyEvaluate(pLeft, root2))}   ⟹   RHS = ${format(polyEvaluate(pRight, root2))} ✓`,
          note: 'Substitute the second exact root into the original equation.'
        });

        return {
          type: 'quadratic_two_roots',
          variable,
          x: root1,
          solutions: [root1, root2],
          banner: `${variable} = ${format(root1)}  or  ${variable} = ${format(root2)}`,
          formula: `Quadratic Formula: ${variable} = (−b ± √(b² − 4ac)) / (2a)   |   Δ = b² − 4ac`,
          steps
        };
      } else {
        const deltaNum = Number(delta.n) / Number(delta.d);
        const sqrtVal = Math.sqrt(deltaNum);
        const twoANum = Number(multiply(fraction(2n), a).n) / Number(multiply(fraction(2n), a).d);
        const bNum = Number(b.n) / Number(b.d);
        const r1 = (-bNum + sqrtVal) / twoANum;
        const r2 = (-bNum - sqrtVal) / twoANum;

        steps.push({
          text: `Since Δ > 0 (${format(delta)})   ──➜   Two distinct real irrational roots exist`,
          note: `Apply the Quadratic Formula: ${variable} = (−b ± √Δ) / 2a.`
        });
        steps.push({
          text: `${variable} = (${format(negate(b))} ± √${format(delta)}) ÷ ${format(multiply(fraction(2n), a))}`,
          note: 'Exact radical form.'
        });
        steps.push({
          text: `${variable}₁ ≈ ${Number(r1.toPrecision(7))},  ${variable}₂ ≈ ${Number(r2.toPrecision(7))}`,
          note: 'Decimal approximations.'
        });
        const left1 = polyEvaluateNumber(pLeft, r1), right1 = polyEvaluateNumber(pRight, r1);
        const left2 = polyEvaluateNumber(pLeft, r2), right2 = polyEvaluateNumber(pRight, r2);
        steps.push({
          text: `Check ${variable}₁ ≈ ${Number(r1.toPrecision(7))}: LHS ≈ ${Number(left1.toPrecision(7))}   ⟹   RHS ≈ ${Number(right1.toPrecision(7))}`,
          note: 'The root is rounded, so the two sides agree approximately.'
        });
        steps.push({
          text: `Check ${variable}₂ ≈ ${Number(r2.toPrecision(7))}: LHS ≈ ${Number(left2.toPrecision(7))}   ⟹   RHS ≈ ${Number(right2.toPrecision(7))}`,
          note: 'The root is rounded, so the two sides agree approximately.'
        });

        return {
          type: 'quadratic_two_roots',
          variable,
          banner: `${variable} ≈ ${Number(r1.toPrecision(7))}  or  ${variable} ≈ ${Number(r2.toPrecision(7))}`,
          formula: `Quadratic Formula: ${variable} = (−b ± √(b² − 4ac)) / (2a)   |   Δ = b² − 4ac`,
          steps
        };
      }
    } else if (delta.n === 0n) {
      const root = divide(negate(b), multiply(fraction(2n), a));
      steps.push({
        text: `Since Δ = 0   ──➜   Exactly one repeated real root (double root)`,
        note: `${variable} = −b / 2a.`
      });
      steps.push({
        text: `${variable} = −(${format(b)}) ÷ (2 × ${format(a)})   ──➜   ${variable} = ${format(root)}`,
        note: 'Double root.'
      });
      steps.push({
        text: `Check at ${variable} = ${format(root)}: LHS = ${format(polyEvaluate(pLeft, root))}   ⟹   RHS = ${format(polyEvaluate(pRight, root))} ✓`,
        note: 'Substitute the repeated root into the original equation.'
      });

      return {
        type: 'quadratic_one_root',
        variable,
        x: root,
        solution: root,
        banner: `${variable} = ${format(root)} (double root)`,
        formula: `Double Root Formula: ${variable} = −b / (2a)   (when Δ = 0)`,
        steps
      };
    } else {
      const absDelta = fraction(-delta.n, delta.d);
      const sqrtAbs = exactSqrtFraction(absDelta);
      const twoA = multiply(fraction(2n), a);
      const realPart = divide(negate(b), twoA);

      steps.push({
        text: `Since Δ < 0 (${format(delta)})   ──➜   Two complex conjugate roots (using i² = −1)`,
        note: 'Use imaginary unit i where i² = −1.'
      });
      steps.push({
        text: `Reality check: Δ = ${format(delta)} < 0   ⟹   No real-number roots ✓`,
        note: 'The complex conjugate roots shown below are the solutions when complex numbers are allowed.'
      });
      if (sqrtAbs !== null) {
        const imagPart = divide(sqrtAbs, twoA);
        steps.push({
          text: `${variable} = ${format(realPart)} ± ${format(imagPart)}i`,
          note: 'Complex solutions in a ± bi form.'
        });
        return {
          type: 'quadratic_complex',
          variable,
          banner: `${variable} = ${format(realPart)} ± ${format(imagPart)}i`,
          formula: `Complex Roots: ${variable} = (−b ± i√|Δ|) / (2a)   (when Δ < 0)`,
          steps
        };
      } else {
        steps.push({
          text: `${variable} = (${format(negate(b))} ± i√${format(absDelta)}) ÷ ${format(twoA)}`,
          note: 'Complex solutions in radical form.'
        });
        return {
          type: 'quadratic_complex',
          variable,
          banner: `${variable} = (${format(negate(b))} ± i√${format(absDelta)}) / ${format(twoA)}`,
          formula: `Complex Roots: ${variable} = (−b ± i√|Δ|) / (2a)   (when Δ < 0)`,
          steps
        };
      }
    }
  }

  throw new Error(`Polynomials of degree ${degree} are not currently supported.`);
}

export function solveAlgebra(rawInput, forcedVar = null) {
  let s = String(rawInput || '').trim();
  if (!s) throw new Error('Please enter an equation or algebra question.');

  // Clean conversational prefixes
  let cleaned = s.replace(/^(?:solve(?:\s+for\s+([a-zA-Z]))?[:\s]*|find\s+([a-zA-Z])\s+(?:in|when|if)?[:\s]*|what\s+is\s+([a-zA-Z])\s+(?:when|if|in)?[:\s]*|calculate[:\s]*|evaluate[:\s]*)/i, (m, g1, g2, g3) => {
    if (!forcedVar) forcedVar = (g1 || g2 || g3 || '').toLowerCase() || null;
    return '';
  }).trim();

  // Strip trailing question marks and periods
  cleaned = cleaned.replace(/[?.!]+$/, '').trim();

  // If there's an equals sign, treat as equation
  if (cleaned.includes('=')) {
    const parts = cleaned.split('=');
    if (parts.length !== 2) throw new Error('Equations must have exactly one equals (=) sign.');
    const leftStr = parts[0].trim();
    const rightStr = parts[1].trim();
    if (!leftStr || !rightStr) throw new Error('Please provide expressions on both sides of the equals sign.');

    const tLeft = tokenize(leftStr);
    const tRight = tokenize(rightStr);
    const allVars = [...tLeft, ...tRight].filter(t => t.type === 'VAR').map(t => t.val);
    const uniqueVars = [...new Set(allVars)];

    const targetVar = forcedVar || uniqueVars[0] || 'x';
    const pLeft = parseExpression(tLeft, targetVar).poly;
    const pRight = parseExpression(tRight, targetVar).poly;

    return solvePolynomialEquation(pLeft, pRight, targetVar, leftStr, rightStr);
  }

  // If no equals sign, check if it's an expression to simplify
  try {
    const tokens = tokenize(cleaned);
    const allVars = tokens.filter(t => t.type === 'VAR').map(t => t.val);
    const targetVar = forcedVar || allVars[0] || 'x';
    const p = parseExpression(tokens, targetVar).poly;
    const simplifiedStr = polyToString(p, targetVar);

    return {
      type: 'expression',
      variable: targetVar,
      simplified: simplifiedStr,
      banner: `Simplified: ${simplifiedStr}`,
      formula: `Distributive Law: a(b + c) = ab + ac   |   Combine like terms`,
      steps: [
        { text: `Expression: ${cleaned}`, note: 'Start with your expression.' },
        { text: `${cleaned}   ──➜   ${simplifiedStr} ✓`, note: 'Expand parentheses and combine like terms.' }
      ]
    };
  } catch (err) {
    // If it could not be parsed as a pure expression, check if it looks like a natural language question
    return {
      type: 'ai_question',
      isQuestion: true,
      query: rawInput
    };
  }
}

export function solve(aRaw, bRaw, cRaw, variable) {
  if (bRaw === undefined && cRaw === undefined) {
    return solveAlgebra(aRaw, variable);
  }
  const varName = variable || 'x';
  const a = parseNumber(aRaw), b = parseNumber(bRaw), c = parseNumber(cRaw);
  const diff = subtract(c, b);
  if (a.n === 0n) {
    const type = diff.n === 0n ? 'infinite' : 'none';
    return {
      type,
      variable: varName,
      a, b, c,
      difference: diff,
      banner: type === 'infinite' ? 'Infinitely many solutions' : 'No solution',
      formula: type === 'infinite'
        ? `0·${varName} = 0   ──➜   Identity (holds true for all real numbers)`
        : `0·${varName} = ${format(diff)} (≠ 0)   ──➜   Contradiction (no solution exists)`,
      steps: type === 'infinite'
        ? [
            { text: `${format(b)} = ${format(c)}   ──➜   0 = 0 ✓`, note: `Since the coefficient of ${varName} is zero, the variable term disappears. Both sides are equal.` }
          ]
        : [
            { text: `${format(b)} ≠ ${format(c)}   ──➜   Contradiction! ✗`, note: `Since the coefficient of ${varName} is zero, the variable term disappears. The remaining statement is false.` }
          ]
    };
  }
  const sol = divide(diff, a);
  return {
    type: 'unique',
    variable: varName,
    a, b, c,
    difference: diff,
    x: sol,
    solution: sol,
    banner: `${varName} = ${format(sol)}`,
    formula: `a·${varName} + b = c   ──➜   a·${varName} = c − b   ──➜   ${varName} = (c − b) / a`,
    approx: sol.d !== 1n ? approximate(sol) : null,
    steps: [
      { text: `${format(a)}${varName} + (${format(b)}) = ${format(c)}`, note: 'Start with your equation.' },
      { text: `${format(a)}${varName} + (${format(b)}) = ${format(c)}   ──➜   ${format(a)}${varName} = ${format(c)} − (${format(b)}) = ${format(diff)}`, note: `Subtract ${format(b)} from both sides.` },
      { text: `${format(a)}${varName} = ${format(diff)}   ──➜   ${varName} = (${format(diff)}) ÷ (${format(a)})   ⟹   ${varName} = ${format(sol)}`, note: `Divide both sides by ${format(a)}.` },
      { text: `Check at ${varName} = ${format(sol)}: ${format(a)} × (${format(sol)}) + (${format(b)}) = ${format(add(multiply(a, sol), b))}   ⟹   ${format(add(multiply(a, sol), b))} = ${format(c)} ✓`, note: `Substitute ${varName} into the original equation; both sides match exactly.` }
    ]
  };
}
