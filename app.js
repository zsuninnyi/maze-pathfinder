import { MAZES, ends, judge } from "./check.js";

const CASES = MAZES.map((maze) => {
  const { start, goal } = ends(maze.rows);
  return { ...maze, start, goal };
});

const statusEl = document.querySelector("#status");
const mazeEl = document.querySelector("#maze");
const captionEl = document.querySelector("#caption");
const counterEl = document.querySelector("#counter");
const resultsEl = document.querySelector("#results");
const sourceEl = document.querySelector("#source");
const backBtn = document.querySelector("#back");
const nextBtn = document.querySelector("#next");
const playBtn = document.querySelector("#play");

const workerSource = `
function cloneCell(value) {
  if (!value || typeof value !== "object") return null;
  const r = Number(value.r);
  const c = Number(value.c);
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
  return { r: r, c: c };
}

function cellKey(value) {
  if (typeof value === "string") return value;
  const cell = cloneCell(value);
  return cell ? cell.r + "," + cell.c : String(value);
}

function snapshot(info) {
  if (!info || typeof info !== "object") return null;
  const current = cloneCell(info.current);
  const queue = Array.isArray(info.queue)
    ? info.queue.map(cloneCell).filter(Boolean)
    : [];
  let visited = [];
  if (info.visited instanceof Set) visited = Array.from(info.visited, cellKey);
  else if (Array.isArray(info.visited)) visited = info.visited.map(cellKey);
  return { current: current, queue: queue, visited: visited };
}

self.onmessage = (event) => {
  const code = event.data.code;
  const cases = event.data.cases;
  let shortestPath;
  try {
    const factory = new Function(
      code +
        "\\n; if (typeof shortestPath !== 'function') throw new Error('Define function shortestPath(grid, start, goal, trace).');\\n return shortestPath;\\n//# sourceURL=path.js"
    );
    shortestPath = factory();
  } catch (err) {
    self.postMessage({ ok: false, error: err.message || String(err) });
    return;
  }

  const results = [];
  for (const test of cases) {
    const frames = [];
    let exploded = false;
    const trace = (info) => {
      if (frames.length > 800) {
        exploded = true;
        throw new Error("trace ran more than 800 times. A visited cell is being queued again.");
      }
      const frame = snapshot(info);
      if (frame) frames.push(frame);
    };
    const grid = test.rows.map((row) => row);
    try {
      const path = shortestPath(
        grid,
        { r: test.start.r, c: test.start.c },
        { r: test.goal.r, c: test.goal.c },
        trace
      );
      results.push({ id: test.id, path: path, frames: frames, error: null });
    } catch (err) {
      results.push({
        id: test.id,
        path: null,
        frames: frames,
        error: err.message || String(err),
      });
      if (exploded) break;
    }
  }
  self.postMessage({ ok: true, results: results });
};
`;

const workerUrl = URL.createObjectURL(
  new Blob([workerSource], { type: "text/javascript" }),
);

const state = {
  source: "",
  error: null,
  timedOut: false,
  reports: [],
  selected: CASES[0].id,
  step: 0,
  playing: false,
  runId: 0,
};

let playTimer = 0;

function selectedReport() {
  return state.reports.find((report) => report.id === state.selected) || null;
}

function frameCount(report) {
  if (!report) return 0;
  return report.frames.length;
}

function stopPlay() {
  state.playing = false;
  clearInterval(playTimer);
  playBtn.textContent = "Play";
}

function overallStatus() {
  if (state.timedOut) {
    return {
      kind: "fail",
      text: "path.js did not finish. A cell is being queued again after it was visited.",
    };
  }
  if (state.error) {
    return { kind: "fail", text: state.error };
  }
  if (state.reports.length === 0) {
    return { kind: "", text: "Running path.js" };
  }
  const bad = state.reports.find((report) => report.judgment.status !== "pass");
  if (!bad) {
    return {
      kind: "pass",
      text: "Shortest path on every maze.",
    };
  }
  return {
    kind: bad.judgment.status,
    text: `${bad.name}: ${bad.judgment.title}. ${bad.judgment.detail}`,
  };
}

