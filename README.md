# CineCue 🎬

> A community-driven movie and TV series discovery platform where users explore, recommend, and vote on content together.

**Live Demo →** [cinecue-vert.vercel.app](https://cinecue-vert.vercel.app)

---

## What is CineCue?

CineCue is a full-stack web application that combines a real-time movie database with community-powered recommendations. Users can discover trending movies and series, dive into cast and episode details, add their own recommendations to any title, and vote on what others suggest — all without writing a single password.

The app is built entirely with **Vanilla JavaScript** (no frameworks) and backed by **Supabase** for cloud storage and **Google OAuth** for secure login.

---

## How It Works

### Discovering Content
The home page pulls live trending data from the TMDB API — movies in theaters, top-rated series, and genre-based collections. Every card links to a rich detail page with backdrop hero, cast carousel, trailer embed, watch providers (Netflix, Prime, etc.), and season/episode guides.

### Community Recommendations
On any movie or series detail page, users can suggest related titles they think others would enjoy. These suggestions are stored in Supabase and shared across all users in real time. Every recommendation has upvote/downvote buttons — the community collectively ranks what rises to the top.

### Authentication
Login is handled entirely through Google OAuth via Supabase. No passwords, no email verification — one click and you are in. The session is stored in localStorage and syncs your watchlist and recommendations across devices.

### Watchlist
Logged-in users can save any title to their watchlist. The list is stored both locally (for offline access) and in Supabase (for cloud sync). On login, cloud data overwrites local to stay in sync. The dashboard shows your full watchlist and every recommendation you have personally added.

---

## Features

- **Cinematic UI** — Dark immersive design with glassmorphism panels, backdrop hero images, and smooth transitions
- **Real-time Data** — All movie and series data fetched live from TMDB (2M+ titles)
- **Community Voting** — Upvote and downvote recommendations with duplicate-vote prevention
- **Cloud Sync** — Recommendations and watchlists stored in Supabase PostgreSQL
- **Google Login** — Passwordless auth via Google OAuth
- **SPA Routing** — Instant page transitions with custom JavaScript router (no reloads)
- **Search** — Global search for movies, series, and people with live dropdown results
- **Watch Providers** — Shows where to stream each title by region (Netflix, Disney+, etc.)
- **Episode Guides** — Full season and episode breakdowns with cast and runtime
- **Fully Responsive** — Optimized for desktop, tablet, and mobile with hamburger nav

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vite + Vanilla JS (ES6+) | UI, routing, state |
| Styling | CSS3 (custom design system) | No frameworks, full control |
| Database | Supabase (PostgreSQL) | Recommendations, votes, watchlist |
| Auth | Google OAuth via Supabase | Passwordless login |
| Movie Data | TMDB API | 2M+ movies and series |
| Deployment | Vercel | Auto-deploy from GitHub |

---

## Project Structure

```
CineCue/
├── index.html                  # App entry point
├── style.css                   # Full design system (1000+ lines)
├── vercel.json                 # SPA routing rewrites
└── src/
    ├── main.js                 # Core logic, event delegation, vote system
    ├── router.js               # Client-side URL router
    ├── services/
    │   └── supabase.js         # All database and auth operations
    ├── Pages/
    │   ├── Home.js             # Trending, in-theaters, top-rated
    │   ├── Details.js          # Movie detail + recommendations
    │   ├── seriesDetails.js    # Series detail + recommendations
    │   ├── episodeDetails.js   # Single episode view
    │   ├── seasonDetails.js    # Season episode list
    │   ├── Search.js           # Search results
    │   ├── movies.js           # Movies by genre
    │   ├── series.js           # Series by genre
    │   ├── Genres.js           # Genre picker
    │   ├── Watchlist.js        # User saved titles
    │   └── personDetails.js    # Actor and crew profiles
    ├── components/
    │   ├── MovieCard.js        # Reusable movie card
    │   └── TV_showsCard.js     # Reusable series card
    └── utils/
        ├── images.js           # TMDB image URL builder
        ├── time.js             # Runtime formatter
        ├── watchlist.js        # Local + cloud watchlist logic
        └── colors.js           # Avatar color generator
```

---

## Database Schema

Three tables power the community and user features in Supabase PostgreSQL:

### `recommendations`
Stores user-added suggestions tied to a parent movie or series.

```sql
id            bigint primary key
parent_id     bigint        -- TMDB ID of the movie/series the rec belongs to
tmdb_id       bigint        -- TMDB ID of the suggested title
media_type    text          -- "movie" or "tv"
title         text
year          integer
votes         integer       -- Community vote count (updated via RPC)
poster_path   text
user_id       uuid          -- Who added it (null if promoted via vote)
created_at    timestamp
```

### `votes`
Prevents duplicate voting — one row per user per recommendation.

```sql
id                  bigint primary key
user_id             uuid
recommendation_id   bigint
created_at          timestamp
unique (user_id, recommendation_id)
foreign key (recommendation_id) references recommendations(id) on delete cascade
```

### `watchlist`
Stores each user's saved titles with full metadata for offline rendering.

```sql
id            bigint primary key
user_id       uuid
tmdb_id       bigint        -- TMDB ID of the saved title
media_type    text          -- "movie" or "tv"
title         text
poster_path   text
backdrop_path text
release_date  text
vote_average  numeric
added_at      timestamp
unique (user_id, tmdb_id, media_type)
```

---

## Key JavaScript Patterns

**Event Delegation** — A single click listener on `document.body` handles all dynamic UI interactions (voting, navigation, watchlist, delete, search) using `e.target.closest()`.

**SPA Router** — Custom router uses `window.history.pushState` and regex pattern matching to handle dynamic routes like `/movie/:id`, `/series/:id/season/:n/episode/:n`, and `/person/:id` without any page reloads.

**Async/Await + Promise.all** — Detail pages fire multiple API requests in parallel (movie data + credits + watch providers) to minimize load time.

**Atomic Voting** — Vote counts update via a PostgreSQL RPC function (`increment_vote`) to prevent race conditions when multiple users vote simultaneously.

**Hybrid Storage** — Watchlist writes to both localStorage (instant, offline) and Supabase (cloud, synced). On login, cloud data overwrites local to stay in sync.

---

## API Integrations

**TMDB API** — Movie and series data, search, cast, trailers, watch providers, episode guides

**Supabase REST API** — Direct HTTP calls to PostgreSQL for recommendations, votes, and watchlist (no ORM, raw fetch)

**Supabase Auth** — Google OAuth flow with JWT session tokens stored in localStorage

---

## Deployment

Deployed on Vercel with automatic deploys triggered on every `git push` to the `main` branch. A `vercel.json` rewrite rule ensures all routes resolve to `index.html` for SPA compatibility.

```json
{
  "rewrites": [
    { "source": "/api/tmdb/:path*", "destination": "https://api.themoviedb.org/3/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Screenshots

<img width="1871" height="862" alt="image" src="https://github.com/user-attachments/assets/581d6a4a-2f85-4ab4-af81-83b909d3c249" />
<img width="1388" height="846" alt="image" src="https://github.com/user-attachments/assets/b2ffcbbc-816d-4f00-ad8a-7f3b2ec94eab" />


---

*Data provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.*
