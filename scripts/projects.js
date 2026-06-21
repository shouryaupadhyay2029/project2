(function () {
  "use strict";

  var API_BASE = "/api";
  var observedImpressions = {};
  var impressionObserver = null;

  function getStoredToken() {
    try {
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

  function request(path, options) {
    options = options || {};
    var url = API_BASE + path + toQuery(options.query);
    var fetchOptions = {
      method: options.method || "GET",
      headers: buildHeaders(!!options.body),
    };

    if (options.body) fetchOptions.body = JSON.stringify(options.body);

    return fetch(url, fetchOptions).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!response.ok || data.success === false) {
            throw new Error(data.message || "Project request failed");
          }
          return data;
        });
    });
  }

  function dispatch(eventName, detail) {
    try {
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: detail,
          bubbles: false,
          cancelable: false,
        }),
      );
    } catch (e) {
      /* ignore */
    }
  }

  function getProjectIdFromElement(el) {
    if (!el) return "";
    return (
      el.getAttribute("data-save-project") ||
      el.getAttribute("data-unsave-project") ||
      el.getAttribute("data-project-id") ||
      el.getAttribute("data-analytics-project-id") ||
      el.getAttribute("data-id") ||
      ""
    );
  }

  function closestProjectElement(target) {
    if (!target || !target.closest) return null;
    return target.closest(
      "[data-save-project], [data-unsave-project], [data-project-id], [data-analytics-project-id], .save-project-btn, .bookmark-btn",
    );
  }

  function updateSaveControls(projectId, saved) {
    if (!projectId) return;
    var selector = [
      '[data-save-project="' + projectId + '"]',
      '[data-unsave-project="' + projectId + '"]',
      '[data-project-id="' + projectId + '"].save-project-btn',
      '[data-project-id="' + projectId + '"].bookmark-btn',
      '.save-project-btn[data-project-id="' + projectId + '"]',
      '.bookmark-btn[data-project-id="' + projectId + '"]',
    ].join(", ");

    document.querySelectorAll(selector).forEach(function (button) {
      button.classList.toggle("is-saved", !!saved);
      button.setAttribute("data-state", saved ? "saved" : "unsaved");
      if (button.hasAttribute("data-save-project") || button.hasAttribute("data-unsave-project")) {
        if (saved) {
          button.setAttribute("data-unsave-project", projectId);
          button.removeAttribute("data-save-project");
        } else {
          button.setAttribute("data-save-project", projectId);
          button.removeAttribute("data-unsave-project");
        }
      }
    });
  }

  function loadTrending(options) {
    options = options || {};
    return request("/trending/projects", {
      query: {
        limit: options.limit,
        tech: options.tech,
      },
    }).then(function (data) {
      dispatch("devstage:projects_trending", data);
      return data;
    });
  }

  function loadFeed(options) {
    options = options || {};
    return request("/feed/me", {
      query: {
        page: options.page,
        limit: options.limit,
      },
    }).then(function (data) {
      dispatch("devstage:projects_feed", data);
      return data;
    });
  }

  function getBookmarkStatus(projectId) {
    return request("/bookmarks/status", {
      query: { projectId: projectId },
    }).then(function (data) {
      if (projectId && Object.prototype.hasOwnProperty.call(data, "projectSaved")) {
        updateSaveControls(projectId, !!data.projectSaved);
      }
      dispatch("devstage:bookmark_status", data);
      return data;
    });
  }

  function saveProject(projectId) {
    if (!projectId) return Promise.reject(new Error("Project id is required"));
    return request("/bookmarks/project/" + encodeURIComponent(projectId), {
      method: "POST",
    }).then(function (data) {
      updateSaveControls(projectId, true);
      dispatch("devstage:project_saved", { projectId: projectId, response: data });
      return data;
    });
  }

  function unsaveProject(projectId) {
    if (!projectId) return Promise.reject(new Error("Project id is required"));
    return request("/bookmarks/project/" + encodeURIComponent(projectId), {
      method: "DELETE",
    }).then(function (data) {
      updateSaveControls(projectId, false);
      dispatch("devstage:project_unsaved", { projectId: projectId, response: data });
      return data;
    });
  }

  function trackImpression(projectId) {
    if (!projectId) return Promise.resolve(null);
    return request("/analytics/impression/" + encodeURIComponent(projectId), {
      method: "POST",
    })
      .then(function (data) {
        dispatch("devstage:project_impression", {
          projectId: projectId,
          response: data,
        });
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  function trackClick(projectId) {
    if (!projectId) return Promise.resolve(null);
    return request("/analytics/click/" + encodeURIComponent(projectId), {
      method: "POST",
    })
      .then(function (data) {
        dispatch("devstage:project_click", { projectId: projectId, response: data });
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  function bindSaveControls() {
    document.addEventListener("click", function (event) {
      var el = closestProjectElement(event.target);
      if (!el) return;

      var projectId = getProjectIdFromElement(el);
      if (!projectId) return;

      var isSaveControl =
        el.hasAttribute("data-save-project") ||
        el.hasAttribute("data-unsave-project") ||
        el.classList.contains("save-project-btn") ||
        el.classList.contains("bookmark-btn");

      if (isSaveControl) {
        event.preventDefault();
        var alreadySaved =
          el.hasAttribute("data-unsave-project") ||
          el.classList.contains("is-saved") ||
          el.getAttribute("data-state") === "saved" ||
          el.getAttribute("data-saved") === "true";

        var action = alreadySaved ? unsaveProject : saveProject;
        action(projectId).catch(function (error) {
          dispatch("devstage:project_save_error", {
            projectId: projectId,
            error: error.message,
          });
        });
        return;
      }

      trackClick(projectId);
    });
  }

  function hydrateBookmarkStatuses() {
    var seen = {};
    document
      .querySelectorAll(
        "[data-save-project], [data-unsave-project], .save-project-btn[data-project-id], .bookmark-btn[data-project-id]",
      )
      .forEach(function (el) {
        var projectId = getProjectIdFromElement(el);
        if (!projectId || seen[projectId]) return;
        seen[projectId] = true;
        getBookmarkStatus(projectId).catch(function () {});
      });
  }

  function bindImpressions() {
    var elements = document.querySelectorAll(
      "[data-project-id], [data-analytics-project-id]",
    );
    if (!elements.length) return;

    if ("IntersectionObserver" in window) {
      impressionObserver =
        impressionObserver ||
        new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              var projectId = getProjectIdFromElement(entry.target);
              if (projectId && !observedImpressions[projectId]) {
                observedImpressions[projectId] = true;
                trackImpression(projectId);
              }
              impressionObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.25 },
        );

      elements.forEach(function (el) {
        impressionObserver.observe(el);
      });
    } else {
      elements.forEach(function (el) {
        var projectId = getProjectIdFromElement(el);
        if (projectId && !observedImpressions[projectId]) {
          observedImpressions[projectId] = true;
          trackImpression(projectId);
        }
      });
    }
  }

  function init() {
    bindSaveControls();
    hydrateBookmarkStatuses();
    bindImpressions();
  }

  window.DevStageProjects = {
    loadTrending: loadTrending,
    loadFeed: loadFeed,
    saveProject: saveProject,
    unsaveProject: unsaveProject,
    trackImpression: trackImpression,
    trackClick: trackClick,
    getBookmarkStatus: getBookmarkStatus,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
