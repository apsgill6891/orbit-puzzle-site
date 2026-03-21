const size = 5;
const directionsPerKite = 4;
const clueSlots = size * size - size;

function factorial(n) {
  let total = 1;
  for (let value = 2; value <= n; value += 1) {
    total *= value;
  }
  return total;
}

function choose(n, k) {
  if (k < 0 || k > n) {
    return 0;
  }

  const r = Math.min(k, n - k);
  let numerator = 1;
  let denominator = 1;

  for (let step = 1; step <= r; step += 1) {
    numerator *= n - r + step;
    denominator *= step;
  }

  return numerator / denominator;
}

const totalLayouts = factorial(size) * directionsPerKite ** size;

console.log(`Kites ${size}x${size} analysis`);
console.log(`- complete answer boards: ${totalLayouts.toLocaleString()}`);
console.log(`- clue-eligible cells per board: ${clueSlots}`);
console.log(`- all possible clue masks per board: ${(2 ** clueSlots).toLocaleString()}`);
console.log(
  `- raw authored puzzle upper bound: ${(totalLayouts * 2 ** clueSlots).toLocaleString()}`
);
console.log('');
console.log('By exact clue count:');

for (let clueCount = 1; clueCount <= clueSlots; clueCount += 1) {
  const masksPerLayout = choose(clueSlots, clueCount);
  const rawPuzzles = totalLayouts * masksPerLayout;
  const dayRunwayYears = rawPuzzles / 365;
  console.log(
    `${String(clueCount).padStart(2, ' ')} clues -> ${rawPuzzles
      .toLocaleString()
      .padStart(15, ' ')} raw puzzles (${Math.floor(dayRunwayYears).toLocaleString()} years at 1/day)`
  );
}

console.log('');
console.log('Suggested production buckets (before uniqueness filtering):');

const buckets = [
  { label: 'easy', range: [8, 10] },
  { label: 'medium', range: [6, 7] },
  { label: 'hard', range: [4, 5] },
];

for (const bucket of buckets) {
  const raw = Array.from({ length: bucket.range[1] - bucket.range[0] + 1 }, (_, index) => bucket.range[0] + index)
    .reduce((sum, clueCount) => sum + totalLayouts * choose(clueSlots, clueCount), 0);
  console.log(
    `- ${bucket.label}: ${raw.toLocaleString()} raw puzzles across ${bucket.range[0]}-${bucket.range[1]} clues`
  );
}

console.log('');
console.log('Important: these are raw authored counts only.');
console.log('- In production, keep only puzzles that pass your solver for validity.');
console.log('- If you require uniqueness, filter to exactly one solution.');
console.log('- If you allow multiple solutions, the checker must validate rules, not a hidden authored board.');
