import { MovieCard } from "../components/MovieCard.js";
import { buildMediaRow } from "./Home.js";

const movieGenreMap = {
  action: {
    title: "Action Blockbusters",
    endpoint: "discover/movie?with_genres=28&sort_by=popularity.desc",
    kicker: "High impact",
  },
  scifi: {
    title: "Sci-Fi & Fantasy",
    endpoint: "discover/movie?with_genres=878&sort_by=popularity.desc",
    kicker: "World builders",
  },
  horror: {
    title: "Horror Hits",
    endpoint: "discover/movie?with_genres=27&sort_by=popularity.desc",
    kicker: "Best nightmares",
  },
  comedy: {
    title: "Comedy Crowd-Pleasers",
    endpoint: "discover/movie?with_genres=35&sort_by=popularity.desc",
    kicker: "Easy watches",
  },
  animation: {
    title: "Animated Adventures",
    endpoint: "discover/movie?with_genres=16&sort_by=popularity.desc",
    kicker: "Stylized favorites",
  },
  romance: {
    title: "Romance Highlights",
    endpoint: "discover/movie?with_genres=10749&sort_by=popularity.desc",
    kicker: "Heart-first stories",
  },
  thriller: {
    title: "Thriller Essentials",
    endpoint: "discover/movie?with_genres=53&sort_by=popularity.desc",
    kicker: "High tension picks",
  },
};

export async function renderMoviePage(activeGenre = null) {
  const picked = activeGenre ? movieGenreMap[activeGenre] : null;
  if (picked) {
    return `
      <div class="container page-stack">
        ${await buildMediaRow(picked.title, picked.endpoint, { kicker: picked.kicker })}
      </div>
    `;
  }

  return `
    <div class="container page-stack">
        ${await buildMediaRow("Action Blockbusters", "discover/movie?with_genres=28&sort_by=popularity.desc", { kicker: "High impact" })}
        ${await buildMediaRow("Sci-Fi & Fantasy", "discover/movie?with_genres=878&sort_by=popularity.desc", { kicker: "World builders" })}
        ${await buildMediaRow("Horror Hits", "discover/movie?with_genres=27&sort_by=popularity.desc", { kicker: "Best nightmares" })}
        ${await buildMediaRow("Comedy Crowd-Pleasers", "discover/movie?with_genres=35&sort_by=popularity.desc", { kicker: "Easy watches" })}
    </div>
  `;
}
