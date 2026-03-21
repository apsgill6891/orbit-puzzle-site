const directions = ['up', 'right', 'down', 'left'];
const cycleOrder = ['empty', ...directions, 'note'];
const arrowByDirection = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
};
const deltas = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
};

const puzzles = [
  {
    id: 'crosswind',
    name: 'Crosswind',
    size: 5,
    solution: [
      { col: 2, dir: 'down' },
      { col: 0, dir: 'right' },
      { col: 3, dir: 'up' },
      { col: 1, dir: 'right' },
      { col: 4, dir: 'left' },
    ],
    clouds: [
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 2],
      [3, 2],
      [4, 0],
      [4, 2],
    ],
    solutionCount: 2,
  },
  {
    id: 'switchback',
    name: 'Switchback',
    size: 5,
    solution: [
      { col: 3, dir: 'left' },
      { col: 1, dir: 'down' },
      { col: 4, dir: 'left' },
      { col: 2, dir: 'up' },
      { col: 0, dir: 'right' },
    ],
    clouds: [
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 1],
      [2, 2],
      [2, 3],
      [4, 3],
    ],
    solutionCount: 4,
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    size: 5,
    solution: [
      { col: 4, dir: 'left' },
      { col: 1, dir: 'down' },
      { col: 3, dir: 'left' },
      { col: 0, dir: 'up' },
      { col: 2, dir: 'right' },
    ],
    clouds: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [2, 0],
      [2, 1],
      [4, 3],
    ],
    solutionCount: 4,
  },
];

const board = document.querySelector('#board');
const rowTargets = document.querySelector('#row-targets');
const columnTargets = document.querySelector('#column-targets');
const themeSelect = document.querySelector('#theme-select');
const puzzleSelect = document.querySelector('#puzzle-select');
const statusPill = document.querySelector('#status-pill');
const solutionNote = document.querySelector('#solution-note');
const resetBtn = document.querySelector('#reset-btn');
const hintBtn = document.querySelector('#hint-btn');
const checkBtn = document.querySelector('#check-btn');
const solveBtn = document.querySelector('#solve-btn');

const themeStorageKey = 'kites-theme';

let activePuzzle = puzzles[0];
let cellStates = [];
let hintCells = new Set();

function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  themeSelect.value = nextTheme;
  localStorage.setItem(themeStorageKey, nextTheme);
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(themeStorageKey);
  applyTheme(storedTheme || 'dark');
}

function computeTrailCounts(solution, size) {
  const counts = Array.from({ length: size }, () => Array(size).fill(0));
  const kiteMap = new Map(solution.map((kite, row) => [`${row},${kite.col}`, kite.dir]));

  solution.forEach((kite, row) => {
    const [dr, dc] = deltas[kite.dir];
    let currentRow = row + dr;
    let currentCol = kite.col + dc;

    while (
      currentRow >= 0 &&
      currentRow < size &&
      currentCol >= 0 &&
      currentCol < size &&
      !kiteMap.has(`${currentRow},${currentCol}`)
    ) {
      counts[currentRow][currentCol] += 1;
      currentRow += dr;
      currentCol += dc;
    }
  });

  return counts;
}

puzzles.forEach((puzzle) => {
  const trailCounts = computeTrailCounts(puzzle.solution, puzzle.size);
  puzzle.cloudClues = puzzle.clouds.map(([row, col]) => ({ row, col, count: trailCounts[row][col] }));
});

function buildSelector() {
  puzzleSelect.innerHTML = puzzles
    .map((puzzle) => `<option value="${puzzle.id}">${puzzle.name}</option>`)
    .join('');
}

function renderSolutionNote() {
  const count = activePuzzle.solutionCount;
  solutionNote.textContent =
    count === 1
      ? 'This puzzle has one known valid solution.'
      : `This puzzle currently has ${count} valid solutions. Any of them counts.`;
}

function setStatus(message, tone = '') {
  statusPill.textContent = message;
  statusPill.className = 'status-pill';
  if (tone) {
    statusPill.classList.add(tone);
  }
}

