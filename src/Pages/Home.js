import { MovieCard } from "../components/MovieCard.js";
import { tmdbImage } from "../utils/images.js";

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
  const [trendingRow, theatersRow, masterpiecesRow] = await Promise.all([
    buildMediaRow("Trending Now", "trending/all/day", { kicker: "Movies and series people are watching" }),
    buildMediaRow("In Theaters Now", "movie/now_playing", { kicker: "Fresh releases" }),
    buildMediaRow("Top Rated Masterpieces", "movie/top_rated", { kicker: "Critic favorites" }),
  ]);

  return `
    <div class="container page-stack">
      ${trendingRow}
      ${theatersRow}
      ${masterpiecesRow}
    </div>
  `;
}
