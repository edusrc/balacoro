const COINS_KEY = "balacoro_coins";
const OWNED_KEY = "balacoro_owned";

export function getCoins() {
  try {
    return Math.max(0, parseInt(localStorage.getItem(COINS_KEY), 10) || 0);
  } catch {
    return 0;
  }
}

export function addCoins(amount) {
  const value = Math.max(0, Math.floor(amount));
  if (value === 0) return;
  try {
    localStorage.setItem(COINS_KEY, String(getCoins() + value));
  } catch {
    return;
  }
}

export function spendCoins(amount) {
  const current = getCoins();
  if (current < amount) return false;
  try {
    localStorage.setItem(COINS_KEY, String(current - amount));
  } catch {
    return false;
  }
  return true;
}

function getOwnedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(OWNED_KEY)) ?? []);
  } catch {
    return new Set();
  }
}

export function isOwned(kind, id) {
  if (id === "none") return true;
  return getOwnedSet().has(`${kind}:${id}`);
}

export function unlockCosmetic(kind, id) {
  const owned = getOwnedSet();
  owned.add(`${kind}:${id}`);
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify([...owned]));
  } catch {
    return;
  }
}
