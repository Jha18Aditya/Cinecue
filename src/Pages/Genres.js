function genreArt(title, from, to, symbol) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="900" height="900" fill="url(#g)"/>
      <circle cx="710" cy="190" r="120" fill="#fff" opacity=".16"/>
      <circle cx="190" cy="710" r="180" fill="#000" opacity=".18"/>
      <text x="450" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="190" font-weight="800" fill="#fff">${symbol}</text>
      <text x="450" y="560" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" font-weight="800" fill="#fff">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const genres = [
  {
    title: "Action",
    href: "/movies?genre=action",
    description: "Big energy, fast pacing",
    image: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Sci-Fi",
    href: "/movies?genre=scifi",
    description: "Future worlds and bold ideas",
    image: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Horror",
    href: "/movies?genre=horror",
    description: "Haunted houses and nightmare tension",
    image: "https://wordpress.bigissue.com/wp-content/uploads/2023/09/haunted-house-7508035_1920.jpg",
  },
  {
    title: "Drama",
    href: "/series?genre=drama",
    description: "Character-driven stories",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Crime",
    href: "/series?genre=crime",
    description: "Investigation and suspense",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Animation",
    href: "/movies?genre=animation",
    description: "Stylized and inventive",
    image: "https://tse2.mm.bing.net/th/id/OIP.jlYDZkFIM9Io6RaB5IUZ1AHaHa?r=0&cb=thfc1falcon4&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    title: "Comedy",
    href: "/movies?genre=comedy",
    description: "Feel-good and laugh-heavy",
    image: "https://images.unsplash.com/photo-1496275068113-fff8c90750d1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Romance",
    href: "/movies?genre=romance",
    description: "Heartfelt and emotional",
    image: "https://images.unsplash.com/photo-1474552226712-ac0f0961a954?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Thriller",
    href: "/movies?genre=thriller",
    description: "Suspense with edge",
    image: "https://as1.ftcdn.net/jpg/04/13/18/64/1000_F_413186499_hMMRax8FRShAQYsX9qOQ3pGZcqGiYqV5.jpg",
  },
  {
    title: "Fantasy TV",
    href: "/series?genre=fantasy",
    description: "Magic and legends",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Comedy TV",
    href: "/series?genre=comedy",
    description: "Binge-worthy laughs",
    image: "https://tse1.mm.bing.net/th/id/OIP.bEOn2C2-ZCcl3OkItO2CtwHaLH?r=0&cb=thfc1falcon4&w=480&h=720&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    title: "Sci-Fi TV",
    href: "/series?genre=scifi",
    description: "Future tech and worlds",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80",
  },
];

export async function renderGenresPage() {
  return `
    <div class="container page-stack">
      <section class="media-row-section">
        <div class="section-title-row">
          <h1 class="page-heading">Genres</h1>
          <span class="section-kicker">Browse the catalog</span>
        </div>
        <div class="genres-grid">
          ${genres
            .map(
              (genre) => `
                <a href="${genre.href}" class="genre-card nav-link" style="background-image: linear-gradient(180deg, rgba(8, 12, 24, 0.45), rgba(8, 12, 24, 0.95)), url('${genre.image}')">
                  <h2>${genre.title}</h2>
                  <p>${genre.description}</p>
                </a>
              `,
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}
