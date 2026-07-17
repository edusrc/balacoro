const STORAGE_KEY = "balacoro_customization";

export const DEFAULT_CUSTOMIZATION = {
  color: 0xffee00,
  projectileColor: 0x00ff00,
  accessories: [],
};

export function loadCustomization() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) {
      return { ...DEFAULT_CUSTOMIZATION };
    }
    const accessories = Array.isArray(stored.accessories)
      ? stored.accessories
      : [stored.hat, stored.glasses, stored.ears].filter(
          (id) => id && id !== "none"
        );
    return {
      color: stored.color ?? DEFAULT_CUSTOMIZATION.color,
      projectileColor:
        stored.projectileColor ?? DEFAULT_CUSTOMIZATION.projectileColor,
      accessories,
    };
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
