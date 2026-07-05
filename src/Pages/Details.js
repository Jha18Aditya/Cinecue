import { fallbackPoster, tmdbImage } from "../utils/images.js";
import { formatRuntime } from "../utils/time.js";
import { isInWatchlist } from "../utils/watchlist.js";
import { getCloudRecommendations } from "../services/supabase.js";

let visibleRecommendationsCount = 5;
let loadedTmdbMovieRecommendations = [];
export let activePageCommunityRecs = [];

export let recommendation =
  JSON.parse(localStorage.getItem("matchcut_recommendations")) || [];

export function saveRecommendations() {
  localStorage.setItem(
    "matchcut_recommendations",
    JSON.stringify(recommendation),
  );
}

export function addLocalRecommendation(item) {
  recommendation.unshift(item);
  saveRecommendations();
}

export function removeLocalRecommendationById(id) {
  recommendation = recommendation.filter(
    (item) => String(item.id) !== String(id),
  );
  saveRecommendations();
}

export async function renderDetailsPage(movieId) {
  visibleRecommendationsCount = 5;
  loadedTmdbMovieRecommendations = [];

  const [movieResponse, creditsResponse] = await Promise.all([
    fetch(
      `/api/tmdb/movie/${movieId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&append_to_response=videos,watch/providers`,
    ),
    fetch(
      `/api/tmdb/movie/${movieId}/credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`,
    ),
  ]);
  const movieData = await movieResponse.json();
  const creditsData = await creditsResponse.json();
  const cast = (creditsData.cast || []).slice(0, 10);

  const launchYear = movieData.release_date
    ? movieData.release_date.split("-")[0]
    : "N/A";
  const backdropUrl = tmdbImage(
    movieData.backdrop_path,
    "original",
    fallbackPoster,
  );
  const posterUrl = tmdbImage(movieData.poster_path);
  const movieGenre = movieData.genres?.[0]?.name || "Movie";
  const runtime = formatRuntime(movieData.runtime);
  const isWatchlisted = isInWatchlist(movieData.id, "movie");
  const trailer =
    (movieData.videos?.results || []).find(
      (video) =>
        video.site === "YouTube" && video.type === "Trailer" && video.official,
    ) ||
    (movieData.videos?.results || []).find(
      (video) => video.site === "YouTube" && video.type === "Trailer",
    );

  const providersByRegion = movieData["watch/providers"]?.results || {};

  // FIX: Prioritize India (IN) first, then fall back to US, GB, CA, etc.
  const preferredRegion = providersByRegion.IN
    ? "IN"
    : providersByRegion.US
      ? "US"
      : providersByRegion.GB
        ? "GB"
        : providersByRegion.CA
          ? "CA"
          : Object.keys(providersByRegion)[0] || "";

  const watchProviders = preferredRegion
    ? providersByRegion[preferredRegion] || {}
    : {};
  const providerGroups = [
    watchProviders.flatrate || [],
    watchProviders.buy || [],
    watchProviders.rent || [],
  ].flat();
  const uniqueProviders = Array.from(
    new Map(
      providerGroups.map((provider) => [provider.provider_id, provider]),
    ).values(),
  );

  setTimeout(async () => await renderRecommendationGrid(movieId), 0);

  return `
    <section class="hero-section">
      <div class="hero-backdrop" style="background-image: url('${backdropUrl}')"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-poster">
          <img src="${posterUrl}" alt="${movieData.title}" referrerpolicy="no-referrer" />
        </div>
        <div class="hero-details-glass">
          <h1 class="hero-title">${movieData.title}</h1>
          <div class="hero-meta">
            <span class="badge">${launchYear}</span>
            <span class="badge rating-badge">&#9733; ${Number(movieData.vote_average || 0).toFixed(1)}</span>
            <span class="badge">${movieGenre}</span>
            ${runtime ? `<span class="badge">${runtime}</span>` : ""}
          </div>
          <div class="hero-actions">
            <button
              class="watchlist-btn ${isWatchlisted ? "is-saved" : ""}"
              type="button"
              data-watchlist-action
              data-id="${movieData.id}"
              data-media-type="movie"
              data-title="${escapeAttribute(movieData.title)}"
              data-poster-path="${movieData.poster_path || ""}"
              data-backdrop-path="${movieData.backdrop_path || ""}"
              data-release-date="${movieData.release_date || ""}"
              data-rating="${movieData.vote_average || 0}"
              aria-pressed="${isWatchlisted ? "true" : "false"}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h12v16l-6-4-6 4V4z"></path>
              </svg>
              <span>${isWatchlisted ? "In Watchlist" : "Add to Watchlist"}</span>
            </button>
          </div>
          <p class="hero-description">${movieData.overview || "No movie description summary available at this time."}</p>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="watch-providers">
        <h3>Where to Watch ${preferredRegion ? `(${preferredRegion})` : ""}</h3>
        ${
          uniqueProviders.length
            ? `
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
        `
            : `<p class="provider-empty">No provider data available for this title yet.</p>`
        }
      </div>

      ${
        trailer
          ? `
        <section class="trailer-section">
          <div class="section-title-row">
            <h2 class="section-heading">Trailer</h2>
            <span class="section-kicker">Watch before you dive in</span>
          </div>
          ${trailer ? `<div class="trailer-shell"><iframe src="https://www.youtube.com/embed/${trailer.key}" title="${movieData.title} trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>` : ""}
        </section>
      `
          : ""
      }

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

      <section class="recommendations-section">
        <div class="section-title-row">
          <h2 class="section-heading">Recommended For You</h2>
          <span class="section-kicker">Community ranked</span>
        </div>
        <div id="recommendations-container" class="movies-grid"></div>
        <div id="pagination-controls-wrapper" class="pagination-controls"></div>
        <form id="add-rec-form" class="add-rec-form">
          <div class="rec-search-field">
            <input id="rec-title-input" type="text" placeholder="Search movie to suggest..." autocomplete="off" />
            <div id="rec-search-results" class="rec-search-results hidden"></div>
          </div>
          <button type="submit">Add</button>
          <p id="rec-confirm-message" class="rec-confirm-message hidden"></p>
        </form>
      </section>
    </div>
  `;
}