function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 'empty'));
}

function getCloudMap(puzzle) {
  return new Map(puzzle.cloudClues.map((cloud) => [`${cloud.row},${cloud.col}`, cloud.count]));
}

function getPlacedKites() {
  const placed = [];
  for (let row = 0; row < activePuzzle.size; row += 1) {
    for (let col = 0; col < activePuzzle.size; col += 1) {
      const value = cellStates[row][col];
      if (directions.includes(value)) {
        placed.push({ row, col, dir: value });
      }
    }
  }
  return placed;
}

function computeCurrentTrails() {
  const placed = getPlacedKites();
  const counts = Array.from({ length: activePuzzle.size }, () => Array(activePuzzle.size).fill(0));
  const kiteMap = new Map(placed.map((kite) => [`${kite.row},${kite.col}`, kite.dir]));

  placed.forEach((kite) => {
    const [dr, dc] = deltas[kite.dir];
    let currentRow = kite.row + dr;
    let currentCol = kite.col + dc;

    while (
      currentRow >= 0 &&
      currentRow < activePuzzle.size &&
      currentCol >= 0 &&
      currentCol < activePuzzle.size &&
      !kiteMap.has(`${currentRow},${currentCol}`)
    ) {
      counts[currentRow][currentCol] += 1;
      currentRow += dr;
      currentCol += dc;
    }
  });

  return counts;
}

function renderTargets(report) {
  rowTargets.style.setProperty('--size', activePuzzle.size);
  columnTargets.style.setProperty('--size', activePuzzle.size);
  rowTargets.innerHTML = '';
  columnTargets.innerHTML = '';

  report.rowCounts.forEach((count) => {
    const chip = document.createElement('div');
    chip.className = 'target-chip';
    chip.innerHTML = `<span><strong>${count}</strong>/1</span>`;
    if (count === 1) {
      chip.classList.add('good');
    } else if (count > 1) {
      chip.classList.add('warn');
    }
    rowTargets.appendChild(chip);
  });

  report.colCounts.forEach((count) => {
    const chip = document.createElement('div');
    chip.className = 'target-chip';
    chip.innerHTML = `<span><strong>${count}</strong>/1</span>`;
    if (count === 1) {
      chip.classList.add('good');
    } else if (count > 1) {
      chip.classList.add('warn');
    }
    columnTargets.appendChild(chip);
  });
}

