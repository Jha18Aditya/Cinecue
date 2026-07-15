import { fallbackPoster, fallbackStill, tmdbImage } from "../utils/images.js";
import { formatRuntime } from "../utils/time.js";

export async function renderEpisodeDetailsPage(seriesId, seasonNumber, episodeNumber) {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`,
  );
  const episode = await response.json();

  const stillUrl = tmdbImage(episode.still_path, "original", fallbackStill);
  const guestStars = episode.guest_stars || [];
  const crew = episode.crew || [];
  const runtime = formatRuntime(episode.runtime);

  return `
    <section class="hero-section episode-detail-hero">
      <div class="hero-backdrop" style="background-image: url('${stillUrl}')"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="episode-still-poster">
          <img src="${stillUrl}" alt="${episode.name}" />
        </div>
        <div class="hero-details-glass">
          <a href="/series/${seriesId}/season/${seasonNumber}" class="back-link nav-link">Back to season</a>
          <h1 class="hero-title">${episode.name}</h1>
          <div class="hero-meta">
            <span class="badge">Season ${seasonNumber}</span>
            <span class="badge">Episode ${episode.episode_number || episodeNumber}</span>
            <span class="badge rating-badge">&#9733; ${Number(episode.vote_average || 0).toFixed(1)}</span>
            <span class="badge">${episode.air_date || "Air date N/A"}</span>
            ${runtime ? `<span class="badge">${runtime}</span>` : ""}
          </div>
          <p class="hero-description">${episode.overview || "No episode overview available yet."}</p>
        </div>
      </div>
    </section>

    <div class="container">
      <section class="cast-section">
        <h2 class="section-heading">Guest Stars</h2>
        <div class="cast-grid">
          ${renderPeopleCards(guestStars, "character")}
        </div>
      </section>
      <section class="cast-section">
        <h2 class="section-heading">Crew</h2>
        <div class="cast-grid">
          ${renderPeopleCards(crew, "job")}
        </div>
      </section>
    </div>
  `;
}

function renderPeopleCards(people, roleKey) {
  if (!people.length) {
    return `<p class="empty-state">No people listed yet.</p>`;
  }

  return people
    .map(
      (person) => `
        <a href="/person/${person.id}" class="cast-card person-card nav-link">
          <img src="${tmdbImage(person.profile_path, "w185", fallbackPoster)}" alt="${person.name}" loading="lazy" />
          <div class="cast-info">
            <h4>${person.name}</h4>
            <p>${person[roleKey] || "Credits"}</p>
          </div>
        </a>
      `,
    )
    .join("");
}
