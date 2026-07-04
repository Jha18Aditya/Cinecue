// 🧱 1. Global Setup Configuration Keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Global request headers required by Supabase API
const headers = {
  "apikey": supabaseKey,
  "Authorization": `Bearer ${supabaseKey}`,
  "Content-Type": "application/json"
};

/**
 * 🛠️ Validation Guard helper
 */
function hasSupabaseConfig() {
  if (supabaseUrl && supabaseKey) return true;
  console.warn("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
  return false;
}

// ==========================================
// 🔐 AUTHENTICATION MODULE (GOOGLE OAuth)
// ==========================================

/**
 * 🔐 LOGIN: Redirects the user's browser straight to Google's official login screen page
 */
export function signInWithGoogle() {
  if (!hasSupabaseConfig()) return;
  const redirectToUrl = window.location.origin; // Dynamically reads localhost or production domain url link
  window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectToUrl)}`;
}

/**
 * 🔒 LOGOUT: Wipes all user identity and session metadata tokens from memory
 */
export function signOut() {
  localStorage.removeItem("sb-access-token");
  localStorage.removeItem("sb-user-id");
  localStorage.removeItem("sb-user-email");
  localStorage.removeItem("matchcut_watchlist"); // clear local watchlist cache too
  window.location.href = "/"; // hard reload — resets all in-memory state
}
// ==========================================
// 📡 DATA READ/WRITE MODULE (RECOMMENDATIONS)
// ==========================================

/**
 * 📡 FETCH: Downloads community suggestions matching the active movie page ID
 */
export async function getCloudRecommendations(parentId) {
  if (!hasSupabaseConfig()) return [];

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/recommendations?parent_id=eq.${parentId}&order=votes.desc`,
      { method: "GET", headers }
    );
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (err) {
    console.error("Cloud download failure:", err);
    return [];
  }
}

export async function getRecommendationsByUser(userId) {
  if (!hasSupabaseConfig() || !userId) return [];

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/recommendations?user_id=eq.${encodeURIComponent(userId)}&order=id.desc`,
      { method: "GET", headers }
    );
    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes("user_id")) return [];
      throw new Error(errorText);
    }
    return await response.json();
  } catch (err) {
    console.error("Cloud user recommendation fetch failure:", err);
    return [];
  }
}

export async function findCloudRecommendation(parentId, tmdbId, mediaType) {
  if (!hasSupabaseConfig() || !parentId || !tmdbId) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/recommendations?parent_id=eq.${parentId}&tmdb_id=eq.${tmdbId}&media_type=eq.${encodeURIComponent(mediaType)}&limit=1`,
      { method: "GET", headers }
    );
    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json();
    return rows[0] || null;
  } catch (err) {
    console.error("Cloud recommendation lookup failure:", err);
    return null;
  }
}

/**
 * 💾 INSERT: Saves a brand-new movie recommendation to the cloud database rows
 */
export async function insertCloudRecommendation(payload) {
  if (!hasSupabaseConfig()) return null;

  try {
    let response = await postRecommendation(payload);

    // Fallback engine block sequence matching schema discrepancies automatically if 400 bad payload returns
    if (!response.ok && response.status === 400) {
      response = await postRecommendation(toCompatibleRecommendationPayload(payload));
    }

    if (!response.ok) throw new Error(await response.text());
    const rows = await response.json();
    return rows[0] || null;
  } catch (err) {
    console.error("Cloud write failure:", err);
    return null;
  }
}

/**
 * 📈 UPDATE: Updates the vote column counter values on a live database row record
 */
export async function updateCloudVote(id, delta) {
  if (!hasSupabaseConfig()) return false;
  try {
    // Use RPC or raw SQL increment — safer than SET
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_vote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ rec_id: id, delta_value: delta })
    });
    if (!response.ok) throw new Error(await response.text());
    return true;
  } catch (err) {
    console.error("Vote update failure:", err);
    return false;
  }
}

