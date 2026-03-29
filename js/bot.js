export class Bot {
  constructor(path = [], label = "SEC") {
    this.path = path.map((cell) => ({ ...cell }));
    this.label = label;
    this.reset();
  }

  reset() {
    this.step = 0;
    this.isChasing = false;

    if (this.path.length === 0) {
      this.row = 0;
      this.col = 0;
      return;
    }

    this.row = this.path[0].row;
    this.col = this.path[0].col;
  }

  update({ grid = null, playerPosition = null, detectionRange = 0 } = {}) {
    const chasePath = this.findChasePath(grid, playerPosition, detectionRange);

    if (chasePath) {
      this.isChasing = true;
      this.moveAlongPath(chasePath);
      return;
    }

    this.isChasing = false;
    this.advancePatrol(grid);
  }

  findChasePath(grid, playerPosition, detectionRange) {
    if (!grid || !playerPosition || detectionRange <= 0) {
      return null;
    }

    const pathToPlayer = this.findPath(grid, this.position, (cell) => {
      return cell.row === playerPosition.row && cell.col === playerPosition.col;
    });

    if (!pathToPlayer || pathToPlayer.length - 1 > detectionRange) {
      return null;
    }

    return pathToPlayer;
  }

  canDetectPlayer(grid, playerPosition, detectionRange) {
    return Boolean(this.findChasePath(grid, playerPosition, detectionRange));
  }

  advancePatrol(grid = null) {
    if (this.path.length === 0) {
      return;
    }

    const currentIndex = this.findCurrentPatrolIndex();

    if (currentIndex !== -1) {
      this.step = currentIndex;
      this.step = (this.step + 1) % this.path.length;
      this.moveTo(this.path[this.step]);
      return;
    }

    if (!grid) {
      return;
    }

    const patrolKeys = new Set(this.path.map((cell) => this.cellKey(cell)));
    const returnPath = this.findPath(grid, this.position, (cell) => {
      return patrolKeys.has(this.cellKey(cell));
    });

    if (returnPath && returnPath.length > 1) {
      this.moveAlongPath(returnPath);
    }
  }

  findCurrentPatrolIndex() {
    for (let offset = 0; offset < this.path.length; offset += 1) {
      const index = (this.step + offset) % this.path.length;
      const cell = this.path[index];

      if (cell.row === this.row && cell.col === this.col) {
        return index;
      }
    }

    return -1;
  }

  findPath(grid, start, isGoal) {
    if (!grid || !start || !isGoal) {
      return null;
    }

    const startKey = this.cellKey(start);
    const queue = [start];
    const parents = new Map([[startKey, null]]);
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];

      if (isGoal(current)) {
        return this.reconstructPath(parents, current);
      }

      directions.forEach((direction) => {
        const next = {
          row: current.row + direction.row,
          col: current.col + direction.col,
        };
        const nextKey = this.cellKey(next);

        if (parents.has(nextKey) || !grid.isWalkable(next.row, next.col)) {
          return;
        }

        parents.set(nextKey, current);
        queue.push(next);
      });
    }

    return null;
  }

  reconstructPath(parents, destination) {
    const path = [];
    let current = destination;

    while (current) {
      path.push(current);
      current = parents.get(this.cellKey(current)) ?? null;
    }

    return path.reverse();
  }

  moveAlongPath(path) {
    if (!path || path.length <= 1) {
      return;
    }

    this.moveTo(path[1]);
  }

  moveTo(cell) {
    this.row = cell.row;
    this.col = cell.col;
  }

  cellKey(cell) {
    return `${cell.row},${cell.col}`;
  }

  get position() {
    return { row: this.row, col: this.col };
  }
}
