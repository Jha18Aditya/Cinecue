export function getRandomLightColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 20) + 70; 
  const lightness = Math.floor(Math.random() * 20) + 75;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
