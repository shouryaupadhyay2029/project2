(function () {
  "use strict";

  var API_BASE = "/api";
  var DEBOUNCE_MS = 300;
  var lastSearchController = null;

  function getStoredToken() {
    try {
      var token = localStorage.getItem("token");
      if (token) return token;

      var authRaw = localStorage.getItem("devstage_auth");
      if (authRaw) {
        var auth = JSON.parse(authRaw);
        if (auth && auth.token) return auth.token;
      }
    } catch (e) {
      /* ignore storage/parse errors */
    }
    return "";
  }

  function buildHeaders(hasBody) {
    var headers = {};
    var token = getStoredToken();
    if (hasBody) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function toQuery(params) {
    var parts = [];
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
      }
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  function request(path, params, options) {
    options = options || {};
    var url = API_BASE + path + toQuery(params);
    var fetchOptions = {
      method: options.method || "GET",
      headers: buildHeaders(!!options.body),
    };

    if (options.body) fetchOptions.body = JSON.stringify(options.body);
    if (options.signal) fetchOptions.signal = options.signal;

    return fetch(url, fetchOptions).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!response.ok || data.success === false) {
            throw new Error(data.message || "Search request failed");
          }
          return data;
        });
    });
  }

  function dispatchResults(detail) {
    try {
      window.dispatchEvent(
        new CustomEvent("devstage:search_results", {
          detail: detail,
          bubbles: false,
          cancelable: false,
        }),
      );
    } catch (e) {
      /* ignore */
    }
  }

  function resultText(item, type) {
    if (!item) return "";
    if (type === "user") {
      return (
        item.displayName ||
        item.username ||
        item.email ||
        item.id ||
        item._id ||
        "User"
      );
    }
    if (type === "tech") {
      return item.tech || item.name || item.title || String(item);
    }
    return item.title || item.name || item.description || item.id || item._id || "Project";
  }

  function normalizeItems(data) {
    var items = [];
    var users = Array.isArray(data && data.users) ? data.users : [];
    var projects = Array.isArray(data && data.projects) ? data.projects : [];
    var trendingTech = Array.isArray(data && data.trendingTech)
      ? data.trendingTech
      : [];

    users.forEach(function (user) {
      items.push({ type: "user", item: user });
    });
    projects.forEach(function (project) {
      items.push({ type: "project", item: project });
    });
    trendingTech.forEach(function (tech) {
      items.push({ type: "tech", item: tech });
    });

    return items;
  }

  function renderResults(data) {
    var containers = document.querySelectorAll(
      "[data-search-results], .search-results, #search-results",
    );
    if (!containers.length) return;

    var items = normalizeItems(data || {});
    containers.forEach(function (container) {
      container.innerHTML = "";
      items.forEach(function (entry) {
        var div = document.createElement("div");
        div.className = "search-result-item";
        div.textContent = resultText(entry.item, entry.type);
        div.setAttribute("data-result-type", entry.type);
        if (entry.item && (entry.item.id || entry.item._id)) {
          div.setAttribute("data-result-id", entry.item.id || entry.item._id);
        }
        container.appendChild(div);
      });
    });
  }

  function handleSearchResponse(data, meta) {
    var detail = {
      query: meta && meta.query ? meta.query : data.query || "",
      mode: meta && meta.mode ? meta.mode : "global",
      results: data,
    };
    renderResults(data);
    dispatchResults(detail);
    return data;
  }

  function search(query) {
    var q = String(query || "").trim();
    if (!q) return trending();

    if (lastSearchController && typeof lastSearchController.abort === "function") {
      lastSearchController.abort();
    }

    if (typeof AbortController !== "undefined") {
      lastSearchController = new AbortController();
    } else {
      lastSearchController = null;
    }

    return request(
      "/search/global",
      { q: q },
      { signal: lastSearchController ? lastSearchController.signal : null },
    )
      .then(function (data) {
        return handleSearchResponse(data, { query: q, mode: "global" });
      })
      .catch(function (error) {
        if (error && error.name === "AbortError") return null;
        dispatchResults({ query: q, mode: "global", error: error.message });
        throw error;
      });
  }

  function searchProjectsByTech(tech) {
    var value = String(tech || "").trim();
    if (!value) return trending();

    return request("/search/projects", { tech: value }).then(function (data) {
      return handleSearchResponse(data, { query: value, mode: "projects" });
    });
  }

  function trending() {
    return request("/search/trending").then(function (data) {
      return handleSearchResponse(data, { query: "", mode: "trending" });
    });
  }

  function bindSearchInputs() {
    var inputs = document.querySelectorAll(
      "[data-devstage-search], #search-input, .search-input",
    );

    inputs.forEach(function (input) {
      if (input.__devstageSearchBound) return;
      input.__devstageSearchBound = true;

      var timer = null;
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var value = input.value || input.getAttribute("data-query") || "";
          var mode = input.getAttribute("data-devstage-search") || "";
          var techMode =
            mode.toLowerCase() === "tech" ||
            mode.toLowerCase() === "projects" ||
            input.hasAttribute("data-search-tech") ||
            input.hasAttribute("data-tech");

          if (techMode) {
            searchProjectsByTech(value).catch(function () {});
          } else {
            search(value).catch(function () {});
          }
        }, DEBOUNCE_MS);
      });

      input.addEventListener("search", function () {
        search(input.value || "").catch(function () {});
      });
    });
  }

  window.DevStageSearch = {
    search: search,
    trending: trending,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindSearchInputs);
  } else {
    bindSearchInputs();
  }
})();
