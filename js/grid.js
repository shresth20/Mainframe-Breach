import { withinBounds } from "./utils.js";

export class Grid {
  constructor(level, canvas) {
    this.canvas = canvas;
    this.palette = {
      cell: "rgba(6, 22, 7, 0.72)",
      line: "rgba(97, 255, 133, 0.18)",
      wall: "rgba(44, 93, 50, 0.9)",
      node: "#64ff9d",
      nodeGlow: "rgba(100, 255, 157, 0.22)",
      player: "#c8ff75",
      bot: "#ff8c7a",
      border: "rgba(138, 255, 151, 0.45)",
      debug: "#7bdcff",
      blink: "#ffd166",
      path: "rgba(130, 255, 149, 0.12)",
    };

    this.setLevel(level);
  }

  setLevel(level) {
    this.level = level;
    this.rows = level.rows;
    this.cols = level.cols;
    this.tileSize = Math.floor(
      Math.min(this.canvas.width / this.cols, this.canvas.height / this.rows)
    );
    this.displayCols = Math.floor(this.canvas.width / this.tileSize);
    this.displayRows = Math.floor(this.canvas.height / this.tileSize);
    this.offsetX = Math.floor((this.canvas.width - this.displayCols * this.tileSize) / 2);
    this.offsetY = Math.floor((this.canvas.height - this.displayRows * this.tileSize) / 2);
    this.logicalOffsetCol = Math.floor((this.displayCols - this.cols) / 2);
    this.logicalOffsetRow = Math.floor((this.displayRows - this.rows) / 2);
  }

  isInside(row, col) {
    return withinBounds(row, col, this.rows, this.cols);
  }

  isWalkable(row, col) {
    return this.isInside(row, col) && !this.level.isWall(row, col);
  }

  cellToPixels(row, col) {
    return {
      x: this.offsetX + (this.logicalOffsetCol + col) * this.tileSize,
      y: this.offsetY + (this.logicalOffsetRow + row) * this.tileSize,
    };
  }

  displayCellToPixels(row, col) {
    return {
      x: this.offsetX + col * this.tileSize,
      y: this.offsetY + row * this.tileSize,
    };
  }

  render(ctx, { player = null, bots = [] } = {}) {
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderBackground(ctx);
    this.renderTiles(ctx);
    this.renderNodes(ctx);
    this.renderPowerUps(ctx);
    bots.forEach((bot) => this.renderBot(ctx, bot));

    if (player) {
      this.renderPlayer(ctx, player);
    }

    this.renderBorder(ctx);
    ctx.restore();
  }

  renderBackground(ctx) {
    ctx.fillStyle = "#020402";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < this.displayRows; row += 1) {
      for (let col = 0; col < this.displayCols; col += 1) {
        const { x, y } = this.displayCellToPixels(row, col);

        ctx.fillStyle = this.palette.cell;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);

        ctx.strokeStyle = this.palette.line;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, this.tileSize - 1, this.tileSize - 1);
      }
    }
  }

  renderTiles(ctx) {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const { x, y } = this.cellToPixels(row, col);

        if (!this.level.isWall(row, col)) {
          continue;
        }

        ctx.fillStyle = this.palette.wall;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
      }
    }
  }

  renderNodes(ctx) {
    this.level.activeNodes.forEach((node) => {
      const { x, y } = this.cellToPixels(node.row, node.col);
      const inset = this.tileSize * 0.28;
      const size = this.tileSize - inset * 2;

      ctx.fillStyle = this.palette.nodeGlow;
      ctx.fillRect(x + inset * 0.7, y + inset * 0.7, size * 1.25, size * 1.25);

      ctx.fillStyle = this.palette.node;
      ctx.fillRect(x + inset, y + inset, size, size);

      ctx.fillStyle = "rgba(4, 16, 6, 0.9)";
      ctx.font = `${Math.floor(this.tileSize * 0.38)}px "IBM Plex Mono", Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("D", x + this.tileSize / 2, y + this.tileSize / 2 + 1);
    });
  }

  renderPowerUps(ctx) {
    this.level.activePowerUps.forEach((powerUp) => {
      const { x, y } = this.cellToPixels(powerUp.row, powerUp.col);
      const inset = this.tileSize * 0.22;
      const size = this.tileSize - inset * 2;
      const color = powerUp.type === "blink" ? this.palette.blink : this.palette.debug;
      const label = powerUp.type === "blink" ? "B" : "S";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + inset, y + inset, size, size);

      ctx.fillStyle = color;
      ctx.font = `${Math.floor(this.tileSize * 0.42)}px "IBM Plex Mono", Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + this.tileSize / 2, y + this.tileSize / 2 + 1);
    });
  }

  renderPlayer(ctx, player) {
    const { x, y } = this.cellToPixels(player.row, player.col);
    const inset = this.tileSize * 0.16;
    const size = this.tileSize - inset * 2;

    ctx.fillStyle = this.palette.player;
    ctx.fillRect(x + inset, y + inset, size, size);

    ctx.strokeStyle = "rgba(11, 31, 12, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + inset, y + inset, size, size);

    ctx.fillStyle = "rgba(9, 20, 5, 0.9)";
    ctx.font = `${Math.floor(this.tileSize * 0.46)}px "IBM Plex Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("@", x + this.tileSize / 2, y + this.tileSize / 2 + 1);
  }

  renderBot(ctx, bot) {
    const { x, y } = this.cellToPixels(bot.row, bot.col);
    const inset = this.tileSize * 0.2;
    const size = this.tileSize - inset * 2;

    ctx.fillStyle = this.palette.bot;
    ctx.fillRect(x + inset, y + inset, size, size);

    ctx.strokeStyle = "rgba(53, 8, 8, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + inset, y + inset, size, size);

    ctx.fillStyle = "rgba(40, 4, 4, 0.9)";
    ctx.font = `${Math.floor(this.tileSize * 0.34)}px "IBM Plex Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bot.label, x + this.tileSize / 2, y + this.tileSize / 2 + 1);
  }

  renderBorder(ctx) {
    const width = this.displayCols * this.tileSize;
    const height = this.displayRows * this.tileSize;

    ctx.strokeStyle = this.palette.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.offsetX + 1, this.offsetY + 1, width - 2, height - 2);
  }

  renderPatrols(ctx, bots) {
    ctx.save();
    ctx.strokeStyle = this.palette.path;
    ctx.lineWidth = 2;

    bots.forEach((bot) => {
      if (bot.path.length < 2) {
        return;
      }

      ctx.beginPath();

      bot.path.forEach((cell, index) => {
        const { x, y } = this.cellToPixels(cell.row, cell.col);
        const px = x + this.tileSize / 2;
        const py = y + this.tileSize / 2;

        if (index === 0) {
          ctx.moveTo(px, py);
          return;
        }

        ctx.lineTo(px, py);
      });

      const first = bot.path[0];
      const { x, y } = this.cellToPixels(first.row, first.col);
      ctx.lineTo(x + this.tileSize / 2, y + this.tileSize / 2);
      ctx.stroke();
    });

    ctx.restore();
  }
}
