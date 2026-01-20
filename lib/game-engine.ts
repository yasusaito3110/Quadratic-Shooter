export type Fraction = {
  num: number;
  den: number;
};

export type Problem = {
  a: string;
  p: string;
  q: string;
  b: string;
  c: string;
  displayA: string;
  displayB: string;
  displayC: string;
};

function gcd(a: number, b: number): number {
  a = Math.trunc(Math.abs(a));
  b = Math.trunc(Math.abs(b));
  return b === 0 ? a : gcd(b, a % b);
}

export function reduceFrac(n: number, d: number): [number, number] {
  if (d === 0) return [NaN, 0];
  if (n === 0) return [0, 1];
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return [n / g, d / g];
}

export function formatFraction(n: number, d: number): string {
  const [nn, dd] = reduceFrac(n, d);
  if (!isFinite(nn) || dd === 0) return "NaN";
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickNonZeroInt(min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(min, max);
  return v;
}

function pickOddNonZero(minOdd: number, maxOdd: number): number {
  let v = 0;
  while (v === 0 || v % 2 === 0) v = randInt(minOdd, maxOdd);
  return v;
}

export function generateProblem(gameMode: string): Problem {
  let a: [number, number] = [1, 1];
  let p: [number, number] = [0, 1];
  let q: [number, number] = [0, 1];

  if (gameMode === 'easy') {
    a = [1, 1];
    p = [pickNonZeroInt(-4, 4), 1];
    q = [randInt(-6, 6), 1];
  } else if (gameMode === 'normal') {
    a = [1, 1];
    p = [pickOddNonZero(-7, 7), 2];
    q = [randInt(-6, 6), 1];
  } else if (gameMode === 'hard') {
    a = [randInt(2, 3), 1];
    p = [pickOddNonZero(-7, 7), 2];
    q = [randInt(-7, 7), 1];
  }

  const aFrac = a;
  const pFrac = p;
  const qFrac = q;

  // b = 2 * a * p
  const bNum = 2 * aFrac[0] * pFrac[0];
  const bDen = aFrac[1] * pFrac[1];
  const [bn, bd] = reduceFrac(bNum, bDen);

  // c = a * p^2 + q
  // a * (pNum^2 / pDen^2) + qNum / qDen
  const pSqNum = pFrac[0] * pFrac[0];
  const pSqDen = pFrac[1] * pFrac[1];
  const apSqNum = aFrac[0] * pSqNum;
  const apSqDen = aFrac[1] * pSqDen;

  const cNum = apSqNum * qFrac[1] + qFrac[0] * apSqDen;
  const cDen = apSqDen * qFrac[1];
  const [cn, cd] = reduceFrac(cNum, cDen);

  return {
    a: formatFraction(aFrac[0], aFrac[1]),
    p: formatFraction(pFrac[0], pFrac[1]),
    q: formatFraction(qFrac[0], qFrac[1]),
    b: formatFraction(bn, bd),
    c: formatFraction(cn, cd),
    displayA: formatFraction(aFrac[0], aFrac[1]),
    displayB: formatFraction(bn, bd),
    displayC: formatFraction(cn, cd),
  };
}
