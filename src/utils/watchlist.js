const WATCHLIST_STORAGE_KEY = "matchcut_watchlist";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  "apikey": supabaseKey,
  "Authorization": `Bearer ${supabaseKey}`,
  "Content-Type": "application/json",
};

function getLoggedUserId() {
  return localStorage.getItem("sb-user-id");
}

// ── Local cache helpers ──────────────────────────────────────────
export function getUserWatchlist() {
  try {
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export const getWatchlist = getUserWatchlist;

export function isInWatchlist(id, mediaType) {
  return getUserWatchlist().some(
    (item) => item.id === Number(id) && item.media_type === mediaType,
  );
}

// ── Sync cloud → localStorage on login ──────────────────────────
export async function loadWatchlistFromCloud() {
  const userId = getLoggedUserId();
  if (!userId || !supabaseUrl) return;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/watchlist?user_id=eq.${userId}&order=added_at.desc`,
      { headers },
    );
    if (!res.ok) return;
    const rows = await res.json();
    const normalized = rows.map((r) => ({
      id: r.tmdb_id,
      media_type: r.media_type,
      title: r.title,
      poster_path: r.poster_path,
      backdrop_path: r.backdrop_path,
      release_date: r.release_date,
      vote_average: r.vote_average,
      added_at: r.added_at,
    }));
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.error("Failed to load watchlist from cloud:", err);
  }
}

// ── Toggle (add/remove) with cloud sync ─────────────────────────
export async function toggleWatchlist(item) {
  const watchlist = getUserWatchlist();
  const userId = getLoggedUserId();
  const idx = watchlist.findIndex(
    (e) => e.id === Number(item.id) && e.media_type === item.media_type,
  );

  if (idx >= 0) {
    // Remove
    watchlist.splice(idx, 1);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    if (userId && supabaseUrl) {
      await fetch(
        `${supabaseUrl}/rest/v1/watchlist?user_id=eq.${userId}&tmdb_id=eq.${item.id}&media_type=eq.${item.media_type}`,
        { method: "DELETE", headers },
      );
    }
    return false;
  }

  // Add
  const entry = {
    ...item,
    id: Number(item.id),
    added_at: new Date().toISOString(),
  };
  watchlist.unshift(entry);
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  if (userId && supabaseUrl) {
    await fetch(`${supabaseUrl}/rest/v1/watchlist`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: userId,
        tmdb_id: Number(item.id),
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path || "",
        release_date: item.release_date || "",
        vote_average: item.vote_average || 0,
      }),
    });
  }
  return true;
}

// ── Remove a single item (used by watchlist page remove button) ──
export async function removeFromWatchlist(id, mediaType) {
  const watchlist = getUserWatchlist();
  const userId = getLoggedUserId();
  const filtered = watchlist.filter(
    (e) => !(e.id === Number(id) && e.media_type === mediaType),
  );
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(filtered));
  if (userId && supabaseUrl) {
    await fetch(
      `${supabaseUrl}/rest/v1/watchlist?user_id=eq.${userId}&tmdb_id=eq.${id}&media_type=eq.${mediaType}`,
      { method: "DELETE", headers },
    );
  }
}