function renderBoard() {
  board.style.setProperty('--size', activePuzzle.size);
  board.innerHTML = '';
  const cloudMap = getCloudMap(activePuzzle);
  const currentTrails = computeCurrentTrails();
  const report = evaluateBoard();
  renderTargets(report);

  for (let row = 0; row < activePuzzle.size; row += 1) {
    for (let col = 0; col < activePuzzle.size; col += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${row + 1} column ${col + 1}`);

      const key = `${row},${col}`;
      const cloudCount = cloudMap.get(key);
      const trailCount = currentTrails[row][col];

      if (cloudMap.has(key)) {
        cell.classList.add('cloud');
        cell.textContent = cloudCount;
        const now = document.createElement('span');
        now.className = 'cloud-now';
        now.textContent = `now ${trailCount}`;
        cell.appendChild(now);
        cell.disabled = true;
      } else {
        const value = cellStates[row][col];
        if (directions.includes(value)) {
          cell.classList.add('kite');
          cell.textContent = arrowByDirection[value];
        } else if (value === 'note') {
          cell.classList.add('note');
          cell.textContent = '•';
        }

        if (trailCount > 0) {
          cell.classList.add('trail');
          const countBadge = document.createElement('span');
          countBadge.className = 'trail-count';
          countBadge.textContent = trailCount;
          cell.appendChild(countBadge);
        }

        if (hintCells.has(key)) {
          cell.classList.add('hint');
        }

        cell.addEventListener('click', () => cycleCell(row, col));
      }

      board.appendChild(cell);
    }
  }
}

function resetBoard() {
  cellStates = createEmptyBoard(activePuzzle.size);
  hintCells = new Set();
  setStatus('Find a valid wind pattern.');
  renderSolutionNote();
  renderBoard();
}

function cycleCell(row, col) {
  const currentIndex = cycleOrder.indexOf(cellStates[row][col]);
  cellStates[row][col] = cycleOrder[(currentIndex + 1) % cycleOrder.length];
  hintCells.delete(`${row},${col}`);
  renderBoard();

  if (evaluateBoard().isSolved) {
    setStatus('Perfect flight path! You solved it.', 'good');
  }
}

function evaluateBoard() {
  const placed = getPlacedKites();
  const rowCounts = Array.from({ length: activePuzzle.size }, () => 0);
  const colCounts = Array.from({ length: activePuzzle.size }, () => 0);

  placed.forEach((kite) => {
    rowCounts[kite.row] += 1;
    colCounts[kite.col] += 1;
  });

  const currentTrails = computeCurrentTrails();
  const cloudProblems = activePuzzle.cloudClues.filter(
    (cloud) => currentTrails[cloud.row][cloud.col] !== cloud.count
  );

  const isSolved =
    placed.length === activePuzzle.size &&
    rowCounts.every((count) => count === 1) &&
    colCounts.every((count) => count === 1) &&
    cloudProblems.length === 0;

  return {
    placed,
    rowCounts,
    colCounts,
    cloudProblems,
    isSolved,
  };
}

function checkBoard() {
  const report = evaluateBoard();

  if (report.isSolved) {
    setStatus('Perfect flight path! You solved it.', 'good');
    return;
  }

  if (report.rowCounts.some((count) => count > 1)) {
    setStatus('At least one row has too many kites.', 'warn');
    return;
  }

  if (report.colCounts.some((count) => count > 1)) {
    setStatus('At least one column has too many kites.', 'warn');
    return;
  }

  if (report.cloudProblems.length) {
    setStatus('A cloud clue does not match the current gusts.', 'warn');
    return;
  }

  if (report.placed.length < activePuzzle.size) {
    setStatus('You still need to place more kites.', 'warn');
    return;
  }

  setStatus('Keep refining the wind pattern.', 'bad');
}


function showHint() {
  const report = evaluateBoard();
  if (report.isSolved) {
    setStatus('Already solved — switch to another puzzle.', 'good');
    return;
  }

  for (let row = 0; row < activePuzzle.size; row += 1) {
    const correct = activePuzzle.solution[row];
    const current = cellStates[row][correct.col];

    if (current !== correct.dir) {
      cellStates[row][correct.col] = correct.dir;
      hintCells = new Set([`${row},${correct.col}`]);
      renderBoard();
      setStatus(
        `Hint: row ${row + 1} hides a ${arrowByDirection[correct.dir]} kite in column ${correct.col + 1}.`,
        'good'
      );
      return;
    }
  }

  setStatus('Every correct kite is already visible.', 'good');
}

function revealSolution() {
  cellStates = createEmptyBoard(activePuzzle.size);
  activePuzzle.solution.forEach((kite, row) => {
    cellStates[row][kite.col] = kite.dir;
  });
  hintCells = new Set();
  renderBoard();
  setStatus('Solution revealed. Try a new breeze next.', 'warn');
}

function selectPuzzle(id) {
  activePuzzle = puzzles.find((puzzle) => puzzle.id === id) || puzzles[0];
  resetBoard();
}

buildSelector();
initializeTheme();
puzzleSelect.value = activePuzzle.id;
themeSelect.addEventListener('change', (event) => applyTheme(event.target.value));
puzzleSelect.addEventListener('change', (event) => selectPuzzle(event.target.value));
resetBtn.addEventListener('click', resetBoard);
hintBtn.addEventListener('click', showHint);
checkBtn.addEventListener('click', checkBoard);
solveBtn.addEventListener('click', revealSolution);
resetBoard();