/**
 * 🗑️ DELETE: Removes a user recommendation from the cloud database permanently
 */
export async function deleteCloudRecommendation(id) {
  if (!hasSupabaseConfig()) return false;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/recommendations?id=eq.${id}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok) throw new Error(await response.text());
    return true;
  } catch (err) {
    console.error("Failed to delete item row:", err);
    return false;
  }
}

// ==========================================
// 🛡️ GOVERNANCE ENGINE TRACKING MODULE (VOTES ANTI-SPAM)
// ==========================================

/**
 * 🔍 VERIFY: Checks if a specific user has already cast a vote for a specific recommendation card ID
 */
export async function checkHasUserVoted(userId, recId) {
  if (!hasSupabaseConfig()) return false;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/votes?user_id=eq.${userId}&recommendation_id=eq.${recId}`,
      { method: "GET", headers }
    );
    if (!response.ok) throw new Error(await response.text());
    const records = await response.json();
    return records.length > 0; // Returns true if they've voted, blocking duplication limits
  } catch (err) {
    console.error("Vote verification failure:", err);
    return false;
  }
}

/**
 * 🔒 LOG TRANSACTION: Injects a lock row ledger line to finalize a user's single voting slot allocation
 */
export async function recordUserVoteInCloud(userId, recId) {
  if (!hasSupabaseConfig()) return false;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/votes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, recommendation_id: Number(recId) })
    });
    if (!response.ok && response.status !== 409) throw new Error(await response.text());
    return true;
  } catch (err) {
    console.error("Failed to insert vote record row:", err);
    return false;
  }
}
export async function getRecommendationsVotedByUser(userId) {
  if (!hasSupabaseConfig() || !userId) return [];
  try {
    // Step 1: get all recommendation_ids this user voted on
    const votesRes = await fetch(
      `${supabaseUrl}/rest/v1/votes?user_id=eq.${encodeURIComponent(userId)}&select=recommendation_id`,
      { method: "GET", headers }
    );
    if (!votesRes.ok) return [];
    const voteRows = await votesRes.json();
    if (!voteRows.length) return [];

    // Step 2: fetch those recommendations
    const ids = voteRows.map(v => v.recommendation_id).join(",");
    const recsRes = await fetch(
      `${supabaseUrl}/rest/v1/recommendations?id=in.(${ids})&order=votes.desc`,
      { method: "GET", headers }
    );
    if (!recsRes.ok) return [];
    return await recsRes.json();
  } catch (err) {
    console.error("Failed to fetch voted recommendations:", err);
    return [];
  }
}

export function normalizeCloudRecommendation(item) {
  return {
    ...item,
    id: item.id,                          // DB row id (for voting)
    tmdb_id: item.tmdb_id,               // TMDB id (for links)
    isCloudRecommendation: true,          // flag for vote handler
    votes: Number(item.votes || 0),
    poster: item.poster || null,
    poster_path: item.poster_path || null,
    media_type: item.media_type || "movie",
    title: item.title || item.name || "Untitled",
    year: item.year || (item.release_date ? item.release_date.split("-")[0] : "N/A"),
  };
}
// ==========================================
// PRIVATE CORE SUB-ROUTINE UTILITIES
// ==========================================

function postRecommendation(payload) {
  return fetch(`${supabaseUrl}/rest/v1/recommendations`, {
    method: "POST",
    headers: { 
      ...headers, 
      "Prefer": "return=representation,resolution=merge-duplicates"
    },
    body: JSON.stringify(payload)
  });
}


function toCompatibleRecommendationPayload(payload) {
  return {
    parent_id: payload.parent_id,
    tmdb_id: payload.tmdb_id,
    media_type: payload.media_type,
    title: payload.title,
    year: payload.year,
    rating: payload.rating,
    votes: payload.votes,
    poster: payload.poster,
    poster_path: payload.poster_path,
    release_date: payload.release_date,
    user_id: payload.user_id  // ← add this
  };
}
