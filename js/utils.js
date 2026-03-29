export const GAME_STATES = Object.freeze({
  LOADING: "loading",
  MENU: "menu",
  CONTROLS: "controls",
  HIGH_SCORES: "high-scores",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "game-over",
  LEVEL_COMPLETE: "level-complete",
  RUN_COMPLETE: "run-complete",
});

export const TILE_TYPES = Object.freeze({
  EMPTY: "empty",
  WALL: "wall",
  NODE: "node",
  POWER_UP: "power-up",
});

export const POWER_UP_TYPES = Object.freeze({
  DEBUG: "debug",
  BLINK: "blink",
});

export const KEYBOARD_DIRECTIONS = Object.freeze({
  ArrowUp: { dx: 0, dy: -1 },
  w: { dx: 0, dy: -1 },
  W: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  s: { dx: 0, dy: 1 },
  S: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  a: { dx: -1, dy: 0 },
  A: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  d: { dx: 1, dy: 0 },
  D: { dx: 1, dy: 0 },
});

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createMatrix(rows, cols, factory = () => null) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => factory(row, col))
  );
}

export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function withinBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

export function isSameCell(a, b) {
  return Boolean(a && b) && a.row === b.row && a.col === b.col;
}

export function keyToDirection(key) {
  return KEYBOARD_DIRECTIONS[key] ?? null;
}

export function manhattanDistance(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function getBotDetectionRange(levelNumber, mode = "easy") {
  if (mode === "hard") {
    return Math.min(levelNumber + 2, 5);
  }

  return levelNumber <= 3 ? levelNumber + 1 : levelNumber;
}

export function getBotChaseSpeedMultiplier(levelNumber, mode = "easy") {
  if (mode !== "hard") {
    return 1;
  }

  return Math.min(2.1, 1.45 + levelNumber * 0.06);
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}
