import { AudioManager } from "./audio.js";
import { Bot } from "./bot.js";
import { Grid } from "./grid.js";
import {
  Level,
  buildEasyModeConfigs,
  buildHardModeConfigs,
  loadLevelConfigs,
} from "./level.js";
import { Player } from "./player.js";
import { getBestScore, loadHighScores, recordHighScore } from "./storage.js";
import { UI } from "./ui.js";
import {
  GAME_STATES,
  formatTime,
  getBotChaseSpeedMultiplier,
  getBotDetectionRange,
  isSameCell,
  keyToDirection,
  manhattanDistance,
  randomInt,
} from "./utils.js";

const MAIN_MENU_OPTIONS = [
  { label: "START EASY", action: "easy" },
  { label: "START HARD", action: "hard" },
  { label: "CONTROLS", action: "controls" },
  { label: "HIGH SCORES", action: "scores" },
];

const MODE_LABELS = {
  easy: "EASY",
  hard: "HARD",
};

const GAME_OVER_OPTIONS = [
  { label: "RETRY LEVEL", action: "retry" },
  { label: "MAIN MENU", action: "menu" },
];

const LEVEL_COMPLETE_OPTIONS = [
  { label: "NEXT LEVEL", action: "next" },
  { label: "MAIN MENU", action: "menu" },
];

const RUN_COMPLETE_OPTIONS = [
  { label: "RESTART CAMPAIGN", action: "restart" },
  { label: "HIGH SCORES", action: "scores" },
  { label: "MAIN MENU", action: "menu" },
];

const PREVENT_DEFAULT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  " ",
  "Enter",
  "p",
  "P",
]);

export class Game {
  constructor({ canvas, ui, audio, campaigns }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.audio = audio;
    this.campaigns = campaigns;
    this.mode = "easy";
    this.state = GAME_STATES.LOADING;
    this.level = null;
    this.grid = null;
    this.player = null;
    this.bots = [];
    this.levelIndex = 0;
    this.runScore = 0;
    this.lastLevelScore = 0;
    this.bestScores = loadHighScores();
    this.bestScore = getBestScore(this.bestScores);
    this.timeLeft = 0;
    this.botAccumulator = 0;
    this.previewAccumulator = 0;
    this.debugSlowRemaining = 0;
    this.lastTime = 0;
    this.overlaySelection = 0;
    this.failureReason = "SYSTEM LOCKDOWN";
    this.failureDetail = "Unexpected disconnect.";
    this.banner = {
      primary: "> SYSTEM READY",
      secondary: "Choose a terminal action to begin.",
      tone: "accent",
    };

    this.bindEvents();
    this.loadBackdropLevel(0);
    this.showMainMenu();
  }

  bindEvents() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown = async (event) => {
    const direction = keyToDirection(event.key);

    if (PREVENT_DEFAULT_KEYS.has(event.key) || direction) {
      event.preventDefault();
    }

    if (event.repeat) {
      return;
    }

    await this.audio.arm();

    switch (this.state) {
      case GAME_STATES.MENU:
        this.handleMenuInput(event.key);
        break;
      case GAME_STATES.CONTROLS:
      case GAME_STATES.HIGH_SCORES:
        this.handleInfoScreenInput(event.key);
        break;
      case GAME_STATES.PLAYING:
        this.handleGameplayInput(event.key, direction);
        break;
      case GAME_STATES.PAUSED:
        this.handlePausedInput(event.key);
        break;
      case GAME_STATES.GAME_OVER:
      case GAME_STATES.LEVEL_COMPLETE:
      case GAME_STATES.RUN_COMPLETE:
        this.handleOverlayInput(event.key);
        break;
      default:
        break;
    }
  };

  handleMenuInput(key) {
    if (key === "ArrowUp" || key === "w" || key === "W") {
      this.moveSelection(-1, MAIN_MENU_OPTIONS.length);
      return;
    }

    if (key === "ArrowDown" || key === "s" || key === "S") {
      this.moveSelection(1, MAIN_MENU_OPTIONS.length);
      return;
    }

    if (key === "Enter" || key === " ") {
      this.executeMenuAction(MAIN_MENU_OPTIONS[this.overlaySelection].action);
    }
  }

