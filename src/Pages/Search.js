import { MovieCard } from "../components/MovieCard.js";
import { tmdbImage } from "../utils/images.js";

const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;

export async function search(query, type) {
  const response = await fetch(
    `/api/tmdb/search/${type}?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&language=en-US`,
  );
  const data = await response.json();
  return data.results || [];
}

function normalizeFilterType(type) {
  if (type === "series") return "tv";
  return type || "all";
}

export async function renderSearchPage(query, type = "all") {
  const activeType = normalizeFilterType(type);
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "movie", label: "Movies" },
    { value: "tv", label: "Series" },
    { value: "person", label: "People" },
  ];
  const activeFilterLabel = filterOptions.find((option) => option.value === activeType)?.label || "All";

  const searchFormHTML = `
    <form class="search-page-form">
      <div class="search-combo">
        <input id="search-type-select" class="search-filter-value" type="hidden" value="${activeType}" />
        <div class="custom-filter-select" data-search-filter>
          <button class="filter-select-button" type="button" aria-haspopup="listbox" aria-expanded="false">
            <span>${activeFilterLabel}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <div class="filter-select-menu" role="listbox">
            ${filterOptions
              .map(
                (option) => `
                  <button
                    class="filter-select-option ${option.value === activeType ? "is-selected" : ""}"
                    type="button"
                    data-value="${option.value}"
                    role="option"
                    aria-selected="${option.value === activeType ? "true" : "false"}"
                  >${option.label}</button>
                `,
              )
              .join("")}
          </div>
        </div>
        <input type="text" id="search-page-input" placeholder="Search movies, series, or people" autocomplete="off" value="${query || ''}" />
      </div>
    </form>
  `;

  if (query) {
    setTimeout(() => updateSearchResults(query, activeType), 0);
  }

  return `
    <div class="container page-stack">
      <div class="section-title-row">
        <h1 class="page-heading">Search</h1>
      </div>
      ${searchFormHTML}
      <section class="results-section">
        ${!query ? '<p class="empty-state">Please enter a search term to find movies, TV shows, and people.</p>' : ''}
      </section>
    </div>
  `;
}

export async function updateSearchResults(query, type = "all") {
  const resultsContainer = document.querySelector('.results-section');
  if (!resultsContainer) return;
  
  if (!query) {
    resultsContainer.innerHTML = '<p class="empty-state">Please enter a search term to find movies, TV shows, and people.</p>';
    return;
  }
  
  resultsContainer.innerHTML = `
    <div class="page-loader-wrap">
      <div class="page-loader cinematic-loader">
        <span class="film-reel" aria-hidden="true">
          <i></i><i></i><i></i><i></i>
        </span>
        <span>Searching the watchlist for "${query}"...</span>
      </div>
    </div>
  `;

  const activeType = normalizeFilterType(type);
  const results =
    activeType === "all"
      ? (
          await Promise.all([
            search(query, "movie").then((items) => items.map((item) => ({ ...item, media_type: "movie" }))),
            search(query, "tv").then((items) => items.map((item) => ({ ...item, media_type: "tv" }))),
            search(query, "person").then((items) => items.map((item) => ({ ...item, media_type: "person" }))),
          ])
        ).flat()
      : (await search(query, activeType)).map((item) => ({
          ...item,
          media_type: activeType,
        }));

  const currentInput = document.querySelector("#search-page-input");
  if (currentInput && currentInput.value.trim() !== query) return;

  resultsContainer.innerHTML = `
    <div class="section-title-row">
      <h2 class="section-heading">Results for "${query}"</h2>
      <span class="section-kicker">${activeType === "all" ? "All media" : activeType === "tv" ? "Series" : activeType === "person" ? "People" : "Movies"}</span>
    </div>
    <div class="movies-grid">
      ${results.length > 0 ? results.map((item) => {
        if (item.media_type === "person") {
          return `
            <a href="/person/${item.id}" class="cast-card nav-link" data-id="${item.id}">
              <img src="${tmdbImage(item.profile_path, "w185")}" alt="${item.name}" loading="lazy" />
              <div class="cast-info">
                <h4>${item.name}</h4>
                <p>${item.known_for_department || "Person"}</p>
              </div>
            </a>
          `;
        }
        return MovieCard({
          id: item.id,
          title: item.title || item.name,
          year: (item.release_date || item.first_air_date || "").split("-")[0] || "N/A",
          rating: item.vote_average,
          poster: tmdbImage(item.poster_path),
          isSeries: item.media_type === "tv",
        });
      }).join("") : '<p class="empty-state">No results found.</p>'}
    </div>
  `;
}
