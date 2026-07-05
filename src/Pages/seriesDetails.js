import { fallbackPoster, tmdbImage } from "../utils/images.js";
import { formatRuntimeList } from "../utils/time.js";
import { isInWatchlist } from "../utils/watchlist.js";
import {
  getCloudRecommendations,
  normalizeCloudRecommendation,
} from "../services/supabase.js";

// ✅ ADD: needed to resolve correct id from both local and cloud recs
function getRecommendationMediaId(item) {
  return item.tmdb_id || item.id;
}

let visibleRecommendationsCount = 5;
let loadedTmdbSeriesRecommendations = [];
let activePageCommunityRecs = []; // ✅ ADD: module-level cloud recs store

export let recommendation =
  JSON.parse(localStorage.getItem("matchcut_recommendations")) || [];

export function saveRecommendations() {
  localStorage.setItem("matchcut_recommendations", JSON.stringify(recommendation));
}

export function addLocalRecommendation(item) {
  recommendation.unshift(item);
  saveRecommendations();
}

export function removeLocalRecommendationById(id) {
  recommendation = recommendation.filter((item) => String(item.id) !== String(id));
  saveRecommendations();
}

export async function renderSeriesDetailsPage(seriesId) {
  visibleRecommendationsCount = 5;
  loadedTmdbSeriesRecommendations = [];
  activePageCommunityRecs = []; // ✅ ADD: reset on page load

  const response = await fetch(
    `/api/tmdb/tv/${seriesId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=watch/providers,videos`,
  );
  const seriesData = await response.json();

  const creditsResponse = await fetch(
    `/api/tmdb/tv/${seriesId}/credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`,
  );
  const creditsData = await creditsResponse.json();
  const cast = (creditsData.cast || []).slice(0, 10);

  const launchYear = seriesData.first_air_date
    ? seriesData.first_air_date.split("-")[0]
    : "N/A";
  const seriesGenre = seriesData.genres?.[0]?.name || "TV Show";
  const episodeRuntime = formatRuntimeList(seriesData.episode_run_time);
  const isWatchlisted = isInWatchlist(seriesData.id, "tv");

  const providersByRegion = seriesData["watch/providers"]?.results || {};
  const preferredRegion = providersByRegion.IN
    ? "IN"
    : providersByRegion.US
      ? "US"
      : providersByRegion.GB
        ? "GB"
        : providersByRegion.CA
          ? "CA"
          : Object.keys(providersByRegion)[0] || "";
  const watchProviders = preferredRegion ? providersByRegion[preferredRegion] || {} : {};
  const providerGroups = [
    watchProviders.flatrate || [],
    watchProviders.buy || [],
    watchProviders.rent || [],
  ].flat();
  const uniqueProviders = Array.from(
    new Map(providerGroups.map((p) => [p.provider_id, p])).values(),
  );

  const videoResults = seriesData.videos?.results || [];
  const trailerVideo =
    videoResults.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    videoResults[0];
  const trailerKey = trailerVideo ? trailerVideo.key : null;

  setTimeout(async () => await renderRecommendationGrid(seriesId), 0);

  return `
    <section class="hero-section">
      <div class="hero-backdrop" style="background-image: url('${tmdbImage(seriesData.backdrop_path, "original", fallbackPoster)}')"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-poster">
          <img src="${tmdbImage(seriesData.poster_path)}" alt="${seriesData.name}" referrerpolicy="no-referrer" />
        </div>
        <div class="hero-details-glass">
          <h1 class="hero-title">${seriesData.name}</h1>
          <div class="hero-meta">
            <span class="badge">${launchYear}</span>
            <span class="badge rating-badge">&#9733; ${Number(seriesData.vote_average || 0).toFixed(1)}</span>
            <span class="badge">${seriesGenre}</span>
            ${episodeRuntime ? `<span class="badge">${episodeRuntime} episodes</span>` : ""}
          </div>
          <div class="hero-actions">
            <button
              class="watchlist-btn ${isWatchlisted ? "is-saved" : ""}"
              type="button"
              data-watchlist-action
              data-id="${seriesData.id}"
              data-media-type="tv"
              data-title="${escapeAttribute(seriesData.name)}"
              data-poster-path="${seriesData.poster_path || ""}"
              data-backdrop-path="${seriesData.backdrop_path || ""}"
              data-release-date="${seriesData.first_air_date || ""}"
              data-rating="${seriesData.vote_average || 0}"
              aria-pressed="${isWatchlisted ? "true" : "false"}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h12v16l-6-4-6 4V4z"></path>
              </svg>
              <span>${isWatchlisted ? "In Watchlist" : "Add to Watchlist"}</span>
            </button>
          </div>
          <p class="hero-description">${seriesData.overview || "No series description summary available at this time."}</p>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="watch-providers">
        <h3>Where to Watch ${preferredRegion ? `(${preferredRegion})` : ""}</h3>
        ${uniqueProviders.length ? `
          <div class="provider-row">
            ${uniqueProviders
              .map(
                (provider) => `
                  <span class="provider-pill" aria-label="${provider.provider_name}">
                    <img src="${tmdbImage(provider.logo_path, "w92")}" alt="${provider.provider_name}" loading="lazy" />
                    <span>${provider.provider_name}</span>
                  </span>
                `,
              )
              .join("")}
          </div>
        ` : `<p class="provider-empty">No provider data available for this title yet.</p>`}
      </div>

      <section class="cast-section">
        <h2 class="section-heading">Cast</h2>
        <div class="cast-grid">
          ${cast
            .map(
              (member) => `
                <a href="/person/${member.id}" class="cast-card nav-link" data-id="${member.id}">
                  <img src="${tmdbImage(member.profile_path, "w185")}" alt="${member.name}" loading="lazy" />
                  <div class="cast-info">
                    <h4>${member.name}</h4>
                    <p>${member.character}</p>
                  </div>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      ${trailerKey ? `
        <section class="trailer-section">
          <h2 class="section-heading" style="margin-bottom: 1rem;">Official Trailer</h2>
          <div class="trailer-shell">
            <iframe
              src="https://www.youtube.com/embed/${trailerKey}"
              title="${seriesData.name} Official Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
        </section>
      ` : ""}

      <section class="seasons-section">
        <div class="section-title-row">
          <h2 class="section-heading">Seasons</h2>
          <span class="section-kicker">${seriesData.number_of_episodes || 0} episodes</span>
        </div>
        <div class="seasons-grid">
          ${(seriesData.seasons || [])
            .map(
              (season) => `
                <a href="/series/${seriesId}/season/${season.season_number}" class="season-card nav-link">
                  <img src="${tmdbImage(season.poster_path, "w300")}" alt="${season.name}" loading="lazy" />
                  <div class="season-info">
                    <h4>${season.name}</h4>
                    <p>${season.episode_count || 0} Episodes</p>
                  </div>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="recommendations-section">
        <div class="section-title-row">
          <h2 class="section-heading">Recommended For You</h2>
          <span class="section-kicker">Community ranked</span>
        </div>
        <div id="recommendations-container" class="movies-grid"></div>
        <div id="pagination-controls-wrapper" class="pagination-controls"></div>
        <form id="add-rec-form" class="add-rec-form">
          <div class="rec-search-field">
            <input id="rec-title-input" type="text" placeholder="Search series to suggest..." autocomplete="off" />
            <div id="rec-search-results" class="rec-search-results hidden"></div>
          </div>
          <button type="submit">Add</button>
          <p id="rec-confirm-message" class="rec-confirm-message hidden"></p>
        </form>
      </section>
    </div>
  `;
}

export async function renderRecommendationGrid(seriesId) {
  const seriesIdInt = parseInt(seriesId, 10);
  const recommendedContainer = document.querySelector("#recommendations-container");
  const controlsContainer = document.querySelector("#pagination-controls-wrapper");
  if (!recommendedContainer) return;

  // ✅ FIX 1: Fetch cloud recs for this series
  activePageCommunityRecs = await getCloudRecommendations(seriesIdInt);

  if (loadedTmdbSeriesRecommendations.length === 0) {
    const response = await fetch(
      `/api/tmdb/tv/${seriesIdInt}/recommendations?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`,
    );
    const data = await response.json();
    loadedTmdbSeriesRecommendations = data.results || [];
  }

  const customRecommendations = recommendation.filter(
    (item) => item.parentId === seriesIdInt,
  );

  // ✅ FIX 2: Normalize cloud recs and merge them in
  const cloudRecommendations = activePageCommunityRecs.map(
    normalizeCloudRecommendation,
  );

  // ✅ FIX 3: Deduplicate across all three sources using getRecommendationMediaId
  const customIds = new Set(
    [...customRecommendations, ...cloudRecommendations].map((item) =>
      getRecommendationMediaId(item),
    ),
  );
  const apiRecommendations = loadedTmdbSeriesRecommendations.filter(
    (item) => !customIds.has(item.id),
  );

  const allRecommendations = [
    ...cloudRecommendations,    // cloud first so votes are live
    ...customRecommendations,
    ...apiRecommendations,
  ].sort((a, b) => {
    const typeA = a.media_type === "movie" ? 0 : 1;
    const typeB = b.media_type === "movie" ? 0 : 1;
    if (typeA !== typeB) return typeA - typeB;
    return getRecommendationScore(b) - getRecommendationScore(a);
  });

  const truncatedCollectionSlice = allRecommendations.slice(
    0,
    visibleRecommendationsCount,
  );

  recommendedContainer.innerHTML = "";

 truncatedCollectionSlice.forEach((item) => {
  const score = getRecommendationScore(item);
  const matchPercent = item.isCloudRecommendation
    ? null
    : (item.vote_average ? Math.round(item.vote_average * 10) : null);
  const displayVotes = Number(item.votes || 0);

  const isSeriesRecommendation =
    item.media_type === "tv" || item.media_type === "series";
  const recommendationMediaId = getRecommendationMediaId(item);
  const recommendationLink = isSeriesRecommendation
    ? `/series/${recommendationMediaId}`
    : `/movie/${recommendationMediaId}`;

    const recommendationTitle = item.title || item.name || "Untitled";
    const recommendationYear = item.release_date
      ? item.release_date.split("-")[0]
      : item.first_air_date
        ? item.first_air_date.split("-")[0]
        : item.year || "N/A";

    const cardElement = document.createElement("div");
    cardElement.className = "movie-card";
    cardElement.setAttribute("data-id", recommendationMediaId);
    cardElement.setAttribute("data-title", recommendationTitle);
    cardElement.setAttribute("data-media-type", item.media_type || "tv");
    cardElement.setAttribute("data-poster", item.poster || tmdbImage(item.poster_path));
    cardElement.setAttribute("data-poster-path", item.poster_path || "");
    cardElement.setAttribute("data-release-date", item.release_date || item.first_air_date || "");
    cardElement.setAttribute("data-year", recommendationYear);
    cardElement.setAttribute("data-rating", item.vote_average || item.rating || 0);

    // ✅ FIX 5: Mark cloud recs so vote handler can target them correctly
    if (item.isCloudRecommendation) {
      cardElement.setAttribute("data-is-cloud", "true");
    }

    cardElement.innerHTML = `
      <a href="${recommendationLink}" class="recommendation-link nav-link" data-id="${recommendationMediaId}">
        <div class="poster-container">
          <img src="${item.poster || tmdbImage(item.poster_path)}" alt="${recommendationTitle}" referrerpolicy="no-referrer" loading="lazy" />
        </div>
        <div class="card-body">
          <h3 class="card-title">${recommendationTitle}</h3>
          <p class="card-meta">${recommendationYear} | <span class="match-label">${isSeriesRecommendation ? "Series" : "Movie"}</span> | ${item.type || (matchPercent !== null ? `${matchPercent}% Match` : `${displayVotes} votes`)}</p>
        </div>
      </a>
      <div class="voting-control-wrapper">
        <button class="vote-btn up-action" data-id="${item.id}" aria-label="Upvote recommendation">▲</button>
      <span class="count">${displayVotes}</span>
        <button class="vote-btn down-action" data-id="${item.id}" aria-label="Downvote recommendation">▼</button>
      </div>
    `;
    recommendedContainer.appendChild(cardElement);
  });

  if (controlsContainer) {
    controlsContainer.innerHTML = "";
    if (allRecommendations.length > visibleRecommendationsCount) {
      const showMoreButton = document.createElement("button");
      showMoreButton.id = "load-more-recs-btn";
      showMoreButton.className = "view-btn";
      showMoreButton.innerText = "Show More Recommendations";
      showMoreButton.addEventListener("click", () => {
        visibleRecommendationsCount += 5;
        renderRecommendationGrid(seriesIdInt);
      });
      controlsContainer.appendChild(showMoreButton);
    }
  }
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function getRecommendationScore(item) {
  return Number(item.votes || 0);
}