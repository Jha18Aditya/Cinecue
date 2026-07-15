import { MovieCard } from "../components/MovieCard.js";
import { fallbackPoster, tmdbImage } from "../utils/images.js";

function formatReadableDate(rawDate, prefix) {
  if (!rawDate) return `${prefix}: N/A`;
  const parsedDate = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return `${prefix}: N/A`;
  return `${prefix}: ${parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
}

export async function renderPersonDetailsPage(personId) {
  const [personResponse, creditsResponse, externalIdsResponse] = await Promise.all([
    fetch(
      `/api/tmdb/person/${personId}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`,
    ),
    fetch(
      `/api/tmdb/person/${personId}/combined_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`,
    ),
    fetch(
      `/api/tmdb/person/${personId}/external_ids?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=en-US`,
    ),
  ]);

  const person = await personResponse.json();
  const creditsData = await creditsResponse.json();
  const socialData = await externalIdsResponse.json();
  const knownFor = (creditsData.cast || [])
    .filter((item) => item.poster_path && (item.media_type === "movie" || item.media_type === "tv"))
    .slice(0, 12);
  const socialLinks = [
    socialData.instagram_id ? { label: "Instagram", className: "instagram", href: `https://www.instagram.com/${socialData.instagram_id}`, icon: instagramIcon() } : null,
    socialData.facebook_id ? { label: "Facebook", className: "facebook", href: `https://www.facebook.com/${socialData.facebook_id}`, icon: facebookIcon() } : null,
    socialData.twitter_id ? { label: "Twitter", className: "twitter", href: `https://x.com/${socialData.twitter_id}`, icon: twitterIcon() } : null,
  ].filter(Boolean);

  return `
    <section class="hero-section person-hero">
      <div class="hero-backdrop" style="background-image: url('${tmdbImage(person.profile_path, "original", fallbackPoster)}')"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-poster">
          <img src="${tmdbImage(person.profile_path, "w500", fallbackPoster)}" alt="${person.name}" />
        </div>
        <div class="hero-details-glass">
          <h1 class="hero-title">${person.name}</h1>
          <div class="hero-meta">
            <span class="badge">${person.known_for_department || "Person"}</span>
          </div>
          <div class="person-detail-grid">
            <div class="person-bio-panel">
              <h2>Biography</h2>
              <p class="hero-description person-biography">${person.biography || "No biography available yet."}</p>
            </div>
            <div class="person-facts-panel">
              <h2>Details</h2>
              <dl>
                <div><dt>Born</dt><dd>${formatReadableDate(person.birthday, "Born").replace("Born: ", "")}</dd></div>
                <div><dt>Place</dt><dd>${person.place_of_birth || "N/A"}</dd></div>
                <div><dt>Known For</dt><dd>${person.known_for_department || "N/A"}</dd></div>
              </dl>
            </div>
          </div>
          ${socialLinks.length ? `
            <div class="social-links">
              ${socialLinks
                .map(
                  (social) => `
                    <a href="${social.href}" class="social-link ${social.className}" target="_blank" rel="noreferrer" aria-label="${social.label}">${social.icon}</a>
                  `,
                )
                .join("")}
            </div>
          ` : ""}
        </div>
      </div>
    </section>

    <div class="container">
      <section class="cast-section">
        <h2 class="section-heading">Known For</h2>
        <div class="movies-grid">
          ${knownFor
            .map((item) =>
              MovieCard({
                id: item.id,
                title: item.title || item.name,
                year: (item.release_date || item.first_air_date || "").split("-")[0] || "N/A",
                rating: item.vote_average,
                poster: tmdbImage(item.poster_path),
                isSeries: item.media_type === "tv",
              }),
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

export function instagramIcon() {
  return `
    <img src="/assets/instagram.svg" alt="Instagram" class="social-icon-img" loading="lazy" />
  `;
}

export function facebookIcon() {
  return `
    <img src="/assets/facebook.svg" alt="Facebook" class="social-icon-img" loading="lazy" />
  `;
}

export function twitterIcon() {
  return `
    <img src="/assets/twitter.svg" alt="Twitter" class="social-icon-img" loading="lazy" />
  `;
}
