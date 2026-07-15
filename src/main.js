import {
  insertCloudRecommendation,
  updateCloudVote,
  checkHasUserVoted,
  recordUserVoteInCloud,
  deleteCloudRecommendation,
  getRecommendationsByUser,
  findCloudRecommendation,
  signInWithGoogle,
  signOut,
} from "./services/supabase.js";
import {
  activePageCommunityRecs,
  renderRecommendationGrid as renderMovieRecommendationGrid,
  removeLocalRecommendationById as removeMovieLocalRecommendationById,
} from "./Pages/Details.js";
import {
  renderRecommendationGrid as renderSeriesRecommendationGrid,
  removeLocalRecommendationById as removeSeriesLocalRecommendationById,
} from "./Pages/seriesDetails.js";
import { navigateTo, handleRouting, addRoute } from "./router.js";
import { search, updateSearchResults } from "./Pages/Search.js";
import { tmdbImage } from "./utils/images.js";
import { toggleWatchlist, loadWatchlistFromCloud } from "./utils/watchlist.js";
import { getRandomLightColor } from "./utils/colors.js";

(function () {
  const USER_VOTE_LOCK_KEY = "matchcut_voted_recommendations";
  let statusToastTimer;
  let voteInProgress = false;

  // ==========================================
  // 🔐 1. GOOGLE OAUTH HASH FRAGMENT PARSER
  // ==========================================
  const parseAuthSessionFromHash = () => {
    const hashValue = window.location.hash;
    if (hashValue && hashValue.includes("access_token=")) {
      const URLParameters = new URLSearchParams(hashValue.replace("#", "?"));
      const token = URLParameters.get("access_token");
      try {
        const encodedPayloadBase64 = token.split(".")[1];
        const parsedProfileJson = JSON.parse(atob(encodedPayloadBase64));
        localStorage.setItem("sb-access-token", token);
        localStorage.setItem("sb-user-id", parsedProfileJson.sub);
        localStorage.setItem("sb-user-email", parsedProfileJson.email);
        window.history.replaceState(null, null, window.location.pathname);
      } catch (error) {
        console.error("OAuth parsing sequence failure:", error);
      }
    }
  };

  parseAuthSessionFromHash();

  // Sync watchlist from cloud on login
  if (localStorage.getItem("sb-user-id")) {
    loadWatchlistFromCloud();
  }

  const loggedUserId = localStorage.getItem("sb-user-id");
  const loggedUserEmail = localStorage.getItem("sb-user-email");
  const loggedUserName = getDisplayNameFromEmail(loggedUserEmail);
  ensureStatusToast();

  // ==========================================
  // 🎨 2. DYNAMIC AUTH HEADER UI ENGINE

const renderAuthNavigationState = () => {
  const authContainer = document.querySelector("#auth-status-container");
  const desktopContainer = document.querySelector("#auth-status-desktop");
  if (!authContainer && !desktopContainer) return;

  if (loggedUserId) {
    const randomColor = getRandomLightColor();
    const loggedInHTML = `
      <a href="/dashboard" class="nav-link account-avatar-link">
        <span class="account-avatar" style="background-color: ${randomColor}; color: #000;">
          ${loggedUserName.charAt(0).toUpperCase()}
        </span>
      </a>
    `;
    if (authContainer) authContainer.innerHTML = loggedInHTML;
    if (desktopContainer) desktopContainer.innerHTML = loggedInHTML;
  } else {
    const loggedOutHTML = `
      <button id="login-trigger-btn" class="auth-action-btn auth-action-btn--primary" type="button">
        Login / Sign up
      </button>
    `;
    if (authContainer) authContainer.innerHTML = loggedOutHTML;
    if (desktopContainer) desktopContainer.innerHTML = loggedOutHTML;
  }
};

renderAuthNavigationState();

  let recommendationDebounceTimer;
  let recommendationRequestId = 0;
  let searchDebounceTimer;
  let searchRequestId = 0;

  const appHeader = document.querySelector(".app-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileSearchToggle = document.querySelector(".mobile-search-toggle");
  const searchForm = document.querySelector("#search-form");
  const searchInput = document.querySelector("#global-search-input");
  const searchTypeSelect = document.querySelector("#global-search-type-select");
  const searchDropdown = document.querySelector("#search-dropdown-results");

  const closeDrawer = () => {
    appHeader?.classList.remove("nav-open");
    document.body.classList.remove("drawer-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  };

  const updateActiveNavLink = () => {
    const currentPath = window.location.pathname;
    document
      .querySelectorAll(".nav-links .nav-link, .footer-links .nav-link")
      .forEach((link) => {
        const href = link.getAttribute("href");
        const isActive =
          href === "/"
            ? currentPath === "/"
            : currentPath === href || currentPath.startsWith(`${href}/`);
        link.classList.toggle("is-active", isActive);
      });
  };

  const updateHeaderState = () => {
    appHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeaderState();
  updateActiveNavLink();
  window.addEventListener("scroll", updateHeaderState, { passive: true });

  menuToggle?.addEventListener("click", () => {
    const isOpen = appHeader?.classList.toggle("nav-open");
    document.body.classList.toggle("drawer-open", Boolean(isOpen));
    appHeader?.classList.remove("search-open");
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    mobileSearchToggle?.setAttribute("aria-expanded", "false");
  });

  mobileSearchToggle?.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      closeDrawer();
      appHeader?.classList.remove("search-open");
      mobileSearchToggle.setAttribute("aria-expanded", "false");
      navigateTo("/search");
      updateActiveNavLink();
      return;
    }
    const isOpen = appHeader?.classList.toggle("search-open");
    appHeader?.classList.remove("nav-open");
    mobileSearchToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    menuToggle?.setAttribute("aria-expanded", "false");
  });

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (
        appHeader?.classList.contains("nav-open") &&
        window.matchMedia("(max-width: 900px)").matches &&
        !e.target.closest(".nav-links") &&
        !e.target.closest(".menu-toggle")
      ) {
        closeDrawer();
      }
    },
    true,
  );

  const syncSearchControlsFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const searchType = params.get("type") || "all";
    if (searchTypeSelect) searchTypeSelect.value = searchType;
    if (window.location.pathname === "/search" && searchInput) {
      searchInput.value = params.get("q") || "";
    }
  };

  syncSearchControlsFromUrl();

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        const type = searchTypeSelect?.value || "all";
        navigateTo(
          `/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`,
        );
        updateActiveNavLink();
        searchInput.value = "";
        searchDropdown?.classList.add("hidden");
      }
    });

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim();
      const type = searchTypeSelect?.value || "all";
      const requestId = ++searchRequestId;
      clearTimeout(searchDebounceTimer);

      if (!searchDropdown || query.length < 2) {
        searchDropdown?.classList.add("hidden");
        return;
      }

      searchDropdown.innerHTML = `<div class="search-loading"><span class="loader-spinner" aria-hidden="true"></span><span>Loading...</span></div>`;
      searchDropdown.classList.remove("hidden");

      searchDebounceTimer = setTimeout(async () => {
        try {
          const results = await search(query, type === "all" ? "multi" : type);
          if (
            requestId !== searchRequestId ||
            searchInput.value.trim() !== query
          )
            return;
          searchDropdown.innerHTML = results.length
            ? results
                .slice(0, 7)
                .map((item) => renderGlobalSearchItem(item))
                .join("")
            : `<div class="search-no-results">No matches for "${query}"</div>`;
        } catch (error) {
          console.error("Global search error:", error);
          if (requestId === searchRequestId) {
            searchDropdown.innerHTML = `<div class="search-no-results">Search failed</div>`;
          }
        }
      }, 350);
    });
  }

  function renderGlobalSearchItem(item) {
    const title = item.title || item.name;
    const meta = getResultMeta(item);
    const poster = tmdbImage(item.poster_path || item.profile_path, "w92");
    const routeType = item.media_type === "tv" ? "series" : item.media_type;
    const link = `/${routeType}/${item.id}`;
    return `
      <a href="${link}" class="search-item nav-link">
        <img src="${poster}" alt="${title}" loading="lazy" />
        <div class="search-item-info">
          <h4>${title}</h4>
          <p>${meta}</p>
        </div>
      </a>
    `;
  }

  // ==========================================
  // 🎮 3. MASTER CLICK EVENT DELEGATION LISTENER
  // ==========================================
  document.body.addEventListener("click", async (e) => {
    const avatarLink = e.target.closest(".account-avatar-link");
    if (avatarLink) {
      e.preventDefault();
      e.stopPropagation();
      closeDrawer();
      navigateTo(avatarLink.getAttribute("href"));
      updateActiveNavLink();
      return;
    }
    document.querySelectorAll(".three-dot-menu.is-open").forEach((menu) => {
      if (!e.target.closest(".dashboard-rec-actions")) {
        menu.classList.remove("is-open");
      }
    });
    if (
      appHeader?.classList.contains("nav-open") &&
      window.matchMedia("(max-width: 900px)").matches &&
      !e.target.closest(".nav-links") &&
      !e.target.closest(".menu-toggle") &&
      !e.target.closest(".auth-nav-wrapper") // ✅ ADD THIS
    ) {
      closeDrawer();
    }

    if (!e.target.closest(".search-wrapper")) {
      searchDropdown?.classList.add("hidden");
    }

    // A. Auth
    if (e.target.id === "login-trigger-btn") {
      signInWithGoogle();
      return;
    }
    if (e.target.id === "logout-trigger-btn") {
      signOut();
      return;
    }

    const deleteButton = e.target.closest(".delete-rec-btn");
    if (deleteButton) {
      e.preventDefault();
      const recId = deleteButton.getAttribute("data-id");
      const card = deleteButton.closest(".dashboard-rec-card");

      // If already showing confirm, skip
      if (card?.querySelector(".delete-confirm-row")) return;

      // Inject inline confirm UI
      const confirmRow = document.createElement("div");
      confirmRow.className = "delete-confirm-row";
      confirmRow.innerHTML = `
    <span>Delete this recommendation?</span>
    <button class="confirm-yes-btn" data-id="${recId}">Yes, delete</button>
    <button class="confirm-no-btn">Cancel</button>
  `;
      card?.appendChild(confirmRow);

      confirmRow
        .querySelector(".confirm-no-btn")
        .addEventListener("click", () => {
          confirmRow.remove();
        });

      confirmRow
        .querySelector(".confirm-yes-btn")
        .addEventListener("click", async () => {
          const success = await deleteCloudRecommendation(recId);
          if (success) {
            if (window.location.pathname.startsWith("/movie/"))
              removeMovieLocalRecommendationById(recId);
            else if (window.location.pathname.startsWith("/series/"))
              removeSeriesLocalRecommendationById(recId);
            const currentContext = getCurrentMediaContext();
            if (currentContext)
              renderCurrentRecommendationGrid(
                currentContext.id,
                currentContext.type,
              );
            if (window.location.pathname === "/dashboard") handleRouting();
          } else {
            confirmRow.remove();
          }
        });
      return;
    }

    // C. Filter UI controls
    const filterButton = e.target.closest(".filter-select-button");
    if (filterButton) {
      const filter = filterButton.closest("[data-search-filter]");
      const isOpen = filter?.classList.toggle("is-open");
      filterButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document
        .querySelectorAll("[data-search-filter]")
        .forEach((otherFilter) => {
          if (otherFilter !== filter) {
            otherFilter.classList.remove("is-open");
            otherFilter
              .querySelector(".filter-select-button")
              ?.setAttribute("aria-expanded", "false");
          }
        });
      return;
    }

    const filterOption = e.target.closest(".filter-select-option");
    if (filterOption) {
      const filter = filterOption.closest("[data-search-filter]");
      const combo = filterOption.closest(".search-combo");
      const valueInput = combo?.querySelector(".search-filter-value");
      const label = filter?.querySelector(".filter-select-button span");
      if (valueInput) {
        valueInput.value = filterOption.dataset.value || "all";
        valueInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (label) label.textContent = filterOption.textContent.trim();
      filter?.querySelectorAll(".filter-select-option").forEach((option) => {
        const isSelected = option === filterOption;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-selected", isSelected ? "true" : "false");
      });
      filter?.classList.remove("is-open");
      filter
        ?.querySelector(".filter-select-button")
        ?.setAttribute("aria-expanded", "false");
      return;
    }

    if (!e.target.closest("[data-search-filter]")) {
      document.querySelectorAll("[data-search-filter]").forEach((filter) => {
        filter.classList.remove("is-open");
        filter
          .querySelector(".filter-select-button")
          ?.setAttribute("aria-expanded", "false");
      });
    }

    // D. Vote handler
    const voteButton = e.target.closest(".vote-btn");
    if (voteButton) {
      e.preventDefault();
      e.stopPropagation();

      if (voteInProgress) {
        showStatusMessage("Please wait...");
        return;
      }
      if (!loggedUserId) {
        showStatusMessage("Log in to vote.");
        return;
      }

      const isUpvote = voteButton.classList.contains("up-action");
      const cardWrapper = voteButton.closest(".movie-card");
      const countTextNode = voteButton.parentElement.querySelector(".count");
      const targetId = voteButton.dataset.id;

      if (!countTextNode || !targetId) return;

      const currentContext = getCurrentMediaContext();
      const voteLockKey = `${loggedUserId}:${currentContext?.type || "media"}:${targetId}`;
      if (hasUserVoteLock(voteLockKey)) {
        showStatusMessage("You have already voted on this recommendation.");
        return;
      }

      const delta = isUpvote ? 1 : -1;

      if (!isUpvote) {
        const currentDisplayScore = parseInt(countTextNode.innerText, 10) || 0;
        if (currentDisplayScore <= 0) {
          showStatusMessage("Cannot downvote below 0.");
          return;
        }
      }

      voteInProgress = true;
      try {
        if (cardWrapper?.getAttribute("data-is-cloud") === "true") {
          const alreadyVoted = await checkHasUserVoted(loggedUserId, targetId);
          if (alreadyVoted) {
            showStatusMessage("You have already voted on this recommendation.");
            return;
          }
          const currentVotes = parseInt(countTextNode.innerText, 10) || 0;
          const nextVotes = currentVotes + delta;
          countTextNode.innerText = nextVotes;
          const matchedItem = activePageCommunityRecs.find(
            (item) => String(item.id) === String(targetId),
          );
          if (matchedItem) matchedItem.votes = nextVotes;
          const updateSucceeded = await updateCloudVote(targetId, delta);
          const voteRecorded = await recordUserVoteInCloud(
            loggedUserId,
            targetId,
          );
          if (!updateSucceeded || !voteRecorded) {
            countTextNode.innerText = currentVotes;
            if (matchedItem) matchedItem.votes = currentVotes;
            showStatusMessage("Vote could not be saved in Supabase.");
            return;
          }
          setUserVoteLock(voteLockKey);
          repositionRecommendationCard(cardWrapper, nextVotes);
        } else {
          if (!currentContext || !cardWrapper) return;
          const currentVotes = parseInt(countTextNode.innerText, 10) || 0;
          const nextVotes = Math.max(0, currentVotes + delta);
          countTextNode.innerText = nextVotes;
          repositionRecommendationCard(cardWrapper, nextVotes);

          const payload = {
            parent_id: Number(currentContext.id),
            tmdb_id: Number(cardWrapper.dataset.id || targetId),
            media_type: cardWrapper.dataset.mediaType || currentContext.type,
            title: cardWrapper.dataset.title || "Untitled",
            year: Number(cardWrapper.dataset.year) || new Date().getFullYear(),
            rating: Number(cardWrapper.dataset.rating || 0),
            votes: 0,
            poster: cardWrapper.dataset.poster || "",
            poster_path: cardWrapper.dataset.posterPath || "",
            release_date: cardWrapper.dataset.releaseDate || "",
            user_id: null,
          };

          const existingRecommendation = await findCloudRecommendation(
            payload.parent_id,
            payload.tmdb_id,
            payload.media_type,
          );
          const recommendationRow =
            existingRecommendation ||
            (await insertCloudRecommendation(payload));

          if (!recommendationRow) {
            showStatusMessage(
              "Could not save vote. Check Supabase policy/schema.",
            );
            return;
          }

          const alreadyVoted = await checkHasUserVoted(
            loggedUserId,
            recommendationRow.id,
          );
          if (alreadyVoted) {
            showStatusMessage("You have already voted on this recommendation.");
            renderCurrentRecommendationGrid(
              currentContext.id,
              currentContext.type,
            );
            return;
          }

          const updateSucceeded = await updateCloudVote(
            recommendationRow.id,
            delta,
          );
          const voteRecorded = await recordUserVoteInCloud(
            loggedUserId,
            recommendationRow.id,
          );

          if (!updateSucceeded || !voteRecorded) {
            showStatusMessage("Vote could not be saved in Supabase.");
            return;
          }

          setUserVoteLock(voteLockKey);
          setUserVoteLock(
            `${loggedUserId}:${currentContext?.type || "media"}:${recommendationRow.id}`,
          );
        }
      } finally {
        voteInProgress = false;
      }
      return;
    }

    // E. Nav links
    const navLink = e.target.closest(".nav-link");
    if (navLink) {
      e.preventDefault();
      navigateTo(navLink.getAttribute("href"));
      updateActiveNavLink();
      closeDrawer();
      appHeader?.classList.remove("search-open");
      searchDropdown?.classList.add("hidden");
      mobileSearchToggle?.setAttribute("aria-expanded", "false");
      return;
    }

    // F. Watchlist toggle
    const watchlistButton = e.target.closest("[data-watchlist-action]");
    if (watchlistButton) {
      if (!loggedUserId) {
        showStatusMessage("Log in to add to your watchlist.");
        return;
      }
      const isSaved = await toggleWatchlist({
        id: watchlistButton.dataset.id,
        media_type: watchlistButton.dataset.mediaType,
        title: watchlistButton.dataset.title,
        poster_path: watchlistButton.dataset.posterPath || "",
        backdrop_path: watchlistButton.dataset.backdropPath || "",
        release_date: watchlistButton.dataset.releaseDate || "",
        vote_average: parseFloat(watchlistButton.dataset.rating || "0"),
      });
      watchlistButton.classList.toggle("is-saved", isSaved);
      watchlistButton.setAttribute("aria-pressed", isSaved ? "true" : "false");
      const label = watchlistButton.querySelector("span");
      if (label)
        label.textContent = isSaved ? "In Watchlist" : "Add to Watchlist";
      return;
    }

    // G. Recommendation search result selection
    const recItem = e.target.closest(".rec-search-item");
    if (recItem) {
      const form =
        recItem.closest("#add-rec-form") ||
        document.querySelector("#add-rec-form");
      const inputField = form?.querySelector("#rec-title-input");
      const resultsBox = document.querySelector("#rec-search-results");
      if (!form) return;
      const selected = {
        id: parseInt(recItem.dataset.id, 10),
        title: recItem.dataset.title,
        name: recItem.dataset.title,
        media_type: recItem.dataset.mediaType || "movie",
        poster_path: recItem.dataset.posterPath || "",
        release_date: recItem.dataset.releaseDate || "",
        first_air_date: recItem.dataset.firstAirDate || "",
        vote_average: parseFloat(recItem.dataset.rating || "0"),
      };
      form.dataset.selectedRecommendation = JSON.stringify(selected);
      if (inputField)
        inputField.value = `${selected.title} (${getResultMeta(selected)})`;
      resultsBox?.classList.add("hidden");
      showRecommendationMessage(
        `Selected "${selected.title}". Press Add to confirm.`,
      );
    }
  });

  // Input: recommendation search typeahead & live search page
  document.body.addEventListener("input", (e) => {
    if (e.target.id === "search-page-input") {
      const query = e.target.value.trim();
      const select = document.querySelector("#search-type-select");
      const type = select?.value || "all";
      
      const newUrl = query ? `/search?q=${encodeURIComponent(query)}&type=${type}` : `/search`;
      window.history.replaceState(null, "", newUrl);
      
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        updateSearchResults(query, type);
      }, 350);
      return;
    }

    if (e.target.id !== "rec-title-input") return;
    const inputField = e.target;
    const form =
      inputField.closest("#add-rec-form") ||
      document.querySelector("#add-rec-form");
    const resultsBox = document.querySelector("#rec-search-results");
    const query = inputField.value.trim();
    const requestId = ++recommendationRequestId;
    if (form) delete form.dataset.selectedRecommendation;
    clearTimeout(recommendationDebounceTimer);
    if (!resultsBox || query.length < 2) {
      resultsBox?.classList.add("hidden");
      return;
    }
    resultsBox.innerHTML = `<div class="search-loading"><span class="loader-spinner" aria-hidden="true"></span><span>Loading results...</span></div>`;
    resultsBox.classList.remove("hidden");
    recommendationDebounceTimer = setTimeout(async () => {
      try {
        const results = (await search(query, "multi")).filter(
          (item) => item.media_type === "movie" || item.media_type === "tv",
        );
        if (
          requestId !== recommendationRequestId ||
          inputField.value.trim() !== query
        )
          return;
        resultsBox.innerHTML = results.length
          ? results
              .slice(0, 6)
              .map((item) => renderRecommendationSearchResultItem(item))
              .join("")
          : `<div class="search-no-results">No matches found</div>`;
      } catch (error) {
        console.error("Recommendation search error:", error);
        if (requestId === recommendationRequestId) {
          resultsBox.innerHTML = `<div class="search-no-results">Search failed</div>`;
        }
      }
    }, 350);
  });

  // Form: submit delegation
  document.body.addEventListener("submit", async (e) => {
    if (e.target.classList.contains("search-page-form")) {
      e.preventDefault();
      const inputField = e.target.querySelector("#search-page-input");
      if (inputField) inputField.blur();
      return;
    }

    if (e.target.id === "add-rec-form") {
      e.preventDefault();
      const inputField = document.querySelector("#rec-title-input");
      if (!inputField || inputField.value.trim() === "") return;
      if (!loggedUserId) {
        showStatusMessage("Log in to add a recommendation.");
        return;
      }
      const currentContext = getCurrentMediaContext();
      if (!currentContext) return;
      const form = e.target;
      const selectedRecommendation = form.dataset.selectedRecommendation
        ? JSON.parse(form.dataset.selectedRecommendation)
        : null;
      const title =
        selectedRecommendation?.title ||
        selectedRecommendation?.name ||
        inputField.value.trim();
      const releaseDate =
        selectedRecommendation?.release_date ||
        selectedRecommendation?.first_air_date ||
        "";
      const posterPath = selectedRecommendation?.poster_path || "";
      const payload = {
        parent_id: Number(currentContext.id),
        tmdb_id: selectedRecommendation?.id || null,
        media_type: selectedRecommendation?.media_type || currentContext.type,
        title,
        year: releaseDate
          ? Number(releaseDate.split("-")[0])
          : new Date().getFullYear(),
        rating: Number(selectedRecommendation?.vote_average || 0),
        votes: 0,
        poster: posterPath ? tmdbImage(posterPath) : "",
        poster_path: posterPath,
        release_date: releaseDate,
        user_id: loggedUserId,
      };
      const insertedRecommendation = await insertCloudRecommendation(payload);
      if (!insertedRecommendation) return;
      inputField.value = "";
      delete form.dataset.selectedRecommendation;
      showRecommendationMessage(
        `Added "${title}" to community recommendations.`,
      );
      renderCurrentRecommendationGrid(currentContext.id, currentContext.type);
      if (window.location.pathname === "/dashboard") handleRouting();
    }
  });

  function getResultMeta(item) {
    if (item.media_type === "person")
      return item.known_for_department || "Person";
    const year =
      (item.release_date || item.first_air_date || "").split("-")[0] || "N/A";
    return `${item.media_type === "tv" ? "Series" : "Movie"} | ${year}`;
  }

  function renderRecommendationSearchResultItem(item) {
    const title = item.title || item.name || "Untitled";
    const poster = tmdbImage(item.poster_path, "w92");
    return `
      <button class="rec-search-item" type="button"
        data-id="${item.id}"
        data-title="${escapeAttribute(title)}"
        data-media-type="${item.media_type || "movie"}"
        data-poster-path="${item.poster_path || ""}"
        data-release-date="${item.release_date || ""}"
        data-first-air-date="${item.first_air_date || ""}"
        data-rating="${item.vote_average || 0}"
      >
        <img src="${poster}" alt="${escapeAttribute(title)}" loading="lazy" />
        <span class="rec-search-item-body">
          <h4>${title}</h4>
          <p>${getResultMeta(item)}</p>
        </span>
      </button>
    `;
  }

  function showRecommendationMessage(message) {
    const messageElement = document.querySelector("#rec-confirm-message");
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.classList.remove("hidden");
  }

  function escapeAttribute(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  }

  function getCurrentMediaContext() {
    const movieMatch = window.location.pathname.match(/^\/movie\/(\d+)$/);
    if (movieMatch) return { type: "movie", id: movieMatch[1] };
    const seriesMatch = window.location.pathname.match(/^\/series\/(\d+)$/);
    if (seriesMatch) return { type: "tv", id: seriesMatch[1] };
    return null;
  }

  function renderCurrentRecommendationGrid(id, type) {
    if (type === "tv") return renderSeriesRecommendationGrid(id);
    return renderMovieRecommendationGrid(id);
  }

  // FIX: only show recs the user ADDED (not just voted on)
  // user_id on a recommendation row = the person who added it
  function mergeUserRecommendations(items, userId) {
    const seen = new Set();
    return items
      .filter(
        (item) => item && String(item.user_id || "") === String(userId || ""),
      )
      .filter((item) => {
        const key = `${item.id}:${item.media_type}:${item.tmdb_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0));
  }

  function repositionRecommendationCard(cardWrapper, newScore) {
    if (!cardWrapper) return;
    const container = cardWrapper.parentElement;
    if (!container) return;
    const score = Number(newScore || 0);
    cardWrapper.dataset.votes = String(score);
    const cards = Array.from(container.querySelectorAll(".movie-card"));
    const sortedCards = cards
      .map((card) => ({
        card,
        score: Number(
          card.querySelector(".count")?.textContent || card.dataset.votes || 0,
        ),
      }))
      .sort((a, b) => b.score - a.score);
    sortedCards.forEach(({ card }) => container.appendChild(card));
  }

  // ==========================================
  // 📊 DASHBOARD PAGE
  // ==========================================
  async function renderDashboardPage() {
    if (!loggedUserId) {
      return `<div class="container page-stack"><p class="empty-state">Please log in to view your dashboard.</p></div>`;
    }

    const { getUserWatchlist } = await import("./utils/watchlist.js");
    const userWatchlist = getUserWatchlist();

    // Fetch both separately
    const addedRecs = await getRecommendationsByUser(loggedUserId);
    const myAddedRecs = addedRecs.filter(
      (item) => String(item.user_id || "") === String(loggedUserId),
    );

    const userLabel = loggedUserEmail || "your account";

    return `
    <div class="container page-stack">

      <section class="dashboard-header-section">
        <div class="dashboard-header">
          <div class="dashboard-avatar" style="background-color: ${getRandomLightColor()}; color: #000;">
            ${loggedUserName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 class="page-heading">${loggedUserName}</h1>
            <span class="section-kicker">${userLabel}</span>
          </div>
          <button id="logout-trigger-btn" class="auth-action-btn auth-action-btn--danger" type="button">
            Log out
          </button>
        </div>
      </section>

      <section>
        <div class="section-title-row">
          <h2 class="section-heading">Your Watchlist</h2>
          <a href="/watchlist" class="nav-link section-link">View all →</a>
        </div>
        ${
          userWatchlist.length > 0
            ? `
          <div class="movies-grid watchlist-grid">
            ${userWatchlist
              .slice(0, 6)
              .map(
                (item) => `
              <a href="/${item.media_type === "tv" ? "series" : "movie"}/${item.id}" class="movie-card nav-link">
                <div class="poster-container">
                  <img src="${tmdbImage(item.poster_path)}" alt="${item.title}" loading="lazy" />
                </div>
                <div class="card-body">
                  <h3 class="card-title">${item.title || "Untitled"}</h3>
                  <p class="card-meta">${item.media_type === "tv" ? "Series" : "Movie"}</p>
                </div>
              </a>
            `,
              )
              .join("")}
          </div>
        `
            : '<p class="empty-state">Your watchlist is empty.</p>'
        }
      </section>

      <section>
        <div class="section-title-row">
          <h2 class="section-heading">Recommendations You Added</h2>
          <span class="section-kicker">${myAddedRecs.length} added</span>
        </div>
        ${
          myAddedRecs.length > 0
            ? `
          <div class="dashboard-rec-list">
            ${myAddedRecs.map((item) => renderDashboardRecRow(item, true)).join("")}
          </div>
        `
            : '<p class="empty-state">You have not added any recommendations yet.</p>'
        }
      </section>
    </div>`;
  }

  function renderDashboardRecRow(item, showDelete) {
    const route = item.media_type === "tv" ? "series" : "movie";
    const tmdbIdOrId = item.tmdb_id || item.id;
    const poster = item.poster || tmdbImage(item.poster_path);
    const votes = item.votes ?? 0;
    const mediaLabel = item.media_type === "tv" ? "Series" : "Movie";

    return `
  <div class="dashboard-rec-card">
    <div class="dashboard-rec-main">
      <a href="/${route}/${tmdbIdOrId}" class="nav-link dashboard-rec-poster-link">
        <img src="${poster}" alt="${item.title}" class="dashboard-rec-poster" loading="lazy" />
      </a>
      <div class="dashboard-rec-info">
        <a href="/${route}/${tmdbIdOrId}" class="nav-link dashboard-rec-title">
          ${item.title || "Untitled"}
        </a>
        <p class="dashboard-rec-meta">
          <span class="badge">${item.year || "N/A"}</span>
          <span class="badge">${mediaLabel}</span>
          <span class="badge">▲ ${votes} vote${votes === 1 ? "" : "s"}</span>
        </p>
      </div>
      ${
        showDelete
          ? `
        <div class="dashboard-rec-actions">
          <button class="three-dot-btn" data-id="${item.id}" aria-label="Options" onclick="this.nextElementSibling.classList.toggle('is-open'); event.stopPropagation();">⋯</button>
          <div class="three-dot-menu">
            <button class="delete-rec-btn three-dot-option" data-id="${item.id}">
              🗑 Delete
            </button>
          </div>
        </div>
      `
          : ""
      }
    </div>
  </div>
`;
  }

  document.body.addEventListener("change", (e) => {
    if (e.target.matches("#search-type-select")) {
      const select = e.target;
      const form = select.closest(".search-page-form");
      const input = form?.querySelector("#search-page-input");
      const query = input?.value.trim();
      if (query) {
        navigateTo(
          `/search?q=${encodeURIComponent(query)}&type=${select.value}`,
        );
        updateActiveNavLink();
      }
    }
  });

  addRoute("/dashboard", renderDashboardPage);

  window.addEventListener("popstate", () => {
    syncSearchControlsFromUrl();
    updateActiveNavLink();
    handleRouting();
  });
  handleRouting();

  function getDisplayNameFromEmail(email) {
    if (!email) return "User";
    return String(email)
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  function ensureStatusToast() {
    if (document.querySelector("#app-status-toast")) return;
    const toast = document.createElement("div");
    toast.id = "app-status-toast";
    toast.className = "app-status-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  function showStatusMessage(message) {
    ensureStatusToast();
    const toast = document.querySelector("#app-status-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(statusToastTimer);
    statusToastTimer = setTimeout(
      () => toast.classList.remove("is-visible"),
      2400,
    );
  }

  function getUserVoteLocks() {
    try {
      const stored = JSON.parse(localStorage.getItem(USER_VOTE_LOCK_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function hasUserVoteLock(lockKey) {
    return getUserVoteLocks().includes(lockKey);
  }

  function setUserVoteLock(lockKey) {
    const locks = getUserVoteLocks();
    if (!locks.includes(lockKey)) {
      locks.unshift(lockKey);
      localStorage.setItem(
        USER_VOTE_LOCK_KEY,
        JSON.stringify(locks.slice(0, 500)),
      );
    }
  }
})();
