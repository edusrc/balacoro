const SAVE_KEY = "balacoro_save";

export function saveRun(snapshot) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function loadRun() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    return;
  }
}

export function hasRun() {
  return loadRun() != null;
}
