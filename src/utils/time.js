export function formatRuntime(minutes) {
  const runtime = Number(minutes);
  if (!Number.isFinite(runtime) || runtime <= 0) return "";

  const hours = Math.floor(runtime / 60);
  const remainingMinutes = runtime % 60;

  if (!hours) return `${remainingMinutes}m`;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatRuntimeList(minutesList) {
  if (!Array.isArray(minutesList) || !minutesList.length) return "";
  const validRuntimes = minutesList
    .map((minutes) => Number(minutes))
    .filter((minutes) => Number.isFinite(minutes) && minutes > 0);

  if (!validRuntimes.length) return "";

  const averageRuntime = Math.round(
    validRuntimes.reduce((total, minutes) => total + minutes, 0) / validRuntimes.length,
  );
  return formatRuntime(averageRuntime);
}