  handleInfoScreenInput(key) {
    if (key === "Escape" || key === "Enter" || key === "Backspace" || key === " ") {
      this.showMainMenu();
    }
  }

  handleGameplayInput(key, direction) {
    if (key === "p" || key === "P") {
      this.pauseGame();
      return;
    }

    if (direction) {
      const moved = this.player.move(direction.dx, direction.dy, this.grid);

      if (!moved) {
        this.audio.play("block");
        this.setBanner("> FIREWALL BLOCKED", "That route is sealed. Find another path.", "warn");
        return;
      }

      this.audio.play("move");
      this.resolvePlayerCell();
      return;
    }

    if (key === "r" || key === "R") {
      this.audio.play("start");
      this.restartLevel();
      return;
    }

    if (key === " ") {
      this.attemptBlink();
    }
  }

  handlePausedInput(key) {
    if (key === "p" || key === "P" || key === "Enter" || key === " ") {
      this.resumeGame();
      return;
    }

    if (key === "Escape") {
      this.returnToMenu();
    }
  }

  handleOverlayInput(key) {
    const options = this.getActiveOptions();

    if (key === "ArrowUp" || key === "w" || key === "W") {
      this.moveSelection(-1, options.length);
      return;
    }

    if (key === "ArrowDown" || key === "s" || key === "S") {
      this.moveSelection(1, options.length);
      return;
    }

    if (key === "Escape") {
      this.returnToMenu();
      return;
    }

    if (key === "Enter" || key === " ") {
      this.executeOverlayAction(options[this.overlaySelection].action);
    }
  }

  moveSelection(delta, length) {
    this.overlaySelection = (this.overlaySelection + delta + length) % length;
    this.audio.play("move");
  }

  executeMenuAction(action) {
    if (action === "easy") {
      this.startCampaign("easy");
      return;
    }

    if (action === "hard") {
      this.startCampaign("hard");
      return;
    }

    if (action === "controls") {
      this.showControls();
      return;
    }

    if (action === "scores") {
      this.showHighScores();
    }
  }

  executeOverlayAction(action) {
    if (action === "retry") {
      this.restartLevel();
      return;
    }

    if (action === "menu") {
      this.returnToMenu();
      return;
    }

    if (action === "next") {
      this.enterLevel(this.levelIndex + 1);
      return;
    }

    if (action === "restart") {
      this.startCampaign();
      return;
    }

    if (action === "scores") {
      this.showHighScores();
    }
  }

  getActiveOptions() {
    if (this.state === GAME_STATES.GAME_OVER) {
      return GAME_OVER_OPTIONS;
    }

    if (this.state === GAME_STATES.LEVEL_COMPLETE) {
      return LEVEL_COMPLETE_OPTIONS;
    }

    if (this.state === GAME_STATES.RUN_COMPLETE) {
      return RUN_COMPLETE_OPTIONS;
    }

    return [];
  }

  setBanner(primary, secondary, tone = "accent") {
    this.banner = { primary, secondary, tone };
  }

  get activeLevelConfigs() {
    return this.campaigns[this.mode] ?? [];
  }

  get modeLabel() {
    return MODE_LABELS[this.mode] ?? "EASY";
  }

  loadBackdropLevel(index) {
    const config = this.activeLevelConfigs[index] ?? this.activeLevelConfigs[0];

    this.levelIndex = index;
    this.level = Level.fromConfig(config, index);
    this.grid = this.grid ? this.grid : new Grid(this.level, this.canvas);
    this.grid.setLevel(this.level);
    this.player = this.player
      ? this.player
      : new Player(this.level.start.row, this.level.start.col);
    this.player.reset(this.level.start.row, this.level.start.col);
    this.bots = this.level.botPaths.map((path, pathIndex) => new Bot(path, `${pathIndex + 1}`));
    this.timeLeft = this.level.timer;
    this.botAccumulator = 0;
    this.debugSlowRemaining = 0;
  }

  startCampaign(mode = this.mode) {
    this.mode = mode;
    this.runScore = 0;
    this.lastLevelScore = 0;
    this.audio.play("start");
    this.enterLevel(0);
  }

  enterLevel(index) {
    this.loadBackdropLevel(index);
    this.state = GAME_STATES.PLAYING;
    this.overlaySelection = 0;
    this.setBanner(`> ${this.modeLabel} MODE LINK ESTABLISHED`, this.level.intro, "accent");
    this.syncUI();
  }

