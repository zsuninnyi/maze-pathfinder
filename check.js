export const MAZES = [
  {
    id: "shortcut",
    name: "Shortcut",
    blurb: "The finish is on the first corridor. A basement hangs off the start.",
    rows: [
      "###########",
      "#S.......E#",
      "#.#########",
      "#.#.......#",
      "#.#######.#",
      "#.........#",
      "###########",
    ],
  },
  {
    id: "room",
    name: "Open room",
    blurb: "Open floor with a short way around a block.",
    rows: [
      "###########",
      "#S........#",
      "#.........#",
      "#...###...#",
      "#......E..#",
      "#.........#",
      "###########",
    ],
  },
  {
    id: "forks",
    name: "Forks",
    blurb: "Passages split. Some of them dead-end.",
    rows: [
      "###########",
      "#S..#.....#",
      "#.#.#.###.#",
      "#.#...#...#",
      "#.###.#.#E#",
      "#.....#.#.#",
      "###########",
    ],
  },
  {
    id: "sealed",
    name: "Sealed",
    blurb: "Walls separate the start from the finish.",
    rows: [
      "#########",
      "#S#.....#",
      "###....E#",
      "#.......#",
      "#########",
    ],
  },
];

export function ends(rows) {
  let start = null;
  let goal = null;
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === "S") start = { r, c };
      if (ch === "E") goal = { r, c };
    });
  });
  if (!start || !goal) {
    throw new Error("Every maze needs an S and an E.");
  }
  return { start, goal };
}

function same(a, b) {
  return a.r === b.r && a.c === b.c;
}

function key(cell) {
  return `${cell.r},${cell.c}`;
}

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function referencePath(rows, start, goal) {
  const height = rows.length;
  const width = rows[0].length;
  const queue = [start];
  const visited = new Set([key(start)]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    if (same(current, goal)) {
      const path = [goal];
      let cursor = key(goal);
      while (parent.has(cursor)) {
        const previous = parent.get(cursor);
        path.push(previous);
        cursor = key(previous);
      }
      path.reverse();
      return path;
    }
    for (const [dr, dc] of DIRS) {
      const next = { r: current.r + dr, c: current.c + dc };
      if (next.r < 0 || next.c < 0 || next.r >= height || next.c >= width) continue;
      if (rows[next.r][next.c] === "#") continue;
      const id = key(next);
      if (visited.has(id)) continue;
      visited.add(id);
      parent.set(id, current);
      queue.push(next);
    }
  }
  return null;
}

function cellAt(path, index) {
  const cell = path[index];
  if (!cell || typeof cell !== "object") return null;
  const r = Number(cell.r);
  const c = Number(cell.c);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
  return { r, c };
}

export function judge(rows, start, goal, path) {
  const shortest = referencePath(rows, start, goal);
  const best = shortest ? shortest.length - 1 : null;

  if (path == null) {
    if (shortest == null) {
      return {
        status: "pass",
        title: "Correct",
        detail: "No route exists, and the function returned null.",
        moves: null,
        best,
        fault: null,
      };
    }
    return {
      status: "fail",
      title: "No path returned",
      detail: `A route of ${best} ${best === 1 ? "move" : "moves"} exists.`,
      moves: null,
      best,
      fault: null,
    };
  }

  if (!Array.isArray(path)) {
    return {
      status: "fail",
      title: "Wrong return type",
      detail: "Return an array of { r, c } cells, or null.",
      moves: null,
      best,
      fault: null,
    };
  }

  const cells = [];
  for (let i = 0; i < path.length; i++) {
    const cell = cellAt(path, i);
    if (!cell) {
      return {
        status: "fail",
        title: "Bad cell",
        detail: `Entry ${i} is not { r, c }.`,
        moves: null,
        best,
        fault: null,
      };
    }
    cells.push(cell);
  }

  if (cells.length === 0) {
    return {
      status: "fail",
      title: "Empty path",
      detail: "Return null when the finish is unreachable. An empty array is not a path.",
      moves: null,
      best,
      fault: null,
    };
  }

  if (!same(cells[0], start)) {
    return {
      status: "fail",
      title: "Does not start on S",
      detail: `The first cell is row ${cells[0].r}, col ${cells[0].c}.`,
      moves: null,
      best,
      fault: cells[0],
    };
  }

  const last = cells[cells.length - 1];
  if (!same(last, goal)) {
    return {
      status: "fail",
      title: "Does not end on E",
      detail: `The last cell is row ${last.r}, col ${last.c}.`,
      moves: cells.length - 1,
      best,
      fault: last,
    };
  }

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.r < 0 || cell.c < 0 || cell.r >= rows.length || cell.c >= rows[0].length) {
      return {
        status: "fail",
        title: "Leaves the maze",
        detail: `Cell ${i} is row ${cell.r}, col ${cell.c}.`,
        moves: null,
        best,
        fault: cell,
      };
    }
    if (rows[cell.r][cell.c] === "#") {
      return {
        status: "fail",
        title: "Steps on a wall",
        detail: `Cell ${i} is row ${cell.r}, col ${cell.c}.`,
        moves: null,
        best,
        fault: cell,
      };
    }
    if (i > 0) {
      const prev = cells[i - 1];
      const dr = Math.abs(prev.r - cell.r);
      const dc = Math.abs(prev.c - cell.c);
      if (dr + dc !== 1) {
        return {
          status: "fail",
          title: "Illegal step",
          detail: `From row ${prev.r}, col ${prev.c} to row ${cell.r}, col ${cell.c}. Move one square up, down, left, or right.`,
          moves: null,
          best,
          fault: cell,
        };
      }
    }
  }

  const moves = cells.length - 1;
  if (shortest == null) {
    return {
      status: "fail",
      title: "Path where none exists",
      detail: "Walls separate S from E.",
      moves,
      best,
      fault: null,
    };
  }
  if (moves > best) {
    return {
      status: "long",
      title: "Reaches E, not shortest",
      detail: `${moves} moves. The shortest route is ${best}.`,
      moves,
      best,
      fault: null,
    };
  }
  if (moves < best) {
    return {
      status: "fail",
      title: "Shorter than possible",
      detail: "A step is being skipped. Adjacent cells only.",
      moves,
      best,
      fault: null,
    };
  }
  return {
    status: "pass",
    title: "Shortest path",
    detail: `${moves} ${moves === 1 ? "move" : "moves"}.`,
    moves,
    best,
    fault: null,
  };
}
