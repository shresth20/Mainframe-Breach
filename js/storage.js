const HIGH_SCORE_KEY = "mainframe-breach-highscores-v1";
const DESKTOP_NOTICE_KEY = "mainframe-breach-desktop-notice-v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadHighScores() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => Number.isFinite(entry.score));
  } catch (error) {
    console.warn("Unable to load local high scores.", error);
    return [];
  }
}

export function saveHighScores(scores) {
  if (!canUseStorage()) {
    return scores;
  }

  window.localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
  return scores;
}

export function recordHighScore(entry) {
  const current = loadHighScores();
  const next = [...current, entry]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return String(right.timestamp).localeCompare(String(left.timestamp));
    })
    .slice(0, 5);

  return saveHighScores(next);
}

export function getBestScore(scores = loadHighScores()) {
  return scores[0]?.score ?? 0;
}

export function hasSeenDesktopNotice() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(DESKTOP_NOTICE_KEY) === "seen";
  } catch (error) {
    console.warn("Unable to read desktop notice state.", error);
    return false;
  }
}

export function markDesktopNoticeSeen() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(DESKTOP_NOTICE_KEY, "seen");
    return true;
  } catch (error) {
    console.warn("Unable to save desktop notice state.", error);
    return false;
  }
}
