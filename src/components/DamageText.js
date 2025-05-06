import { createFloatingText } from "./createFloatingText";
export function showDamageText(amount, worldPos) {
  const text = createFloatingText(`-${amount} HP`, "#f00", worldPos, 60);
  document.body.appendChild(text);
}
