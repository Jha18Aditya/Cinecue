function svgDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildFallbackImage({ width, height, title, subtitle, compact = false }) {
  const centerX = width / 2;
  const centerY = height * (compact ? 0.42 : 0.38);
  const iconSize = compact ? 56 : 72;
  const titleY = height * (compact ? 0.7 : 0.66);
  const subtitleY = titleY + (compact ? 34 : 46);

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#101a31"/>
          <stop offset="0.5" stop-color="#071222"/>
          <stop offset="1" stop-color="#050816"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="55%">
          <stop stop-color="#6ee7ff" stop-opacity="0.22"/>
          <stop offset="1" stop-color="#6ee7ff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect width="${width}" height="${height}" fill="url(#glow)"/>
      <g opacity="0.24">
        <path d="M0 ${height * 0.18}H${width}" stroke="#ffffff" stroke-width="2"/>
        <path d="M0 ${height * 0.82}H${width}" stroke="#ffffff" stroke-width="2"/>
        <path d="M${width * 0.13} 0V${height}" stroke="#ffffff" stroke-width="2"/>
        <path d="M${width * 0.87} 0V${height}" stroke="#ffffff" stroke-width="2"/>
      </g>
      <g opacity="0.18">
        ${Array.from({ length: compact ? 8 : 10 }, (_, index) => {
          const y = 32 + index * (compact ? 38 : 58);
          return `
            <rect x="${width * 0.055}" y="${y}" width="${compact ? 18 : 24}" height="${compact ? 12 : 18}" rx="3" fill="#ffffff"/>
            <rect x="${width - width * 0.055 - (compact ? 18 : 24)}" y="${y}" width="${compact ? 18 : 24}" height="${compact ? 12 : 18}" rx="3" fill="#ffffff"/>
          `;
        }).join("")}
      </g>
      <circle cx="${centerX}" cy="${centerY}" r="${iconSize}" fill="#ffffff" fill-opacity="0.07" stroke="#6ee7ff" stroke-opacity="0.32" stroke-width="3"/>
      <path d="M${centerX - iconSize * 0.22} ${centerY - iconSize * 0.34}v${iconSize * 0.68}l${iconSize * 0.58}-${iconSize * 0.34}z" fill="#ffcc4d"/>
      <text x="${centerX}" y="${titleY}" text-anchor="middle" font-family="Source Sans 3, Segoe UI, Arial, sans-serif" font-size="${compact ? 34 : 42}" font-weight="900" fill="#eef2ff">CineCue</text>
      <text x="${centerX}" y="${subtitleY}" text-anchor="middle" font-family="Source Sans 3, Segoe UI, Arial, sans-serif" font-size="${compact ? 20 : 26}" font-weight="700" fill="#9fb0d1">${subtitle}</text>
    </svg>
  `);
}

export const fallbackPoster = buildFallbackImage({
  width: 500,
  height: 750,
  title: "Poster unavailable",
  subtitle: "Poster unavailable",
});

export const fallbackStill = buildFallbackImage({
  width: 640,
  height: 360,
  title: "Still unavailable",
  subtitle: "Still unavailable",
  compact: true,
});

export function tmdbImage(path, size = "w500", fallback = fallbackPoster) {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : fallback;
}
