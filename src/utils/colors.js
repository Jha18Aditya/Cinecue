export function getRandomLightColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 20) + 70; // 70-90%
  const lightness = Math.floor(Math.random() * 20) + 75; // 75-95%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
