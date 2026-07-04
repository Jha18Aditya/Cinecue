import { renderHomePage } from "./Pages/Home.js";
import { renderMoviePage } from "./Pages/movies.js";
import {
  renderDetailsPage,
  renderRecommendationGrid,
} from "./Pages/Details.js";
import { renderSeriesPage } from "./Pages/series.js";
import { renderSeriesDetailsPage } from "./Pages/seriesDetails.js";
import { renderGenresPage } from "./Pages/Genres.js";
import { renderWatchlistPage, initWatchlistPageEvents } from "./Pages/Watchlist.js";

const routes = {
  "/": async () => await renderHomePage(),
  "/movies": async (params) => await renderMoviePage(params.get("genre")),
  "/series": async (params) => await renderSeriesPage(params.get("genre")),
  "/genres": async () => await renderGenresPage(),
  "/watchlist": async () => renderWatchlistPage(),
  "/404": () => `<h1>404 - Page Not Found</h1>`,
};

export function addRoute(path, handler) {
  routes[path] = handler;
}

function renderPageLoader() {
  return `
    <div class="container page-loader-wrap">
      <div class="page-loader cinematic-loader" role="status" aria-live="polite">
        <span class="film-reel" aria-hidden="true">
          <i></i><i></i><i></i><i></i>
        </span>
        <span>Finding something worth watching...</span>
      </div>
    </div>
  `;
}

export async function handleRouting() {
  const viewport = document.querySelector("#app-viewport");
  if (!viewport) return;

  const currentPath = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  window.scrollTo(0, 0);

  const movieRouteMatch = currentPath.match(/^\/movie\/(\d+)$/);
  const seriesRouteMatch = currentPath.match(/^\/series\/(\d+)$/);
  const seasonRouteMatch = currentPath.match(/^\/series\/(\d+)\/season\/(\d+)$/);
  const episodeRouteMatch = currentPath.match(/^\/series\/(\d+)\/season\/(\d+)\/episode\/(\d+)$/);
  const personRouteMatch = currentPath.match(/^\/person\/(\d+)$/);
  const searchRouteMatch = currentPath === "/search";

  if (movieRouteMatch) {
    const movieId = parseInt(movieRouteMatch[1], 10);
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await renderDetailsPage(movieId);
    setTimeout(() => window.scrollTo(0, 0), 0);

  } else if (searchRouteMatch) {
    const query = searchParams.get("q");
    const type = searchParams.get("type") || "all";
    const { renderSearchPage } = await import("./Pages/Search.js");
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await renderSearchPage(query, type);
    setTimeout(() => window.scrollTo(0, 0), 0);

  } else if (episodeRouteMatch) {
    const seriesId = parseInt(episodeRouteMatch[1], 10);
    const seasonNumber = parseInt(episodeRouteMatch[2], 10);
    const episodeNumber = parseInt(episodeRouteMatch[3], 10);
    const { renderEpisodeDetailsPage } = await import("./Pages/episodeDetails.js");
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await renderEpisodeDetailsPage(seriesId, seasonNumber, episodeNumber);
    setTimeout(() => window.scrollTo(0, 0), 0);

  } else if (seasonRouteMatch) {
    const seriesId = parseInt(seasonRouteMatch[1], 10);
    const seasonNumber = parseInt(seasonRouteMatch[2], 10);
    const { renderSeasonDetailsPage } = await import("./Pages/seasonDetails.js");
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await renderSeasonDetailsPage(seriesId, seasonNumber);
    setTimeout(() => window.scrollTo(0, 0), 0);

  } else if (personRouteMatch) {
    const personId = parseInt(personRouteMatch[1], 10);
    const { renderPersonDetailsPage } = await import("./Pages/personDetails.js");
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await renderPersonDetailsPage(personId);
    setTimeout(() => window.scrollTo(0, 0), 0);

  } else if (seriesRouteMatch) {
    const seriesId = parseInt(seriesRouteMatch[1], 10);
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await renderSeriesDetailsPage(seriesId);
    setTimeout(() => window.scrollTo(0, 0), 0);

  } else {
    const viewGenerator = routes[currentPath] || routes["/404"];
    viewport.innerHTML = renderPageLoader();
    viewport.innerHTML = await viewGenerator(searchParams);

    // FIX: init watchlist page events after rendering
    if (currentPath === "/watchlist") {
      initWatchlistPageEvents();
    }
  }
}

export function navigateTo(path) {
  window.history.pushState(null, null, path);
  handleRouting();
}