  pauseGame() {
    if (this.state !== GAME_STATES.PLAYING) {
      return;
    }

    this.state = GAME_STATES.PAUSED;
    this.audio.play("move");
    this.setBanner("> LINK PAUSED", "Press P to resume or Esc to exit to menu.", "warn");
    this.syncUI();
  }

  resumeGame() {
    if (this.state !== GAME_STATES.PAUSED) {
      return;
    }

    this.state = GAME_STATES.PLAYING;
    this.audio.play("move");
    this.setBanner("> BREACH RESUMED", "Signal restored. Keep moving before the trace closes in.", "accent");
    this.syncUI();
  }

  restartLevel() {
    this.enterLevel(this.levelIndex);
  }

  returnToMenu() {
    this.loadBackdropLevel(0);
    this.showMainMenu();
  }

  showMainMenu() {
    this.state = GAME_STATES.MENU;
    this.overlaySelection = 0;
    this.setBanner(
      "> SELECT BREACH MODE",
      "Easy keeps the centered 15x15 core. Hard unlocks the full 25x15 lattice.",
      "accent"
    );
    this.syncUI();
  }

  showControls() {
    this.state = GAME_STATES.CONTROLS;
    this.overlaySelection = 0;
    this.setBanner(
      "> CONTROL MAP",
      "Discrete movement, deliberate planning, and fast resets.",
      "accent"
    );
    this.syncUI();
  }

  showHighScores() {
    this.bestScores = loadHighScores();
    this.bestScore = getBestScore(this.bestScores);
    this.state = GAME_STATES.HIGH_SCORES;
    this.overlaySelection = 0;
    this.setBanner(
      "> LOCAL BREACH LOGS",
      "Top five locally stored scores from completed checkpoints.",
      "accent"
    );
    this.syncUI();
  }

  resolvePlayerCell() {
    if (this.detectCollision()) {
      this.failLevel("> SECURITY BOT CONTACT", "Patrol intercepted your signal and reset the breach.");
      return;
    }

    const powerUp = this.level.collectPowerUpAt(this.player.row, this.player.col);

    if (powerUp) {
      this.applyPowerUp(powerUp);
    }

    if (this.level.collectNodeAt(this.player.row, this.player.col)) {
      this.audio.play("collect");
      this.setBanner(
        "> DATA NODE CAPTURED",
        `${this.level.collectedNodes}/${this.level.totalNodes} archives decrypted.`,
        "accent"
      );
    }

    if (this.level.collectedNodes === this.level.totalNodes) {
      this.completeLevel();
    }
  }

  applyPowerUp(powerUp) {
    if (powerUp.type === "debug") {
      this.debugSlowRemaining = 6;
      this.audio.play("debug");
      this.setBanner("> DEBUG MODE ENABLED", "Security patrols slowed for 6 seconds.", "accent");
      return;
    }

    if (powerUp.type === "blink") {
      this.player.grantBlinkCharge(1);
      this.audio.play("blink");
      this.setBanner("> BLINK MODULE LOADED", "Press Space to warp to a safer tile.", "accent");
    }
  }

  attemptBlink() {
    if (!this.player.useBlinkCharge()) {
      this.audio.play("block");
      this.setBanner("> BLINK UNAVAILABLE", "No teleport charges loaded on this run.", "warn");
      return;
    }

    const destination = this.findBlinkDestination();

    if (!destination) {
      this.player.grantBlinkCharge(1);
      this.audio.play("block");
      this.setBanner("> BLINK FAILED", "No safe cell was available for teleport routing.", "warn");
      return;
    }

    this.player.teleport(destination.row, destination.col);
    this.audio.play("blink");
    this.setBanner(
      "> BLINK JUMP EXECUTED",
      `Teleported to row ${destination.row + 1}, column ${destination.col + 1}.`,
      "accent"
    );
    this.resolvePlayerCell();
  }

