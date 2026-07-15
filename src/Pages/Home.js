import { MovieCard } from "../components/MovieCard.js";
import { tmdbImage } from "../utils/images.js";
import { navigateTo } from "../router.js";

const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;

function buildApiUrl(endpoint) {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `https://api.themoviedb.org/3/${endpoint}${separator}api_key=${tmdbApiKey}&language=en-US&page=1`;
}

function buildCards(results, isSeries = false) {
  return (results || [])
    .map((item) => {
      const title = item.title || item.name || "Untitled";
      const year = (item.release_date || item.first_air_date || "").split("-")[0] || "N/A";
      const itemIsSeries = item.media_type ? item.media_type === "tv" : isSeries;

      return MovieCard({
        id: item.id,
        title,
        year,
        rating: item.vote_average,
        poster: tmdbImage(item.poster_path),
        isSeries: itemIsSeries,
      });
    })
    .join("");
}

export async function buildMediaRow(title, endpoint, options = {}) {
  const response = await fetch(buildApiUrl(endpoint));
  const data = await response.json();
  const cards = buildCards(data.results, Boolean(options.isSeries));

  return `
    <section class="media-row-section">
      <div class="section-title-row">
        <h2 class="section-heading">${title}</h2>
        ${options.kicker ? `<span class="section-kicker">${options.kicker}</span>` : ""}
      </div>
      <div class="movies-grid">
        ${cards}
      </div>
    </section>
  `;
}

export async function renderHomePage() {
  // Fetch a trending movie backdrop for the hero background
  let heroBackdrop = "";
  try {
    const trendingRes = await fetch(buildApiUrl("trending/all/day"));
    const trendingData = await trendingRes.json();
    const topResult = (trendingData.results || []).find((r) => r.backdrop_path);
    if (topResult) {
      heroBackdrop = tmdbImage(topResult.backdrop_path, "original");
    }
  } catch (e) {
    // silent fallback — hero will just have gradient
  }

  const [trendingRow, theatersRow, masterpiecesRow] = await Promise.all([
    buildMediaRow("Trending Now", "trending/all/day", { kicker: "Movies and series people are watching" }),
    buildMediaRow("In Theaters Now", "movie/now_playing", { kicker: "Fresh releases" }),
    buildMediaRow("Top Rated Masterpieces", "movie/top_rated", { kicker: "Critic favorites" }),
  ]);

  // Wire up the home hero search bar after render
  setTimeout(() => {
    const heroForm = document.getElementById("home-search-form");
    const heroInput = document.getElementById("home-search-input");
    if (heroForm && heroInput) {
      heroForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = heroInput.value.trim();
        if (q) {
          navigateTo(`/search?q=${encodeURIComponent(q)}&type=all`);
        }
      });
    }
  }, 0);

  return `
    <section class="home-hero">
      <div class="home-hero-backdrop" style="background-image: url('${heroBackdrop}')"></div>
      <div class="home-hero-overlay"></div>
      <div class="home-hero-content">
        <h1 class="home-hero-title">
          Your Next Favorite Movie,<br/>
          <span>Found by People.</span>
        </h1>
        <p class="home-hero-subtitle">
          Escape the algorithm. Discover cinema through human emotion
          and community expertise.
        </p>
        <form class="home-hero-search" id="home-search-form">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <path d="m20 20-3.5-3.5"></path>
          </svg>
          <input
            type="text"
            id="home-search-input"
            placeholder="Search movies, series, or people..."
            autocomplete="off"
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </section>

    <div class="container page-stack">
      ${trendingRow}
      ${theatersRow}
      ${masterpiecesRow}
    </div>
  `;
}
