export class Player {
  constructor(startRow = 0, startCol = 0) {
    this.reset(startRow, startCol);
  }

  reset(row, col) {
    this.row = row;
    this.col = col;
    this.moves = 0;
    this.blinkCharges = 0;
  }

  move(dx, dy, grid) {
    const nextRow = this.row + dy;
    const nextCol = this.col + dx;

    if (!grid.isWalkable(nextRow, nextCol)) {
      return false;
    }

    this.row = nextRow;
    this.col = nextCol;
    this.moves += 1;
    return true;
  }

  teleport(row, col) {
    this.row = row;
    this.col = col;
    this.moves += 1;
  }

  grantBlinkCharge(amount = 1) {
    this.blinkCharges += amount;
  }

  useBlinkCharge() {
    if (this.blinkCharges <= 0) {
      return false;
    }

    this.blinkCharges -= 1;
    return true;
  }

  get position() {
    return { row: this.row, col: this.col };
  }
}
