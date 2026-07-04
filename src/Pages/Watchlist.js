import { MovieCard } from "../components/MovieCard.js";
import { getWatchlist, removeFromWatchlist } from "../utils/watchlist.js";
import { tmdbImage } from "../utils/images.js";

export function renderWatchlistPage() {
  const watchlist = getWatchlist();

  const cards = watchlist.map((item) => {
    const route = item.media_type === "tv" ? "series" : "movie";
    const poster = tmdbImage(item.poster_path);
    const year = item.release_date ? item.release_date.split("-")[0] : "N/A";

    return `
      <div class="movie-card watchlist-card" data-id="${item.id}" data-media-type="${item.media_type}">
        <div class="watchlist-card-menu">
          <button class="watchlist-menu-trigger" aria-label="Options" aria-expanded="false">
            &#8942;
          </button>
          <div class="watchlist-menu-dropdown hidden">
            <button class="watchlist-remove-btn" data-id="${item.id}" data-media-type="${item.media_type}">
              Remove from Watchlist
            </button>
          </div>
        </div>
        <a href="/${route}/${item.id}" class="nav-link">
          <div class="poster-container">
            <img src="${poster}" alt="${item.title || "Untitled"}" loading="lazy" />
          </div>
          <div class="card-body">
            <h3 class="card-title">${item.title || "Untitled"}</h3>
            <p class="card-meta">${item.media_type === "tv" ? "Series" : "Movie"} | ${year}</p>
          </div>
        </a>
      </div>
    `;
  });

  return `
    <div class="container page-stack">
      <div class="section-title-row">
        <div>
          <h1 class="page-heading">Watchlist</h1>
          <span class="section-kicker">${watchlist.length} saved ${watchlist.length === 1 ? "title" : "titles"}</span>
        </div>
      </div>
      ${
        cards.length
          ? `<div class="movies-grid watchlist-grid" id="watchlist-grid">${cards.join("")}</div>`
          : `<p class="empty-state">Your watchlist is empty. Add movies or series from their detail pages.</p>`
      }
    </div>
  `;
}

// ── Watchlist page event delegation ─────────────────────────────
// Call this once after renderWatchlistPage() is injected into the DOM
export function initWatchlistPageEvents() {
  const grid = document.querySelector("#watchlist-grid");
  if (!grid) return;

  grid.addEventListener("click", async (e) => {
    // 3-dot menu trigger
    const trigger = e.target.closest(".watchlist-menu-trigger");
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const dropdown = trigger.nextElementSibling;
      const isOpen = !dropdown.classList.contains("hidden");

      // Close all other open dropdowns first
      grid.querySelectorAll(".watchlist-menu-dropdown").forEach((d) => {
        d.classList.add("hidden");
        d.previousElementSibling?.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        dropdown.classList.remove("hidden");
        trigger.setAttribute("aria-expanded", "true");
      }
      return;
    }

    // Remove button
    const removeBtn = e.target.closest(".watchlist-remove-btn");
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = removeBtn.dataset.id;
      const mediaType = removeBtn.dataset.mediaType;
      await removeFromWatchlist(id, mediaType);

      // Remove card from DOM instantly
      const card = removeBtn.closest(".watchlist-card");
      card?.remove();

      // Update count
      const remaining = grid.querySelectorAll(".watchlist-card").length;
      const kicker = document.querySelector(".section-kicker");
      if (kicker) {
        kicker.textContent = `${remaining} saved ${remaining === 1 ? "title" : "titles"}`;
      }
      if (remaining === 0) {
        grid.outerHTML = `<p class="empty-state">Your watchlist is empty. Add movies or series from their detail pages.</p>`;
      }
      return;
    }

    // Close dropdowns when clicking outside
    if (!e.target.closest(".watchlist-card-menu")) {
      grid.querySelectorAll(".watchlist-menu-dropdown").forEach((d) => {
        d.classList.add("hidden");
        d.previousElementSibling?.setAttribute("aria-expanded", "false");
      });
    }
  });
}