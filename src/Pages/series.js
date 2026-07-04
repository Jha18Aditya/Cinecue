import { buildMediaRow } from "./Home.js";

const seriesGenreMap = {
  drama: {
    title: "Drama Series",
    endpoint: "discover/tv?with_genres=18&sort_by=popularity.desc",
    kicker: "Character-driven stories",
  },
  crime: {
    title: "Crime & Mystery TV",
    endpoint: "discover/tv?with_genres=80&sort_by=popularity.desc",
    kicker: "Investigative picks",
  },
  fantasy: {
    title: "Fantasy TV",
    endpoint: "discover/tv?with_genres=10765&sort_by=popularity.desc",
    kicker: "Epic worldbuilding",
  },
  comedy: {
    title: "Comedy TV",
    endpoint: "discover/tv?with_genres=35&sort_by=popularity.desc",
    kicker: "Light and bingeable",
  },
  scifi: {
    title: "Sci-Fi TV",
    endpoint: "discover/tv?with_genres=10765&sort_by=vote_average.desc",
    kicker: "Future-forward stories",
  },
};

export async function renderSeriesPage(activeGenre = null) {
  const picked = activeGenre ? seriesGenreMap[activeGenre] : null;
  if (picked) {
    return `
      <div class="container page-stack">
        ${await buildMediaRow(picked.title, picked.endpoint, { kicker: picked.kicker, isSeries: true })}
      </div>
    `;
  }

  return `
    <div class="container page-stack">
        ${await buildMediaRow("Airing Today", "tv/airing_today", { kicker: "Fresh episodes" , isSeries: true })}
        ${await buildMediaRow("Popular TV Shows", "tv/popular", { kicker: "Audience favorites", isSeries: true })}
        ${await buildMediaRow("Top Rated Series", "tv/top_rated", { kicker: "Must-watch runs", isSeries: true })}
        ${await buildMediaRow("Crime & Mystery TV", "discover/tv?with_genres=80&sort_by=popularity.desc", { kicker: "Investigative picks", isSeries: true })}
    </div>
  `;
}
