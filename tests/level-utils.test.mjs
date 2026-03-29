import assert from "node:assert/strict";

import { Bot } from "../js/bot.js";
import { Level, buildEasyModeConfigs, buildHardModeConfigs } from "../js/level.js";
import {
  GAME_STATES,
  formatTime,
  getBotChaseSpeedMultiplier,
  getBotDetectionRange,
  isSameCell,
  keyToDirection,
} from "../js/utils.js";

function run(name, callback) {
  try {
    callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createGrid(rows, cols, walls = []) {
  const blocked = new Set(walls.map(([row, col]) => `${row},${col}`));

  return {
    isWalkable(row, col) {
      return row >= 0 && row < rows && col >= 0 && col < cols && !blocked.has(`${row},${col}`);
    },
  };
}

function getStartBufferDistance(start, cell) {
  return Math.max(Math.abs(cell.row - start.row), Math.abs(cell.col - start.col));
}

run("formatTime pads minutes and seconds", () => {
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(9), "00:09");
});

run("GAME_STATES exposes a paused state", () => {
  assert.equal(GAME_STATES.PAUSED, "paused");
});

run("getBotDetectionRange scales with later levels", () => {
  assert.equal(getBotDetectionRange(1, "easy"), 2);
  assert.equal(getBotDetectionRange(2, "easy"), 3);
  assert.equal(getBotDetectionRange(4, "easy"), 4);
  assert.equal(getBotDetectionRange(1, "hard"), 3);
  assert.equal(getBotDetectionRange(2, "hard"), 4);
  assert.equal(getBotDetectionRange(3, "hard"), 5);
  assert.equal(getBotDetectionRange(6, "hard"), 5);
});

run("getBotChaseSpeedMultiplier boosts hard-mode pursuit speed", () => {
  assert.equal(getBotChaseSpeedMultiplier(2, "easy"), 1);
  assert.equal(getBotChaseSpeedMultiplier(1, "hard") > 1, true);
  assert.equal(getBotChaseSpeedMultiplier(8, "hard") >= getBotChaseSpeedMultiplier(1, "hard"), true);
});

run("keyToDirection maps keyboard input to grid deltas", () => {
  assert.deepEqual(keyToDirection("ArrowUp"), { dx: 0, dy: -1 });
  assert.deepEqual(keyToDirection("d"), { dx: 1, dy: 0 });
  assert.equal(keyToDirection("q"), null);
});

run("Level collects nodes and power-ups and resets cleanly", () => {
  const level = new Level({
    name: "Test Level",
    gridSize: [5, 5],
    timer: 30,
    botInterval: 1,
    start: [1, 1],
    nodes: [[2, 2]],
    walls: [[0, 0]],
    bots: [[[4, 4], [4, 3]]],
    powerUps: [{ type: "blink", position: [3, 3] }],
  });

  assert.equal(level.totalNodes, 1);
  assert.equal(level.collectNodeAt(2, 2), true);
  assert.equal(level.collectedNodes, 1);

  const powerUp = level.collectPowerUpAt(3, 3);
  assert.equal(powerUp.type, "blink");
  assert.equal(level.activePowerUps.length, 0);

  level.reset();

  assert.equal(level.collectedNodes, 0);
  assert.equal(level.activePowerUps.length, 1);
});

run("Level sanitizes border or unreachable nodes into playable cells", () => {
  const level = new Level({
    name: "Sanitized Level",
    gridSize: [5, 5],
    timer: 30,
    botInterval: 1,
    start: [1, 1],
    nodes: [[0, 4]],
    walls: [[1, 3], [2, 3], [3, 3]],
    bots: [],
    powerUps: [],
  });

  const node = level.initialNodes[0];
  assert.notDeepEqual(node, { row: 0, col: 4 });
  assert.equal(node.row > 0 && node.row < 4, true);
  assert.equal(node.col > 0 && node.col < 4, true);
});

run("Easy mode builds a full-width 25x15 campaign", () => {
  const [easyConfig] = buildEasyModeConfigs([
    {
      name: "Easy Layout",
      gridSize: [15, 15],
      timer: 30,
      botInterval: 1,
      start: [1, 1],
      nodes: [[2, 2]],
      walls: [[3, 3]],
      bots: [[[4, 4], [4, 5]]],
      powerUps: [{ type: "debug", position: [5, 5] }],
    },
  ]);
  const level = new Level(easyConfig);

  assert.equal(level.rows, 15);
  assert.equal(level.cols, 25);
  assert.deepEqual(level.start, { row: 1, col: 6 });
  assert.deepEqual(level.initialNodes[0], { row: 2, col: 7 });
  assert.equal(level.isWall(3, 8), true);
});

run("Hard mode builds a separate 10-level full-width campaign", () => {
  const hardConfigs = buildHardModeConfigs([
    {
      name: "Hard Template",
      gridSize: [15, 15],
      timer: 60,
      botInterval: 1,
      start: [1, 1],
      nodes: [[2, 2], [5, 5], [9, 9]],
      walls: [[3, 3], [3, 4], [4, 4]],
      bots: [[[6, 6], [6, 7], [6, 8]]],
      powerUps: [{ type: "debug", position: [7, 7] }],
    },
  ]);

  assert.equal(hardConfigs.length, 10);
  assert.equal(hardConfigs[0].walls.some(([, col]) => col < 5), true);
  assert.equal(hardConfigs[0].walls.some(([, col]) => col > 19), true);

  const firstHardLevel = new Level(hardConfigs[0], 0);
  const lastHardLevel = new Level(hardConfigs[9], 9);

  assert.equal(firstHardLevel.rows, 15);
  assert.equal(firstHardLevel.cols, 25);
  assert.equal(firstHardLevel.start.col <= 2, true);
  assert.equal(firstHardLevel.botPaths.length >= 3, true);
  assert.equal(firstHardLevel.totalNodes >= 4, true);
  assert.equal(lastHardLevel.botPaths.length >= firstHardLevel.botPaths.length, true);
  assert.equal(lastHardLevel.totalNodes >= firstHardLevel.totalNodes, true);
});

run("Hard mode keeps the opening 3-cell start buffer clear", () => {
  const [firstHardConfig] = buildHardModeConfigs([
    {
      name: "Hard Safety Template",
      gridSize: [15, 25],
      timer: 60,
      botInterval: 1,
      start: [1, 1],
      nodes: [[1, 2], [2, 3], [7, 12]],
      walls: [[4, 10], [5, 10], [6, 10]],
      bots: [[[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [4, 2], [3, 2], [2, 2]]],
      powerUps: [],
    },
  ]);
  const level = new Level(firstHardConfig, 0);

  level.botPaths.forEach((path) => {
    assert.equal(getStartBufferDistance(level.start, path[0]) > 3, true);
  });

  level.initialNodes.forEach((node) => {
    assert.equal(getStartBufferDistance(level.start, node) > 3, true);
  });

  assert.equal(level.totalNodes >= 4, true);
});

run("Level sanitizes bot patrols away from walls and unreachable cells", () => {
  const level = new Level({
    name: "Sanitized Patrols",
    gridSize: [5, 5],
    timer: 30,
    botInterval: 1,
    start: [1, 1],
    nodes: [],
    walls: [[2, 2], [3, 2]],
    bots: [[[4, 4], [3, 4], [3, 3], [3, 2], [2, 2]]],
    powerUps: [],
  });

  assert.deepEqual(level.botPaths, [[
    { row: 4, col: 4 },
    { row: 3, col: 4 },
    { row: 3, col: 3 },
    { row: 3, col: 4 },
  ]]);
});

run("Bot chases inside detection range and resumes patrol after escape", () => {
  const grid = createGrid(6, 6);
  const bot = new Bot(
    [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 2 },
    ],
    "1"
  );

  bot.update({
    grid,
    playerPosition: { row: 1, col: 3 },
    detectionRange: 2,
  });

  assert.deepEqual(bot.position, { row: 1, col: 2 });
  assert.equal(bot.isChasing, true);

  bot.update({
    grid,
    playerPosition: { row: 5, col: 5 },
    detectionRange: 2,
  });

  assert.deepEqual(bot.position, { row: 1, col: 3 });
  assert.equal(bot.isChasing, false);
});

run("Bot ignores players outside walkable detection range", () => {
  const grid = createGrid(5, 5, [[1, 2], [2, 2], [3, 2]]);
  const bot = new Bot([{ row: 1, col: 1 }], "1");

  bot.update({
    grid,
    playerPosition: { row: 1, col: 3 },
    detectionRange: 2,
  });

  assert.deepEqual(bot.position, { row: 1, col: 1 });
  assert.equal(bot.isChasing, false);
});

run("isSameCell compares row and column only", () => {
  assert.equal(isSameCell({ row: 2, col: 3 }, { row: 2, col: 3 }), true);
  assert.equal(isSameCell({ row: 2, col: 3 }, { row: 3, col: 2 }), false);
});
