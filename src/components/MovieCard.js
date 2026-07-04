import { fallbackPoster } from "../utils/images.js";

export function MovieCard(movie) {
  const link = movie.isSeries ? `/series/${movie.id}` : `/movie/${movie.id}`;
  const poster = movie.poster || fallbackPoster;
  const rating = Number(movie.rating || 0).toFixed(1);
  return `
    <a href="${link}" class="movie-card nav-link" data-id="${movie.id}">
      <div class="poster-container">
        <img src="${poster}" alt="${movie.title}" referrerpolicy="no-referrer" loading="lazy" />
      </div>
      <div class="card-body">
        <h3 class="card-title">${movie.title}</h3>
        <p class="card-meta">${movie.year} | Rating ${rating}</p>
      </div>
    </a>
  `;
}