function renderMaze() {
  const report = selectedReport();
  const maze = CASES.find((item) => item.id === state.selected) || CASES[0];
  const rows = maze.rows;
  mazeEl.style.gridTemplateColumns = `repeat(${rows[0].length}, 30px)`;
  mazeEl.replaceChildren();

  const step = report ? Math.min(state.step, Math.max(report.frames.length - 1, 0)) : 0;
  const frame = report && report.frames.length > 0 ? report.frames[step] : null;
  const atEnd = !report || report.frames.length === 0 || step === report.frames.length - 1;
  const visited = new Set(frame ? frame.visited : []);
  const queued = new Set(
    frame ? frame.queue.map((cell) => `${cell.r},${cell.c}`) : [],
  );
  const current = frame && frame.current ? `${frame.current.r},${frame.current.c}` : null;
  const path = atEnd && report && Array.isArray(report.path) ? report.path : [];
  const pathSet = new Set(
    path
      .filter((cell) => cell && Number.isInteger(Number(cell.r)))
      .map((cell) => `${Number(cell.r)},${Number(cell.c)}`),
  );
  const fault =
    atEnd && report && report.judgment.fault
      ? `${report.judgment.fault.r},${report.judgment.fault.c}`
      : null;

  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      const id = `${r},${c}`;
      const div = document.createElement("div");
      div.className = "cell";
      let kind = "open";
      if (ch === "#") kind = "wall";
      else if (fault === id) kind = "bad";
      else if (pathSet.has(id)) kind = "path";
      else if (current === id) kind = "current";
      else if (queued.has(id)) kind = "queued";
      else if (visited.has(id)) kind = "visited";
      div.classList.add(kind);
      if (ch === "S" || ch === "E") div.textContent = ch;
      div.title =
        ch === "#"
          ? `Wall, row ${r}, col ${c}`
          : `Row ${r}, col ${c}`;
      mazeEl.appendChild(div);
    });
  });

  const total = frameCount(report);
  if (!report) {
    captionEl.textContent = "Save path.js to run it.";
    counterEl.textContent = "";
  } else if (report.error && total === 0) {
    captionEl.textContent = report.error;
    counterEl.textContent = "";
  } else if (total === 0) {
    captionEl.textContent = report.path
      ? "The return value is drawn. Call trace({ current, queue, visited }) after each dequeue to watch the queue."
      : "Nothing was traced. Call trace({ current, queue, visited }) after you queue the neighbors of a cell.";
    counterEl.textContent = "No steps yet";
  } else {
    const shown = frame.current
      ? `Dequeued row ${frame.current.r}, col ${frame.current.c}.`
      : "Trace call had no current cell.";
    const waiting = frame.queue.length;
    captionEl.textContent = `${shown} Queue has ${waiting} ${waiting === 1 ? "cell" : "cells"}. Visited ${frame.visited.length}.`;
    counterEl.textContent = `Step ${step + 1} of ${total}`;
  }

  backBtn.disabled = !report || state.step <= 0 || total === 0;
  nextBtn.disabled = !report || total === 0 || state.step >= total - 1;
  playBtn.disabled = !report || total < 2;
}

function renderResults() {
  resultsEl.replaceChildren();
  for (const report of state.reports) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `result ${report.judgment.status}`;
    if (report.id === state.selected) button.classList.add("selected");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = report.name;
    const verdict = document.createElement("span");
    verdict.className = "verdict";
    verdict.textContent = ` ${report.judgment.title}.`;
    const detail = document.createElement("span");
    detail.className = "detail";
    detail.textContent = report.error
      ? report.error
      : `${report.blurb} ${report.judgment.detail}`;
    button.append(name, verdict, detail);
    button.addEventListener("click", () => {
      stopPlay();
      state.selected = report.id;
      state.step = 0;
      render();
    });
    const item = document.createElement("li");
    item.appendChild(button);
    resultsEl.appendChild(item);
  }
}

