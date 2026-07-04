import { fallbackPoster } from "../utils/images.js";

export function SeriesCard({ id, name, year, rating, poster }) {
  const imageUrl = poster || fallbackPoster;

  return `
    <div class="movie-card" data-id="${id}" data-type="tv">
      <div class="poster-container">
        <img src="${imageUrl}" alt="${name}" loading="lazy" class="poster-img">
        <span class="rating-badge">${Number(rating).toFixed(1)}</span>
      </div>
      <div class="card-info">
        <h3 class="card-title">${name}</h3>
        <p class="card-year">${year}</p>
        <a href="/tv/${id}" class="view-btn">View Series</a>
      </div>
    </div>
  `;
}
