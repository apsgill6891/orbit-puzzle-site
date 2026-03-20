const puzzles = [
  {
    id: 'starter',
    name: 'Starter Orbit',
    size: 5,
    solution: [0, 2, 4, 1, 3],
    planets: [
      [0, 1],
      [1, 4],
      [2, 2],
      [3, 4],
      [4, 0],
      [4, 2],
    ],
  },
  {
    id: 'breeze',
    name: 'Morning Breeze',
    size: 5,
    solution: [1, 4, 2, 0, 3],
    planets: [
      [0, 3],
      [1, 0],
      [2, 4],
      [3, 2],
      [4, 1],
      [2, 1],
    ],
  },
  {
    id: 'twirl',
    name: 'Gentle Twirl',
    size: 5,
    solution: [2, 0, 3, 1, 4],
    planets: [
      [0, 0],
      [1, 2],
      [2, 4],
      [3, 3],
      [4, 1],
      [2, 1],
    ],
  },
];

const board = document.querySelector('#board');
const puzzleSelect = document.querySelector('#puzzle-select');
const statusPill = document.querySelector('#status-pill');
const resetBtn = document.querySelector('#reset-btn');
const hintBtn = document.querySelector('#hint-btn');
const checkBtn = document.querySelector('#check-btn');
const solveBtn = document.querySelector('#solve-btn');

let activePuzzle = puzzles[0];
let cellStates = [];
let hintCells = new Set();

function computePlanetClues(puzzle) {
  const satellites = puzzle.solution.map((col, row) => `${row},${col}`);
  const satelliteSet = new Set(satellites);

  return puzzle.planets.map(([row, col]) => {
    let count = 0;

    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) {
          continue;
        }

        const key = `${row + dr},${col + dc}`;
        if (satelliteSet.has(key)) {
          count += 1;
        }
      }
    }

    return { row, col, count };
  });
}

puzzles.forEach((puzzle) => {
  puzzle.planetClues = computePlanetClues(puzzle);
});

function buildSelector() {
  puzzleSelect.innerHTML = puzzles
    .map((puzzle) => `<option value="${puzzle.id}">${puzzle.name}</option>`)
    .join('');
}

function getPlanetMap(puzzle) {
  return new Map(puzzle.planetClues.map((planet) => [`${planet.row},${planet.col}`, planet.count]));
}


function resetBoard() {
  cellStates = Array.from({ length: activePuzzle.size }, () =>
    Array.from({ length: activePuzzle.size }, () => 'empty')
  );
  hintCells = new Set();
  setStatus('Find the unique orbit.', '');
  renderBoard();
}