export async function renderRecommendationGrid(movieId) {
  const movieIdInt = parseInt(movieId, 10);
  const recommendedContainer = document.querySelector(
    "#recommendations-container",
  );
  const controlsContainer = document.querySelector(
    "#pagination-controls-wrapper",
  );
  if (!recommendedContainer) return;

  activePageCommunityRecs = await getCloudRecommendations(movieIdInt);

  if (loadedTmdbMovieRecommendations.length === 0) {
    const response = await fetch(
      `/api/tmdb/movie/${movieIdInt}/recommendations?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US&page=1`,
    );
    const data = await response.json();
    loadedTmdbMovieRecommendations = data.results || [];
  }

  const customRecommendations = recommendation.filter(
    (item) => item.parentId === movieIdInt,
  );
  const cloudRecommendations = activePageCommunityRecs.map(
    normalizeCloudRecommendation,
  );
  const customIds = new Set(
    [...customRecommendations, ...cloudRecommendations].map((item) =>
      getRecommendationMediaId(item),
    ),
  );
  const apiRecommendations = loadedTmdbMovieRecommendations.filter(
    (item) => !customIds.has(item.id),
  );
  const allRecommendations = [
    ...cloudRecommendations,
    ...customRecommendations,
    ...apiRecommendations,
  ].sort((a, b) => {
    const typeA = a.media_type === "movie" ? 0 : 1;
    const typeB = b.media_type === "movie" ? 0 : 1;
    if (typeA !== typeB) return typeA - typeB; // movies first
    return getRecommendationScore(b) - getRecommendationScore(a); // then by score within same type
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
      : item.vote_average
        ? Math.round(item.vote_average * 10)
        : null;
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
    cardElement.setAttribute("data-media-type", item.media_type || "movie");
    cardElement.setAttribute(
      "data-poster",
      item.poster || tmdbImage(item.poster_path),
    );
    cardElement.setAttribute("data-poster-path", item.poster_path || "");
    cardElement.setAttribute(
      "data-release-date",
      item.release_date || item.first_air_date || "",
    );
    cardElement.setAttribute("data-year", recommendationYear);
    cardElement.setAttribute(
      "data-rating",
      item.vote_average || item.rating || 0,
    );
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
        renderRecommendationGrid(movieIdInt);
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

function getRecommendationMediaId(item) {
  return Number(item.tmdb_id || item.media_id || item.id);
}

function normalizeCloudRecommendation(item) {
  return {
    ...item,
    isCloudRecommendation: true,
    media_type: item.media_type || "movie",
    vote_average: item.rating || item.vote_average || 0,
    votes: Math.max(0, Number(item.votes || 0)),
    poster: item.poster || tmdbImage(item.poster_path),
  };
}
