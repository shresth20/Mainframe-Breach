import { formatTime } from "./utils.js";

export class UI {
  constructor(root = document) {
    this.levelValue = root.getElementById("levelValue");
    this.dataValue = root.getElementById("dataValue");
    this.timeValue = root.getElementById("timeValue");
    this.stateValue = root.getElementById("stateValue");
    this.subMessageValue = root.getElementById("subMessageValue");
    this.footerCopy = root.getElementById("footerCopy");
  }

  setStatus({
    levelText = "LEVEL: --",
    dataText = "DATA: --",
    timeText = `TIME: ${formatTime(0)}`,
  }) {
    this.levelValue.textContent = levelText;
    this.dataValue.textContent = dataText;
    this.timeValue.textContent = timeText;
  }

  setMessage(primary, secondary = "", tone = "accent") {
    this.stateValue.textContent = primary.startsWith(">") ? primary : `> ${primary}`;
    this.stateValue.dataset.tone = tone;
    this.subMessageValue.textContent = secondary;
  }

  setFooter(text = "") {
    if (this.footerCopy) {
      this.footerCopy.textContent = text;
    }
  }
}