function renderBoard() {
  board.style.setProperty('--size', activePuzzle.size);
  board.innerHTML = '';
  const planetMap = getPlanetMap(activePuzzle);

  for (let row = 0; row < activePuzzle.size; row += 1) {
    for (let col = 0; col < activePuzzle.size; col += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${row + 1} column ${col + 1}`);

      const planetKey = `${row},${col}`;
      if (planetMap.has(planetKey)) {
        cell.classList.add('planet');
        cell.textContent = planetMap.get(planetKey);
        cell.disabled = true;
      } else {
        const value = cellStates[row][col];
        if (value === 'satellite') {
          cell.classList.add('satellite');
          cell.textContent = '✦';
        } else if (value === 'note') {
          cell.classList.add('note');
          cell.textContent = '•';
        } else {
          cell.textContent = '';
        }

        if (hintCells.has(planetKey)) {
          cell.classList.add('hint');
        }

        cell.addEventListener('click', () => cycleCell(row, col));
      }

      board.appendChild(cell);
    }
  }
}

function cycleCell(row, col) {
  const current = cellStates[row][col];
  cellStates[row][col] = current === 'empty' ? 'satellite' : current === 'satellite' ? 'note' : 'empty';
  hintCells.delete(`${row},${col}`);
  renderBoard();
}

function setStatus(message, tone) {
  statusPill.textContent = message;
  statusPill.className = 'status-pill';
  if (tone) {
    statusPill.classList.add(tone);
  }
}

function getSatellitePositions() {
  const positions = [];
  for (let row = 0; row < activePuzzle.size; row += 1) {
    for (let col = 0; col < activePuzzle.size; col += 1) {
      if (cellStates[row][col] === 'satellite') {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

function evaluateBoard() {
  const satellites = getSatellitePositions();
  const size = activePuzzle.size;

  const rowCounts = Array.from({ length: size }, () => 0);
  const colCounts = Array.from({ length: size }, () => 0);

  satellites.forEach(({ row, col }) => {
    rowCounts[row] += 1;
    colCounts[col] += 1;
  });

  const badRows = rowCounts.filter((count) => count > 1).length;
  const badCols = colCounts.filter((count) => count > 1).length;

  let touchingPairs = 0;
  satellites.forEach((a, index) => {
    satellites.slice(index + 1).forEach((b) => {
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        touchingPairs += 1;
      }
    });
  });

  const planetProblems = activePuzzle.planetClues.filter((planet) => {
    let count = 0;
    satellites.forEach((satellite) => {
      if (
        Math.abs(satellite.row - planet.row) <= 1 &&
        Math.abs(satellite.col - planet.col) <= 1 &&
        !(satellite.row === planet.row && satellite.col === planet.col)
      ) {
        count += 1;
      }
    });
    return count !== planet.count;
  });

  const isSolved =
    satellites.length === size &&
    rowCounts.every((count) => count === 1) &&
    colCounts.every((count) => count === 1) &&
    touchingPairs === 0 &&
    planetProblems.length === 0;

  return {
    isSolved,
    satellites,
    rowCounts,
    colCounts,
    badRows,
    badCols,
    touchingPairs,
    planetProblems,
  };
}

function checkBoard() {
  const report = evaluateBoard();

  if (report.isSolved) {
    setStatus('Perfect orbit! You solved it.', 'good');
    return;
  }

  const hints = [];

  if (report.badRows) {
    hints.push('A row has too many satellites.');
  }
  if (report.badCols) {
    hints.push('A column has too many satellites.');
  }
  if (report.touchingPairs) {
    hints.push('Two satellites are touching.');
  }
  if (report.planetProblems.length) {
    hints.push('At least one planet clue is off.');
  }
  if (report.satellites.length < activePuzzle.size) {
    hints.push('You still need more satellites.');
  }

  setStatus(hints[0] || 'Keep going — the orbit is close.', 'warn');
}

function showHint() {
  const report = evaluateBoard();
  if (report.isSolved) {
    setStatus('Already solved — try another puzzle.', 'good');
    return;
  }

  for (let row = 0; row < activePuzzle.size; row += 1) {
    const solutionCol = activePuzzle.solution[row];
    const current = cellStates[row][solutionCol];

    if (current !== 'satellite') {
      cellStates[row][solutionCol] = 'satellite';
      hintCells = new Set([`${row},${solutionCol}`]);
      renderBoard();
      setStatus(`Hint: row ${row + 1} needs a satellite in column ${solutionCol + 1}.`, 'good');
      return;
    }
  }

  setStatus('All solution satellites are already placed.', 'good');
}

function revealSolution() {
  cellStates = Array.from({ length: activePuzzle.size }, (_, row) =>
    Array.from({ length: activePuzzle.size }, (_, col) =>
      activePuzzle.solution[row] === col ? 'satellite' : 'empty'
    )
  );
  hintCells = new Set();
  renderBoard();
  setStatus('Solution revealed. Try solving the next one from scratch!', 'warn');
}

function selectPuzzle(id) {
  activePuzzle = puzzles.find((puzzle) => puzzle.id === id) || puzzles[0];
  resetBoard();
}

buildSelector();
puzzleSelect.value = activePuzzle.id;
puzzleSelect.addEventListener('change', (event) => selectPuzzle(event.target.value));
resetBtn.addEventListener('click', resetBoard);
hintBtn.addEventListener('click', showHint);
checkBtn.addEventListener('click', checkBoard);
solveBtn.addEventListener('click', revealSolution);
resetBoard();