  findBlinkDestination() {
    const candidates = [];

    for (let row = 0; row < this.level.rows; row += 1) {
      for (let col = 0; col < this.level.cols; col += 1) {
        if (!this.grid.isWalkable(row, col)) {
          continue;
        }

        const candidate = { row, col };

        if (isSameCell(candidate, this.player.position)) {
          continue;
        }

        if (this.bots.some((bot) => isSameCell(bot.position, candidate))) {
          continue;
        }

        const nearestBot = this.bots.length
          ? Math.min(...this.bots.map((bot) => manhattanDistance(candidate, bot.position)))
          : 8;
        const openness = this.countWalkableNeighbors(row, col);
        const nodeBonus = this.level.isNodeAt(row, col) ? 10 : 0;
        const distanceFromCurrent = manhattanDistance(candidate, this.player.position);
        const score = nearestBot * 18 + openness * 3 + nodeBonus + distanceFromCurrent;

        candidates.push({ candidate, score });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((left, right) => right.score - left.score);
    const pool = candidates.slice(0, Math.min(3, candidates.length));
    return pool[randomInt(0, pool.length - 1)].candidate;
  }

  countWalkableNeighbors(row, col) {
    const offsets = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];

    return offsets.reduce((count, offset) => {
      return count + (this.grid.isWalkable(row + offset.row, col + offset.col) ? 1 : 0);
    }, 0);
  }

  detectCollision() {
    return this.bots.some((bot) => isSameCell(bot.position, this.player.position));
  }

  stepBots() {
    const detectionRange = this.getCurrentBotDetectionRange();

    this.bots.forEach((bot) =>
      bot.update({
        grid: this.grid,
        playerPosition: this.player.position,
        detectionRange,
      })
    );

    if (this.detectCollision()) {
      this.failLevel("> TRACE DETECTED", "Security patrols locked onto your current cell.");
    }
  }

  getCurrentBotDetectionRange() {
    return getBotDetectionRange(this.levelIndex + 1, this.mode);
  }

  isBotChaseActive() {
    const detectionRange = this.getCurrentBotDetectionRange();

    if (detectionRange <= 0) {
      return false;
    }

    return this.bots.some((bot) =>
      bot.canDetectPlayer(this.grid, this.player.position, detectionRange)
    );
  }

  getCurrentBotStepInterval() {
    const debugMultiplier = this.debugSlowRemaining > 0 ? 1.85 : 1;
    const baseInterval = this.level.botInterval * debugMultiplier;

    if (this.mode !== "hard" || !this.isBotChaseActive()) {
      return baseInterval;
    }

    return Math.max(
      0.14,
      baseInterval / getBotChaseSpeedMultiplier(this.levelIndex + 1, this.mode)
    );
  }

  failLevel(reason, detail) {
    this.failureReason = reason;
    this.failureDetail = detail;
    this.state = GAME_STATES.GAME_OVER;
    this.overlaySelection = 0;
    this.audio.play("fail");
    this.setBanner(reason, detail, "danger");
  }

  completeLevel() {
    this.lastLevelScore = this.level.getCompletionScore(this.timeLeft);
    this.runScore += this.lastLevelScore;
    const lastLevelIndex = this.activeLevelConfigs.length - 1;

    if (this.levelIndex >= lastLevelIndex) {
      this.bestScores = recordHighScore({
        score: this.runScore,
        level: this.levelIndex + 1,
        note: "RUN COMPLETE",
        timestamp: new Date().toISOString(),
      });
      this.bestScore = getBestScore(this.bestScores);
      this.state = GAME_STATES.RUN_COMPLETE;
      this.overlaySelection = 0;
      this.audio.play("complete");
      this.setBanner(
        "> ROOT ACCESS ACQUIRED",
        `${this.modeLabel} campaign cleared. Final score ${this.runScore}.`,
        "accent"
      );
      return;
    }

    this.bestScores = recordHighScore({
      score: this.runScore,
      level: this.levelIndex + 1,
      note: "LEVEL CLEAR",
      timestamp: new Date().toISOString(),
    });
    this.bestScore = getBestScore(this.bestScores);
    this.state = GAME_STATES.LEVEL_COMPLETE;
    this.overlaySelection = 0;
    this.audio.play("level");
    this.setBanner(
      "> ACCESS GRANTED",
      `${this.level.name} breached in ${this.modeLabel}. +${this.lastLevelScore} score.`,
      "accent"
    );
  }

  start() {
    this.syncUI();
    window.requestAnimationFrame(this.gameLoop);
  }

  gameLoop = (timestamp) => {
    const deltaTime = this.lastTime === 0 ? 0 : (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    window.requestAnimationFrame(this.gameLoop);
  };

  update(deltaTime) {
    if (
      this.state === GAME_STATES.MENU ||
      this.state === GAME_STATES.CONTROLS ||
      this.state === GAME_STATES.HIGH_SCORES
    ) {
      this.updateBackdrop(deltaTime);
      this.syncUI();
      return;
    }

    if (this.state !== GAME_STATES.PLAYING) {
      this.syncUI();
      return;
    }

    this.timeLeft = Math.max(0, this.timeLeft - deltaTime);

    if (this.timeLeft <= 0) {
      this.failLevel("> ALARM LOCKDOWN", "Timer expired. The level was purged.");
      this.syncUI();
      return;
    }

    if (this.debugSlowRemaining > 0) {
      this.debugSlowRemaining = Math.max(0, this.debugSlowRemaining - deltaTime);
    }

    const botStepInterval = this.getCurrentBotStepInterval();
    this.botAccumulator += deltaTime;

    while (this.botAccumulator >= botStepInterval) {
      this.botAccumulator -= botStepInterval;
      this.stepBots();

      if (this.state !== GAME_STATES.PLAYING) {
        break;
      }
    }

    this.syncUI();
  }

  updateBackdrop(deltaTime) {
    if (this.bots.length === 0) {
      return;
    }

    this.previewAccumulator += deltaTime;

    if (this.previewAccumulator < 1.2) {
      return;
    }

    this.previewAccumulator = 0;
    this.bots.forEach((bot) => bot.update());
  }

  syncUI() {
    this.ui.setStatus(this.createHudText());
    this.ui.setMessage(this.banner.primary, this.banner.secondary, this.banner.tone);
    this.ui.setFooter(this.createFooterText());
  }

  createHudText() {
    if (this.state === GAME_STATES.MENU) {
      return {
        levelText: "LEVEL: MENU",
        dataText: `DATA: BEST ${this.bestScore}`,
        timeText: "TIME: READY",
      };
    }

    if (this.state === GAME_STATES.CONTROLS) {
      return {
        levelText: "LEVEL: HELP",
        dataText: "DATA: INPUT MAP",
        timeText: "TIME: TRAINING",
      };
    }

    if (this.state === GAME_STATES.HIGH_SCORES) {
      return {
        levelText: "LEVEL: LOGS",
        dataText: `DATA: TOP ${this.bestScores.length}`,
        timeText: "TIME: ARCHIVE",
      };
    }

    return {
      levelText: `LEVEL: ${this.modeLabel} ${this.levelIndex + 1}/${this.activeLevelConfigs.length}`,
      dataText: `DATA: ${this.level.collectedNodes}/${this.level.totalNodes}`,
      timeText: `TIME: ${formatTime(this.timeLeft)}`,
    };
  }

  createFooterText() {
    if (this.state === GAME_STATES.MENU) {
      return "ARROWS NAVIGATE | ENTER SELECT";
    }

    if (this.state === GAME_STATES.CONTROLS) {
      return "ESC OR ENTER TO RETURN";
    }

    if (this.state === GAME_STATES.HIGH_SCORES) {
      return "LOCAL STORAGE ENABLED | ESC TO RETURN";
    }

    if (this.state === GAME_STATES.PLAYING) {
      const debugText =
        this.debugSlowRemaining > 0
          ? `DEBUG ${this.debugSlowRemaining.toFixed(1)}S`
          : "DEBUG OFF";
      return `MODE ${this.modeLabel} | SCORE ${this.runScore} | BLINK ${this.player.blinkCharges} | ${debugText} | SPACE BLINK | P PAUSE | R RESTART`;
    }

    if (this.state === GAME_STATES.PAUSED) {
      return `PAUSED | MODE ${this.modeLabel} | SCORE ${this.runScore} | BLINK ${this.player.blinkCharges} | P RESUME | ESC MENU`;
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      return "ARROWS CHOOSE | ENTER CONFIRM | ESC MENU";
    }

    if (this.state === GAME_STATES.LEVEL_COMPLETE) {
      return "ARROWS CHOOSE | ENTER CONFIRM";
    }

    if (this.state === GAME_STATES.RUN_COMPLETE) {
      return `${this.modeLabel} FINAL ${this.runScore} | BEST ${this.bestScore}`;
    }

    return "";
  }

  render() {
    if (!this.grid) {
      return;
    }

    this.grid.render(this.ctx, {
      player: this.player,
      bots: this.bots,
    });

    if (this.state === GAME_STATES.PLAYING) {
      this.renderPlayfieldMeta();
      return;
    }

    if (this.state === GAME_STATES.PAUSED) {
      this.renderPlayfieldMeta();
      this.renderPanel({
        title: "LINK PAUSED",
        subtitle: `${this.modeLabel} breach suspended`,
        lines: [
          `Level ${this.levelIndex + 1}/${this.activeLevelConfigs.length}`,
          `Run score: ${this.runScore}`,
          `Time remaining: ${formatTime(this.timeLeft)}`,
        ],
        hint: "P / ENTER / SPACE TO RESUME | ESC TO RETURN TO MENU",
        tone: "warn",
      });
      return;
    }

    if (this.state === GAME_STATES.MENU) {
      this.renderPanel({
        title: "MAINFRAME BREACH",
        subtitle: "Single-player puzzle-racer",
        lines: [
          "EASY MODE  6 levels",
          "HARD MODE 10 levels",
          `Best local score: ${this.bestScore}`,
        ],
        linesAlign: "center",
        options: MAIN_MENU_OPTIONS.map((item) => item.label),
        hint: "ENTER TO DEPLOY",
      });
      return;
    }

    if (this.state === GAME_STATES.CONTROLS) {
      this.renderPanel({
        title: "CONTROL MAP",
        subtitle: "Terminal navigation protocol",
        lines: [
          "MOVE      Arrow Keys / WASD",
          "BLINK     Space (when a blink module is loaded)",
          "PAUSE     P",
          "RESTART   R",
          "OBJECTIVE Collect all data nodes before time hits 00:00",
          "WARNING   Touching a security bot resets the level",
          "HARD MODE Full grid, stronger detection, faster chase bursts",
        ],
        options: ["RETURN TO MENU"],
        hint: "ESC TO DISENGAGE",
      });
      return;
    }

    if (this.state === GAME_STATES.HIGH_SCORES) {
      const scoreLines =
        this.bestScores.length > 0
          ? this.bestScores.map((entry, index) => {
              return `${String(index + 1).padStart(2, "0")}  ${String(entry.score).padStart(5, "0")}  L${entry.level}  ${entry.note}`;
            })
          : ["NO LOCAL BREACH LOGS RECORDED YET."];

      this.renderPanel({
        title: "HIGH SCORES",
        subtitle: "localStorage archive",
        lines: scoreLines,
        options: ["RETURN TO MENU"],
        hint: "RUNS AUTO-SAVE AFTER EACH LEVEL CLEAR",
      });
      return;
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      this.renderPanel({
        title: "SYSTEM BREACH DETECTED",
        subtitle: this.failureReason.replace(/^>\\s*/, ""),
        lines: [
          this.failureDetail,
          `Run score: ${this.runScore}`,
          `Current level: ${this.levelIndex + 1}/${this.activeLevelConfigs.length}`,
        ],
        options: GAME_OVER_OPTIONS.map((item) => item.label),
        hint: "RETRY FROM THE CURRENT LEVEL OR RETURN TO MENU",
        tone: "danger",
      });
      return;
    }

    if (this.state === GAME_STATES.LEVEL_COMPLETE) {
      this.renderPanel({
        title: "ACCESS GRANTED",
        subtitle: `${this.level.name} compromised`,
        lines: [
          `Level score: +${this.lastLevelScore}`,
          `Run total: ${this.runScore}`,
          `Time remaining: ${formatTime(this.timeLeft)}`,
        ],
        linesAlign: "center",
        options: LEVEL_COMPLETE_OPTIONS.map((item) => item.label),
        hint: "PRESS ON TO THE NEXT SYSTEM",
      });
      return;
    }

    if (this.state === GAME_STATES.RUN_COMPLETE) {
      this.renderPanel({
        title: "ROOT ACCESS ACQUIRED",
        subtitle: "campaign clear",
        lines: [
          `Final score: ${this.runScore}`,
          `Best local score: ${this.bestScore}`,
          `Levels breached: ${this.activeLevelConfigs.length}/${this.activeLevelConfigs.length}`,
        ],
        options: RUN_COMPLETE_OPTIONS.map((item) => item.label),
        hint: "CAMPAIGN COMPLETE",
      });
    }
  }

  renderPlayfieldMeta() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(111, 207, 122, 0.75)";
    this.ctx.font = '14px "IBM Plex Mono", Consolas, monospace';
    this.ctx.textAlign = "left";
    this.ctx.fillText(`RUN SCORE ${this.runScore}`, 24, 122);
    this.ctx.fillText(`MOVES ${this.player.moves}`, 24, 144);

    if (this.debugSlowRemaining > 0) {
      this.ctx.fillStyle = "rgba(123, 220, 255, 0.82)";
      this.ctx.fillText(`DEBUG MODE ${this.debugSlowRemaining.toFixed(1)}S`, 24, 166);
    } else if (this.player.blinkCharges > 0) {
      this.ctx.fillStyle = "rgba(255, 209, 102, 0.82)";
      this.ctx.fillText(`BLINK CHARGES ${this.player.blinkCharges}`, 24, 166);
    }

    this.ctx.restore();
  }

  renderPanel({
    title,
    subtitle = "",
    lines = [],
    options = [],
    hint = "",
    tone = "accent",
    linesAlign = "left",
  }) {
    const panelWidth = Math.min(470, this.canvas.width - 80);
    const panelHeight = Math.min(420, 160 + lines.length * 24 + options.length * 30);
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = (this.canvas.height - panelHeight) / 2;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(2, 7, 2, 0.82)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "rgba(1, 6, 2, 0.92)";
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.ctx.strokeStyle =
      tone === "danger" ? "rgba(255, 122, 122, 0.55)" : "rgba(102, 255, 136, 0.45)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.textAlign = "center";
    this.ctx.fillStyle =
      tone === "danger" ? "rgba(255, 160, 160, 0.95)" : "rgba(102, 255, 136, 0.95)";
    this.ctx.font = '24px "IBM Plex Mono", Consolas, monospace';
    this.ctx.fillText(title, this.canvas.width / 2, panelY + 42);

    this.ctx.fillStyle = "rgba(159, 255, 168, 0.82)";
    this.ctx.font = '14px "IBM Plex Mono", Consolas, monospace';
    this.ctx.fillText(subtitle, this.canvas.width / 2, panelY + 72);

    this.ctx.textAlign = linesAlign === "center" ? "center" : "left";
    let currentY = panelY + 110;
    this.ctx.fillStyle = "rgba(183, 255, 180, 0.85)";
    const lineX = linesAlign === "center" ? this.canvas.width / 2 : panelX + 28;

    lines.forEach((line) => {
      this.ctx.fillText(line, lineX, currentY);
      currentY += 24;
    });

    if (options.length > 0) {
      currentY += 12;
      this.ctx.textAlign = "center";

      options.forEach((option, index) => {
        const isSelected = index === this.overlaySelection;
        this.ctx.fillStyle = isSelected
          ? "rgba(255, 209, 102, 0.95)"
          : "rgba(111, 207, 122, 0.85)";
        const prefix = isSelected ? ">" : " ";
        this.ctx.fillText(`${prefix} ${option}`, this.canvas.width / 2, currentY);
        currentY += 30;
      });
    }

    if (hint) {
      this.ctx.fillStyle = "rgba(111, 207, 122, 0.78)";
      this.ctx.font = '13px "IBM Plex Mono", Consolas, monospace';
      this.ctx.textAlign = "center";
      this.ctx.fillText(hint, this.canvas.width / 2, panelY + panelHeight - 22);
    }

    this.ctx.restore();
  }
}

async function bootstrapGame() {
  const canvas = document.getElementById("gameCanvas");
  const ui = new UI(document);
  const audio = new AudioManager();
  const sourceConfigs = await loadLevelConfigs();
  const easyConfigs = buildEasyModeConfigs(sourceConfigs);
  const hardConfigs = buildHardModeConfigs(sourceConfigs);
  const game = new Game({
    canvas,
    ui,
    audio,
    campaigns: {
      easy: easyConfigs,
      hard: hardConfigs,
    },
  });

  game.start();
  window.mainframeBreach = game;
}

if (typeof document !== "undefined") {
  bootstrapGame();
}
