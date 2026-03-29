export const FALLBACK_LEVELS = [
  {
    name: "BOOT SECTOR",
    intro: "Warm boot. Learn the route before the patrol loop closes.",
    gridSize: [15, 15],
    timer: 70,
    botInterval: 1.1,
    start: [1, 1],
    nodes: [
      [3, 2],
      [6, 10],
      [11, 5],
    ],
    walls: [
      [4, 4],
      [4, 5],
      [4, 6],
      [8, 8],
      [9, 8],
      [10, 8],
    ],
    bots: [
      [
        [12, 12],
        [12, 11],
        [11, 11],
        [11, 12],
      ],
    ],
    powerUps: [
      { type: "debug", position: [7, 7] },
    ],
  },
];

const HARD_MODE_LEVEL_COUNT = 10;
const HARD_MODE_START_CLEARANCE = 3;

function normalizeCell([row, col]) {
  return { row, col };
}

function cellKey(row, col) {
  return `${row},${col}`;
}

function parseCellKey(key) {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

function isBorderCell(row, col, rows, cols) {
  return row === 0 || col === 0 || row === rows - 1 || col === cols - 1;
}

function normalizePowerUp(powerUp) {
  const [row, col] = powerUp.position ?? [0, 0];

  return {
    type: powerUp.type ?? "debug",
    row,
    col,
  };
}

function expandWideLevelLayout(config) {
  const [rows, cols] = config.gridSize;

  if (rows !== 15 || cols !== 15) {
    return config;
  }

  const colOffset = 5;
  const shiftCell = ([row, col]) => [row, col + colOffset];
  const shiftPath = (path) => path.map(shiftCell);

  return {
    ...config,
    gridSize: [rows, cols + colOffset * 2],
    start: shiftCell(config.start),
    nodes: config.nodes.map(shiftCell),
    walls: config.walls.map(shiftCell),
    bots: config.bots.map(shiftPath),
    powerUps: config.powerUps.map((powerUp) => ({
      ...powerUp,
      position: shiftCell(powerUp.position),
    })),
  };
}

function cloneLevelConfig(config) {
  return {
    ...config,
    gridSize: [...config.gridSize],
    start: [...config.start],
    nodes: config.nodes.map(([row, col]) => [row, col]),
    walls: config.walls.map(([row, col]) => [row, col]),
    bots: config.bots.map((path) => path.map(([row, col]) => [row, col])),
    powerUps: config.powerUps.map((powerUp) => ({
      ...powerUp,
      position: [...powerUp.position],
    })),
  };
}

function uniqueCells(cells) {
  const seen = new Set();

  return cells.filter(([row, col]) => {
    const key = cellKey(row, col);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getStartBufferDistance(start, row, col) {
  return Math.max(Math.abs(row - start[0]), Math.abs(col - start[1]));
}

function isInsideStartBuffer(row, col, start, minStartDistance = 0) {
  return minStartDistance > 0 && getStartBufferDistance(start, row, col) <= minStartDistance;
}

function rotatePath(path, startIndex) {
  if (path.length === 0 || startIndex <= 0 || startIndex >= path.length) {
    return path;
  }

  return [...path.slice(startIndex), ...path.slice(0, startIndex)];
}

function repositionBotSpawns(config, minStartDistance = 0) {
  if (minStartDistance <= 0) {
    return config;
  }

  const bots = config.bots
    .map((path) => {
      let safestIndex = -1;
      let safestDistance = -1;

      path.forEach(([row, col], index) => {
        const distance = getStartBufferDistance(config.start, row, col);

        if (distance > minStartDistance && distance > safestDistance) {
          safestIndex = index;
          safestDistance = distance;
        }
      });

      if (safestIndex === -1) {
        return [];
      }

      return rotatePath(path, safestIndex);
    })
    .filter((path) => path.length > 0);

  return {
    ...config,
    bots,
  };
}

function createHorizontalPatrol(row, startCol, endCol) {
  const cells = [];
  const step = startCol <= endCol ? 1 : -1;

  for (let col = startCol; col !== endCol + step; col += step) {
    cells.push([row, col]);
  }

  if (cells.length <= 2) {
    return cells;
  }

  return [...cells, ...cells.slice(1, -1).reverse()];
}

function createVerticalPatrol(col, startRow, endRow) {
  const cells = [];
  const step = startRow <= endRow ? 1 : -1;

  for (let row = startRow; row !== endRow + step; row += step) {
    cells.push([row, col]);
  }

  if (cells.length <= 2) {
    return cells;
  }

  return [...cells, ...cells.slice(1, -1).reverse()];
}

function createHorizontalWall(row, startCol, endCol) {
  const cells = [];
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  for (let col = minCol; col <= maxCol; col += 1) {
    cells.push([row, col]);
  }

  return cells;
}

function createVerticalWall(col, startRow, endRow) {
  const cells = [];
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  for (let row = minRow; row <= maxRow; row += 1) {
    cells.push([row, col]);
  }

  return cells;
}

function buildHardBotTemplates(levelIndex) {
  const laneOffset = levelIndex % 2;

  return [
    createVerticalPatrol(2 + laneOffset, 1, 13),
    createVerticalPatrol(22 - laneOffset, 1, 13),
    createHorizontalPatrol(3 + (levelIndex % 3), 6, 18),
    createHorizontalPatrol(11 - (levelIndex % 3), 6, 18),
    createHorizontalPatrol(7, 1, 23),
    createVerticalPatrol(6, 2, 12),
    createVerticalPatrol(18, 2, 12),
  ];
}

function buildHardWallTemplates(levelIndex) {
  const laneOffset = levelIndex % 2;
  const centerOffset = levelIndex % 3;

  return [
    createVerticalWall(4 + laneOffset, 8, 12),
    createHorizontalWall(11 - laneOffset, 2, 6),
    createVerticalWall(21 - laneOffset, 2, 6),
    createHorizontalWall(9 + laneOffset, 18, 22),
    createHorizontalWall(4 + centerOffset, 8, 13),
    createVerticalWall(12 + laneOffset, 5, 10),
    createHorizontalWall(11 + centerOffset, 8, 14),
    createVerticalWall(18 - laneOffset, 8, 12),
  ];
}

function extendWallPlacements(config, levelIndex, { minStartDistance = 0 } = {}) {
  const [rows, cols] = config.gridSize;
  const wallTemplates = buildHardWallTemplates(levelIndex);
  const desiredTemplateCount = Math.min(4 + Math.floor(levelIndex / 2), wallTemplates.length);
  const reserved = new Set([
    cellKey(config.start[0], config.start[1]),
    ...config.powerUps.map(({ position: [row, col] }) => cellKey(row, col)),
  ]);

  const walls = uniqueCells([
    ...config.walls,
    ...wallTemplates.slice(0, desiredTemplateCount).flat(),
  ]).filter(([row, col]) => {
    const key = cellKey(row, col);

    return (
      !isBorderCell(row, col, rows, cols) &&
      !reserved.has(key) &&
      !isInsideStartBuffer(row, col, config.start, minStartDistance)
    );
  });

  return {
    ...config,
    walls,
  };
}

function extendNodePlacements(config, desiredCount, { minStartDistance = 0 } = {}) {
  if (config.nodes.length >= desiredCount) {
    return config;
  }

  const [rows, cols] = config.gridSize;
  const walls = new Set(config.walls.map(([row, col]) => cellKey(row, col)));
  const reachable = buildReachableSet(config.start, rows, cols, walls);
  const botKeys = new Set(config.bots.flat().map(([row, col]) => cellKey(row, col)));
  const reserved = new Set([
    cellKey(config.start[0], config.start[1]),
    ...config.nodes.map(([row, col]) => cellKey(row, col)),
    ...config.powerUps.map(({ position: [row, col] }) => cellKey(row, col)),
  ]);
  const left = [];
  const center = [];
  const right = [];

  [...reachable]
    .map(parseCellKey)
    .filter(({ row, col }) => {
      const key = cellKey(row, col);

      return (
        !isBorderCell(row, col, rows, cols) &&
        !walls.has(key) &&
        !botKeys.has(key) &&
        !reserved.has(key) &&
        !isInsideStartBuffer(row, col, config.start, minStartDistance)
      );
    })
    .sort((leftCell, rightCell) => {
      const leftDistance =
        Math.abs(leftCell.row - config.start[0]) + Math.abs(leftCell.col - config.start[1]);
      const rightDistance =
        Math.abs(rightCell.row - config.start[0]) + Math.abs(rightCell.col - config.start[1]);

      return rightDistance - leftDistance;
    })
    .forEach((cell) => {
      if (cell.col < Math.floor(cols / 3)) {
        left.push(cell);
        return;
      }

      if (cell.col >= Math.ceil((cols * 2) / 3)) {
        right.push(cell);
        return;
      }

      center.push(cell);
    });

  const nodes = [...config.nodes];
  const zoneOrder = ["right", "center", "left", "right", "left", "center"];
  const zoneBuckets = { left, center, right };
  let zoneIndex = 0;

  while (nodes.length < desiredCount) {
    const zoneName = zoneOrder[zoneIndex % zoneOrder.length];
    const fallbackZone = ["right", "center", "left"].find(
      (name) => zoneBuckets[name].length > 0
    );

    if (!fallbackZone) {
      break;
    }

    const activeZone = zoneBuckets[zoneName].length > 0 ? zoneName : fallbackZone;
    const candidate = zoneBuckets[activeZone].shift();
    nodes.push([candidate.row, candidate.col]);
    zoneIndex += 1;
  }

  return {
    ...config,
    nodes,
  };
}

function buildHardModeConfig(sourceConfig, levelIndex) {
  const template = expandWideLevelLayout(cloneLevelConfig(sourceConfig));
  const startRows = [1, 13, 7, 4, 10];
  const botTemplates = buildHardBotTemplates(levelIndex);
  const desiredBotCount = Math.min(3 + Math.floor(levelIndex / 2), botTemplates.length);
  const desiredNodeCount = Math.min(
    Math.max(template.nodes.length + 2, 4 + Math.floor(levelIndex / 2)),
    9
  );
  const desiredTimer = Math.max(34, (template.timer ?? 60) - 10 - levelIndex * 2);
  const desiredBotInterval = Math.max(0.34, (template.botInterval ?? 1) - 0.12 - levelIndex * 0.03);
  const hardStart = [startRows[levelIndex % startRows.length], 1 + (levelIndex % 2)];

  const hardConfig = {
    ...template,
    name: `HARD ${String(levelIndex + 1).padStart(2, "0")} // ${template.name}`,
    intro: `Full-grid breach. ${desiredBotCount} sentries active across the 25x15 lattice.`,
    timer: desiredTimer,
    botInterval: desiredBotInterval,
    start: hardStart,
    bots: [...template.bots, ...botTemplates].slice(0, desiredBotCount),
    walls: uniqueCells(template.walls),
  };

  const wideWallConfig = extendWallPlacements(hardConfig, levelIndex, {
    minStartDistance: HARD_MODE_START_CLEARANCE,
  });

  const safeStartConfig = repositionBotSpawns(
    {
      ...wideWallConfig,
      nodes: wideWallConfig.nodes.filter(([row, col]) => {
        return !isInsideStartBuffer(row, col, wideWallConfig.start, HARD_MODE_START_CLEARANCE);
      }),
    },
    HARD_MODE_START_CLEARANCE
  );

  return sanitizeNodePlacements(
    extendNodePlacements(safeStartConfig, desiredNodeCount, {
      minStartDistance: HARD_MODE_START_CLEARANCE,
    }),
    {
      minStartDistance: HARD_MODE_START_CLEARANCE,
    }
  );
}

function buildReachableSet(start, rows, cols, walls) {
  const reachable = new Set();
  const queue = [[start[0], start[1]]];
  reachable.add(cellKey(start[0], start[1]));
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let index = 0; index < queue.length; index += 1) {
    const [row, col] = queue[index];

    offsets.forEach(([rowOffset, colOffset]) => {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      const key = cellKey(nextRow, nextCol);

      if (
        nextRow < 0 ||
        nextRow >= rows ||
        nextCol < 0 ||
        nextCol >= cols ||
        walls.has(key) ||
        reachable.has(key)
      ) {
        return;
      }

      reachable.add(key);
      queue.push([nextRow, nextCol]);
    });
  }

  return reachable;
}

function isAdjacentCell(left, right) {
  return Math.abs(left.row - right.row) + Math.abs(left.col - right.col) === 1;
}

function sanitizeBotPlacements(config) {
  const [rows, cols] = config.gridSize;
  const walls = new Set(config.walls.map(([row, col]) => cellKey(row, col)));
  const reachable = buildReachableSet(config.start, rows, cols, walls);

  const bots = config.bots
    .map((path) => {
      const validCells = path
        .map(normalizeCell)
        .filter(({ row, col }) => {
          const key = cellKey(row, col);
          return reachable.has(key) && !walls.has(key);
        })
        .filter((cell, index, cells) => {
          if (index === 0) {
            return true;
          }

          const previous = cells[index - 1];
          return previous.row !== cell.row || previous.col !== cell.col;
        });

      if (validCells.length === 0) {
        return [];
      }

      const segments = [];
      let currentSegment = [];

      validCells.forEach((cell) => {
        if (
          currentSegment.length === 0 ||
          isAdjacentCell(currentSegment[currentSegment.length - 1], cell)
        ) {
          currentSegment.push(cell);
          return;
        }

        segments.push(currentSegment);
        currentSegment = [cell];
      });

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      const longestSegment =
        segments.reduce((best, segment) => {
          return segment.length > best.length ? segment : best;
        }, []) ?? [];

      if (longestSegment.length <= 2) {
        return longestSegment.map(({ row, col }) => [row, col]);
      }

      const loopedSegment = [
        ...longestSegment,
        ...longestSegment.slice(1, -1).reverse(),
      ];

      return loopedSegment.map(({ row, col }) => [row, col]);
    })
    .filter((path) => path.length > 0);

  return {
    ...config,
    bots,
  };
}

function sanitizeNodePlacements(config, { minStartDistance = 0 } = {}) {
  const [rows, cols] = config.gridSize;
  const walls = new Set(config.walls.map(([row, col]) => cellKey(row, col)));
  const reachable = buildReachableSet(config.start, rows, cols, walls);
  const powerUpKeys = new Set(
    config.powerUps.map(({ position: [row, col] }) => cellKey(row, col))
  );
  const botKeys = new Set(
    config.bots.flat().map(([row, col]) => cellKey(row, col))
  );
  const reserved = new Set([cellKey(config.start[0], config.start[1]), ...powerUpKeys]);
  const nodes = [];
  let replacementsNeeded = 0;

  config.nodes.forEach(([row, col]) => {
    const key = cellKey(row, col);
    const valid =
      reachable.has(key) &&
      !isBorderCell(row, col, rows, cols) &&
      !reserved.has(key) &&
      !botKeys.has(key) &&
      !isInsideStartBuffer(row, col, config.start, minStartDistance);

    if (valid) {
      nodes.push([row, col]);
      reserved.add(key);
      return;
    }

    replacementsNeeded += 1;
  });

  const primaryCandidates = [...reachable]
    .map(parseCellKey)
    .filter(({ row, col }) => {
      const key = cellKey(row, col);
      return (
        !isBorderCell(row, col, rows, cols) &&
        !reserved.has(key) &&
        !botKeys.has(key) &&
        !isInsideStartBuffer(row, col, config.start, minStartDistance)
      );
    })
    .sort((left, right) => {
      const leftDistance = Math.abs(left.row - config.start[0]) + Math.abs(left.col - config.start[1]);
      const rightDistance = Math.abs(right.row - config.start[0]) + Math.abs(right.col - config.start[1]);
      return rightDistance - leftDistance;
    });

  const fallbackCandidates = [...reachable]
    .map(parseCellKey)
    .filter(({ row, col }) => {
      const key = cellKey(row, col);
      return (
        !isBorderCell(row, col, rows, cols) &&
        !reserved.has(key) &&
        !isInsideStartBuffer(row, col, config.start, minStartDistance)
      );
    });

  const allCandidates = [...primaryCandidates, ...fallbackCandidates];

  while (replacementsNeeded > 0 && allCandidates.length > 0) {
    const candidate = allCandidates.shift();
    const key = cellKey(candidate.row, candidate.col);

    if (reserved.has(key)) {
      continue;
    }

    nodes.push([candidate.row, candidate.col]);
    reserved.add(key);
    replacementsNeeded -= 1;
  }

  return {
    ...config,
    nodes,
  };
}

function normalizeLevelConfig(config, index = 0) {
  const [rows, cols] = config.gridSize ?? [15, 15];
  const normalized = {
    name: config.name ?? `LEVEL ${index + 1}`,
    intro: config.intro ?? "Navigate the grid and collect the data nodes.",
    gridSize: [rows, cols],
    timer: config.timer ?? 60,
    botInterval: config.botInterval ?? 1,
    start: config.start ?? [1, 1],
    nodes: config.nodes ?? [],
    walls: config.walls ?? [],
    bots: config.bots ?? [],
    powerUps: config.powerUps ?? [],
  };

  return sanitizeNodePlacements(sanitizeBotPlacements(normalized));
}

export function buildHardModeConfigs(sourceConfigs) {
  const normalizedSource = sourceConfigs.map((config, index) => normalizeLevelConfig(config, index));

  return Array.from({ length: HARD_MODE_LEVEL_COUNT }, (_, index) => {
    const template = normalizedSource[index % normalizedSource.length];
    return buildHardModeConfig(template, index);
  });
}

export function buildEasyModeConfigs(sourceConfigs) {
  return sourceConfigs.map((config, index) => {
    const wideConfig = expandWideLevelLayout(cloneLevelConfig(config));
    return normalizeLevelConfig(wideConfig, index);
  });
}

export async function loadLevelConfigs(source = "./data/levels.json") {
  try {
    const response = await fetch(source, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Level request failed with status ${response.status}`);
    }

    const payload = await response.json();
    return payload.map((config, index) => normalizeLevelConfig(config, index));
  } catch (error) {
    console.warn("Falling back to bundled level data.", error);
    return FALLBACK_LEVELS.map((config, index) => normalizeLevelConfig(config, index));
  }
}

export class Level {
  constructor(config, index = 0) {
    const normalizedConfig = normalizeLevelConfig(config, index);
    const [rows, cols] = normalizedConfig.gridSize;

    this.index = index;
    this.name = normalizedConfig.name;
    this.intro = normalizedConfig.intro;
    this.rows = rows;
    this.cols = cols;
    this.timer = normalizedConfig.timer;
    this.botInterval = normalizedConfig.botInterval;
    this.start = normalizeCell(normalizedConfig.start);
    this.initialNodes = normalizedConfig.nodes.map(normalizeCell);
    this.initialPowerUps = normalizedConfig.powerUps.map(normalizePowerUp);
    this.walls = new Set(normalizedConfig.walls.map(([row, col]) => `${row},${col}`));
    this.botPaths = normalizedConfig.bots.map((path) => path.map(normalizeCell));
    this.reset();
  }

  static fromConfig(config, index = 0) {
    return new Level(config, index);
  }

  isWall(row, col) {
    return this.walls.has(`${row},${col}`);
  }

  isNodeAt(row, col) {
    return this.remainingNodes.some(
      (node) => !node.collected && node.row === row && node.col === col
    );
  }

  collectNodeAt(row, col) {
    const node = this.remainingNodes.find(
      (entry) => !entry.collected && entry.row === row && entry.col === col
    );

    if (!node) {
      return false;
    }

    node.collected = true;
    return true;
  }

  reset() {
    this.remainingNodes = this.initialNodes.map((node) => ({ ...node, collected: false }));
    this.powerUps = this.initialPowerUps.map((powerUp) => ({ ...powerUp, collected: false }));
  }

  get totalNodes() {
    return this.remainingNodes.length;
  }

  get collectedNodes() {
    return this.remainingNodes.filter((node) => node.collected).length;
  }

  get activeNodes() {
    return this.remainingNodes.filter((node) => !node.collected);
  }

  collectPowerUpAt(row, col) {
    const powerUp = this.powerUps.find(
      (entry) => !entry.collected && entry.row === row && entry.col === col
    );

    if (!powerUp) {
      return null;
    }

    powerUp.collected = true;
    return { ...powerUp };
  }

  get activePowerUps() {
    return this.powerUps.filter((powerUp) => !powerUp.collected);
  }

  getCompletionScore(timeLeft) {
    return Math.max(0, Math.floor(timeLeft)) * 10 + this.totalNodes * 100;
  }
}
