const STORAGE_KEY = "balacoro_customization";

export const DEFAULT_CUSTOMIZATION = {
  color: 0xffee00,
  projectileColor: 0x00ff00,
  hat: "none",
  glasses: "none",
  ears: "none",
};

export function loadCustomization() {
  try {
    const storedCustomization = localStorage.getItem(STORAGE_KEY);
    if (!storedCustomization) {
      return { ...DEFAULT_CUSTOMIZATION };
    }
    return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(storedCustomization) };
  } catch {
    return { ...DEFAULT_CUSTOMIZATION };
  }
}

export function saveCustomization(customization) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
  } catch {
    return;
  }
}
