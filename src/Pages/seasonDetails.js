import { fallbackStill, tmdbImage } from "../utils/images.js";
import { formatRuntime } from "../utils/time.js";

export async function renderSeasonDetailsPage(seriesId, seasonNumber) {
  const response = await fetch(
    `/api/tmdb/tv/${seriesId}/season/${seasonNumber}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`
  );
  const seasonData = await response.json();

  const episodes = seasonData.episodes || [];

  return `
    <div class="container">
      <div class="season-page-header">
        <a href="/series/${seriesId}" class="back-link nav-link">Back to series</a>
        <h2 class="page-heading">${seasonData.name}</h2>
        <p>${episodes.length} episodes</p>
      </div>
      <div class="episodes-grid">
        ${episodes
          .map((episode) => {
            const runtime = formatRuntime(episode.runtime);
            return `
          <div class="episode-card">
            <a href="/series/${seriesId}/season/${seasonNumber}/episode/${episode.episode_number}" class="nav-link">
              <img src="${tmdbImage(episode.still_path, "w500", fallbackStill)}" alt="${episode.name}" loading="lazy" />
              <div class="episode-card-body">
                <span class="episode-number">Episode ${episode.episode_number}</span>
                <h3 class="episode-card-title">${episode.name}</h3>
                ${runtime ? `<p class="episode-card-runtime">${runtime}</p>` : ""}
                <p class="episode-card-overview">${episode.overview || "No overview available yet."}</p>
              </div>
            </a>
          </div>
        `;
          })
          .join("")}
      </div>
    </div>
  `;
}