function render() {
  const summary = overallStatus();
  statusEl.className = `status ${summary.kind}`;
  statusEl.textContent = summary.text;
  sourceEl.textContent = state.source;
  renderResults();
  renderMaze();
}

function applyRun(id, payload) {
  if (id !== state.runId) return;
  stopPlay();
  state.timedOut = false;
  state.step = 0;
  if (!payload.ok) {
    state.error = payload.error;
    state.reports = [];
    render();
    return;
  }
  state.error = null;
  state.reports = payload.results.map((result) => {
    const maze = CASES.find((item) => item.id === result.id);
    const judgment = result.error
      ? {
          status: "fail",
          title: "Threw",
          detail: result.error,
          fault: null,
        }
      : judge(maze.rows, maze.start, maze.goal, result.path);
    return {
      id: maze.id,
      name: maze.name,
      blurb: maze.blurb,
      path: result.path,
      frames: result.frames,
      error: result.error,
      judgment,
    };
  });
  if (!state.reports.some((report) => report.id === state.selected)) {
    state.selected = state.reports[0]?.id || CASES[0].id;
  }
  render();
}

function runSource(source) {
  const id = ++state.runId;
  state.source = source;
  state.error = null;
  state.timedOut = false;
  sourceEl.textContent = source;
  statusEl.className = "status";
  statusEl.textContent = "Running path.js";
  const worker = new Worker(workerUrl);
  const timer = setTimeout(() => {
    worker.terminate();
    if (id !== state.runId) return;
    state.timedOut = true;
    state.error = null;
    state.reports = [];
    stopPlay();
    render();
  }, 1200);
  worker.onmessage = (event) => {
    clearTimeout(timer);
    worker.terminate();
    applyRun(id, event.data);
  };
  worker.onerror = (event) => {
    clearTimeout(timer);
    worker.terminate();
    applyRun(id, { ok: false, error: event.message || "path.js failed to run." });
  };
  worker.postMessage({
    code: source,
    cases: CASES.map((maze) => ({
      id: maze.id,
      rows: maze.rows,
      start: maze.start,
      goal: maze.goal,
    })),
  });
}

async function loadSource() {
  if (location.protocol === "file:") {
    state.error =
      "Open this page through a local server. From the maze-bfs folder run: python3 -m http.server 8765";
    render();
    return;
  }
  const response = await fetch(`path.js?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    state.error = "Could not read path.js.";
    render();
    return;
  }
  const source = await response.text();
  if (source === state.source && (state.reports.length > 0 || state.error)) return;
  runSource(source);
}

function stepBy(delta) {
  const report = selectedReport();
  if (!report || report.frames.length === 0) return;
  stopPlay();
  state.step = Math.max(0, Math.min(report.frames.length - 1, state.step + delta));
  render();
}

backBtn.addEventListener("click", () => stepBy(-1));
nextBtn.addEventListener("click", () => stepBy(1));
playBtn.addEventListener("click", () => {
  const report = selectedReport();
  if (!report || report.frames.length < 2) return;
  if (state.playing) {
    stopPlay();
    return;
  }
  if (state.step >= report.frames.length - 1) state.step = 0;
  state.playing = true;
  playBtn.textContent = "Pause";
  playTimer = setInterval(() => {
    const current = selectedReport();
    if (!current || state.step >= current.frames.length - 1) {
      stopPlay();
      render();
      return;
    }
    state.step += 1;
    render();
  }, 420);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") stepBy(1);
  if (event.key === "ArrowLeft") stepBy(-1);
  if (event.key === " " && event.target === document.body) {
    event.preventDefault();
    playBtn.click();
  }
});

loadSource();
setInterval(loadSource, 800);
