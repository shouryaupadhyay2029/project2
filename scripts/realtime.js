(function () {
  "use strict";

  // ─── Constants ────────────────────────────────────────────────────────────────
  var SOCKET_URL = "http://localhost:5000";
  var API_BASE = "http://localhost:5000/api";
  var HEARTBEAT_INTERVAL_MS = 30000;
  var SEND_MESSAGE_TIMEOUT = 10000;
  var OFFLINE_QUEUE_LIMIT = 50;
  var LOG_PREFIX = "[DevStage RT]";

  // ─── State ────────────────────────────────────────────────────────────────────
  var socket = null;
  var heartbeatTimer = null;
  var ioUnavailable = false;
  var initRetryTimer = null;
  var offlineQueue = [];

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function log() {
    var args = [LOG_PREFIX].concat(Array.prototype.slice.call(arguments));
    console.log.apply(console, args);
  }

  function warn() {
    var args = [LOG_PREFIX].concat(Array.prototype.slice.call(arguments));
    console.warn.apply(console, args);
  }

  /** Read the auth token from every known localStorage location. */
  function getStoredToken() {
    try {
      var direct = localStorage.getItem("token");
      if (direct) return direct;

      var authRaw = localStorage.getItem("devstage_auth");
      if (authRaw) {
        var authObj = JSON.parse(authRaw);
        if (authObj && authObj.token) return authObj.token;
      }
    } catch (e) {
      // silently ignore parse errors
    }
    return null;
  }

  /** Return current user id from any of the cached user keys. */
  function getCurrentUserId() {
    try {
      var keys = ["currentUser", "user", "devstage_user_cache"];
      for (var i = 0; i < keys.length; i++) {
        var raw = localStorage.getItem(keys[i]);
        if (raw) {
          var obj = JSON.parse(raw);
          if (obj && (obj._id || obj.id)) return obj._id || obj.id;
        }
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  /** Dispatch a custom window event. */
  function dispatch(eventName, detail) {
    try {
      var evt = new CustomEvent(eventName, {
        detail: detail,
        bubbles: false,
        cancelable: false,
      });
      window.dispatchEvent(evt);
    } catch (e) {
      warn("Failed to dispatch event", eventName, e);
    }
  }

  /** Safe JSON round-trip for localStorage cache updates. */
  function updateLocalStorageCache(key, updater) {
    try {
      var raw = localStorage.getItem(key);
      var data = raw ? JSON.parse(raw) : null;
      var next = updater(data);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      // Ignore storage errors (e.g. private mode quota exceeded)
    }
  }

  // ─── Presence API calls ───────────────────────────────────────────────────────

  function markPresenceOnline() {
    var token = getStoredToken();
    if (!token) return;
    try {
      fetch(API_BASE + "/presence/online", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      }).catch(function (err) {
        warn("Presence online request failed:", err.message);
      });
    } catch (e) {
      warn("Presence online fetch error:", e.message);
    }
  }

  function markPresenceOffline() {
    var token = getStoredToken();
    if (!token) return;
    try {
      fetch(API_BASE + "/presence/offline", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      }).catch(function (err) {
        warn("Presence offline request failed:", err.message);
      });
    } catch (e) {
      warn("Presence offline fetch error:", e.message);
    }
  }

  // ─── DOM helpers ──────────────────────────────────────────────────────────────

  /**
   * Increment every unread-notification badge element.
   * Matches: .notification-count | .notif-badge | [data-notif-count]
   */
  function incrementNotificationBadges() {
    try {
      var selectors = [
        ".notification-count",
        ".notif-badge",
        "[data-notif-count]",
      ];
      selectors.forEach(function (sel) {
        var els = document.querySelectorAll(sel);
        els.forEach(function (el) {
          var current = parseInt(el.textContent.trim(), 10) || 0;
          el.textContent = current + 1;
          el.style.display = ""; // ensure it's visible
        });
      });
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Build a minimal notification list-item element from notification data.
   * Matches the bare-minimum markup expected by most notification lists.
   */
  function buildNotificationItem(notif) {
    try {
      var li = document.createElement("li");
      li.className = "notification-item unread";
      li.setAttribute("data-notif-id", notif._id || notif.id || "");

      var msgEl = document.createElement("span");
      msgEl.className = "notif-message";
      msgEl.textContent = notif.message || notif.content || "";
      li.appendChild(msgEl);

      if (notif.createdAt) {
        var timeEl = document.createElement("span");
        timeEl.className = "notif-time";
        timeEl.textContent = new Date(notif.createdAt).toLocaleTimeString();
        li.appendChild(timeEl);
      }
      return li;
    } catch (e) {
      return null;
    }
  }

  /** Prepend a notification to every known notification list in the DOM. */
  function prependNotificationItem(notif) {
    try {
      var lists = document.querySelectorAll(".notification-list, .notif-list");
      if (!lists.length) return;
      var item = buildNotificationItem(notif);
      if (!item) return;
      lists.forEach(function (list) {
        list.insertBefore(item.cloneNode(true), list.firstChild);
      });
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Append a chat message element to any visible conversation container.
   * Matches: .messages-list | .chat-messages | #messages-container
   */
  function appendMessageToDOM(msg) {
    try {
      var containers = document.querySelectorAll(
        ".messages-list, .chat-messages, #messages-container",
      );
      if (!containers.length) return;

      containers.forEach(function (container) {
        var div = document.createElement("div");
        div.className = "message-item";
        div.setAttribute("data-message-id", msg._id || msg.id || "");

        var currentUserId = getCurrentUserId();
        if (
          currentUserId &&
          (msg.sender === currentUserId ||
            (msg.sender && msg.sender._id === currentUserId))
        ) {
          div.classList.add("message-sent");
        } else {
          div.classList.add("message-received");
        }

        var contentEl = document.createElement("div");
        contentEl.className = "message-content";
        contentEl.textContent = msg.content || msg.text || msg.message || "";
        div.appendChild(contentEl);

        if (msg.createdAt) {
          var timeEl = document.createElement("span");
          timeEl.className = "message-time";
          timeEl.textContent = new Date(msg.createdAt).toLocaleTimeString();
          div.appendChild(timeEl);
        }

        container.appendChild(div);
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
      });
    } catch (e) {
      /* ignore */
    }
  }

  /** Show or hide typing indicators for a given conversationId. */
  function updateTypingIndicator(conversationId, userId, isTyping) {
    try {
      // Generic .typing-indicator elements
      var indicators = document.querySelectorAll(".typing-indicator");
      indicators.forEach(function (el) {
        var forConv =
          el.getAttribute("data-typing-for") ||
          el.getAttribute("data-conversation-id");
        if (!forConv || forConv === String(conversationId)) {
          el.style.display = isTyping ? "" : "none";
        }
      });

      // Attribute-targeted indicators
      var attrIndicators = document.querySelectorAll(
        '[data-typing-for="' + conversationId + '"]',
      );
      attrIndicators.forEach(function (el) {
        el.style.display = isTyping ? "" : "none";
      });
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Update all [data-user-id] elements for a given userId with online/offline state.
   * Also updates .presence-dot / .online-dot children.
   */
  function updatePresenceDOM(userId, isOnline) {
    try {
      var userEls = document.querySelectorAll(
        '[data-user-id="' + userId + '"]',
      );
      userEls.forEach(function (el) {
        if (isOnline) {
          el.classList.add("is-online");
          el.classList.remove("is-offline");
        } else {
          el.classList.remove("is-online");
          el.classList.add("is-offline");
        }

        // Update presence dot children
        var dots = el.querySelectorAll(".presence-dot, .online-dot");
        dots.forEach(function (dot) {
          if (isOnline) {
            dot.classList.add("is-online");
            dot.classList.remove("is-offline");
          } else {
            dot.classList.remove("is-online");
            dot.classList.add("is-offline");
          }
        });
      });

      // Also update .online-indicator elements associated with this user
      var onlineIndicators = document.querySelectorAll(
        '.online-indicator[data-user-id="' + userId + '"]',
      );
      onlineIndicators.forEach(function (el) {
        el.style.display = isOnline ? "" : "none";
      });
    } catch (e) {
      /* ignore */
    }
  }

  /** Update .online-indicator elements for the currently logged-in user. */
  function markCurrentUserOnlineInDOM() {
    try {
      var userId = getCurrentUserId();
      if (!userId) return;

      var indicators = document.querySelectorAll(".online-indicator");
      indicators.forEach(function (el) {
        var forUser = el.getAttribute("data-user-id");
        if (!forUser || forUser === String(userId)) {
          el.style.display = "";
        }
      });

      updatePresenceDOM(userId, true);
    } catch (e) {
      /* ignore */
    }
  }

  /** Increment message unread badge if one exists. */
  function incrementMessageBadge() {
    try {
      var selectors = [
        ".message-count",
        ".msg-badge",
        "[data-msg-count]",
        ".messages-badge",
      ];
      selectors.forEach(function (sel) {
        var els = document.querySelectorAll(sel);
        els.forEach(function (el) {
          var current = parseInt(el.textContent.trim(), 10) || 0;
          el.textContent = current + 1;
          el.style.display = "";
        });
      });
    } catch (e) {
      /* ignore */
    }
  }

  // ─── Emit queue helpers ──────────────────────────────────────────────────────

  function emitWithAck(eventName, payload, options) {
    options = options || {};
    var timeoutMs = options.timeoutMs || SEND_MESSAGE_TIMEOUT;
    var shouldQueue = options.queue !== false;

    return new Promise(function (resolve, reject) {
      if (!eventName) {
        reject(new Error("eventName is required"));
        return;
      }

      if (!socket || !socket.connected) {
        if (!shouldQueue) {
          reject(new Error("Socket not connected"));
          return;
        }

        if (offlineQueue.length >= OFFLINE_QUEUE_LIMIT) {
          offlineQueue.shift();
        }

        offlineQueue.push({
          eventName: eventName,
          payload: payload,
          timeoutMs: timeoutMs,
          resolve: resolve,
          reject: reject,
        });
        return;
      }

      var settled = false;
      var timeoutId = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(eventName + " timed out after " + timeoutMs + "ms"));
      }, timeoutMs);

      try {
        socket.emit(eventName, payload, function (ack) {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve(ack);
        });
      } catch (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  function flushOfflineQueue() {
    if (!socket || !socket.connected || !offlineQueue.length) return;

    var queued = offlineQueue.splice(0, offlineQueue.length);
    queued.forEach(function (item) {
      emitWithAck(item.eventName, item.payload, {
        queue: false,
        timeoutMs: item.timeoutMs,
      }).then(item.resolve, item.reject);
    });
  }

  // ─── Heartbeat ────────────────────────────────────────────────────────────────

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(function () {
      if (socket && socket.connected) {
        socket.emit("presence_ping");
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // ─── Socket event binding ─────────────────────────────────────────────────────

  function bindSocketEvents(sock) {
    // ── Lifecycle ──────────────────────────────────────────────────────────────

    sock.on("connect", function () {
      log("Connected:", sock.id);
      markPresenceOnline();
      markCurrentUserOnlineInDOM();
      startHeartbeat();
      flushOfflineQueue();
    });

    sock.on("disconnect", function (reason) {
      warn("Disconnected:", reason);
      stopHeartbeat();
    });

    sock.on("connect_error", function (err) {
      warn("Connection error:", err.message);
    });

    sock.on("reconnect", function (attempt) {
      log("Reconnected, attempt:", attempt);
      markPresenceOnline();
      markCurrentUserOnlineInDOM();
      startHeartbeat();
      flushOfflineQueue();
    });

    // ── Notifications ──────────────────────────────────────────────────────────

    sock.on("notification_created", function (data) {
      try {
        var notif = typeof data === "string" ? JSON.parse(data) : data;

        incrementNotificationBadges();
        prependNotificationItem(notif);

        updateLocalStorageCache("devstage_notifications", function (current) {
          var list = Array.isArray(current) ? current : [];
          list.unshift(notif);
          return list;
        });

        dispatch("devstage:notification", notif);
      } catch (e) {
        warn("Error handling notification_created:", e.message);
      }
    });

    // ── Messages ───────────────────────────────────────────────────────────────

    sock.on("receive_message", function (data) {
      try {
        var msg = typeof data === "string" ? JSON.parse(data) : data;
        var conversationId = msg.conversationId || msg.conversation || null;

        updateLocalStorageCache("devstage_messages_cache", function (current) {
          var cache = current && typeof current === "object" ? current : {};
          if (conversationId) {
            var thread = Array.isArray(cache[conversationId])
              ? cache[conversationId]
              : [];
            thread.push(msg);
            cache[conversationId] = thread;
          }
          return cache;
        });

        appendMessageToDOM(msg);
        incrementMessageBadge();
        dispatch("devstage:message", msg);
      } catch (e) {
        warn("Error handling receive_message:", e.message);
      }
    });

    sock.on("typing_update", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        var conversationId = payload.conversationId;
        var userId = payload.userId;
        var isTyping = !!payload.isTyping;

        updateTypingIndicator(conversationId, userId, isTyping);
        dispatch("devstage:typing", {
          conversationId: conversationId,
          userId: userId,
          isTyping: isTyping,
        });
      } catch (e) {
        warn("Error handling typing_update:", e.message);
      }
    });

    sock.on("messages_read", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:messages_read", payload);
      } catch (e) {
        warn("Error handling messages_read:", e.message);
      }
    });

    // ── Presence ───────────────────────────────────────────────────────────────

    sock.on("presence_update", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        var userId = payload.userId || payload.user;
        var isOnline = !!payload.isOnline;
        var lastSeen = payload.lastSeen || null;

        updatePresenceDOM(userId, isOnline);
        dispatch("devstage:presence", {
          userId: userId,
          isOnline: isOnline,
          lastSeen: lastSeen,
        });
      } catch (e) {
        warn("Error handling presence_update:", e.message);
      }
    });

    // ── Collaboration ──────────────────────────────────────────────────────────

    sock.on("collaboration_update", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;

        updateLocalStorageCache("devstage_collaboration_cache", function () {
          return payload;
        });

        dispatch("devstage:collaboration", payload);
      } catch (e) {
        warn("Error handling collaboration_update:", e.message);
      }
    });

    // ── Workspace ──────────────────────────────────────────────────────────────

    sock.on("workspace_update", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;

        updateLocalStorageCache("devstage_workspace_cache", function () {
          return payload;
        });

        dispatch("devstage:workspace", payload);
      } catch (e) {
        warn("Error handling workspace_update:", e.message);
      }
    });

    // ── Achievement unlocked ───────────────────────────────────────────────────

    sock.on("achievement_unlocked", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:achievement", payload);
        log("Achievement unlocked:", payload.title, "(", payload.rarity, ")");
      } catch (e) {
        warn("Error handling achievement_unlocked:", e.message);
      }
    });

    // ── Bookmark updated ───────────────────────────────────────────────────────

    sock.on("bookmark_updated", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:bookmark", payload);
      } catch (e) {
        warn("Error handling bookmark_updated:", e.message);
      }
    });

    // ── Feed / Analytics / Trending updates ───────────────────────────────────

    sock.on("feed_updated", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:feed", payload);
      } catch (e) {
        warn("Error handling feed_updated:", e.message);
      }
    });

    sock.on("analytics_update", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:analytics", payload);
      } catch (e) {
        warn("Error handling analytics_update:", e.message);
      }
    });

    sock.on("trending_update", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:trending", payload);
      } catch (e) {
        warn("Error handling trending_update:", e.message);
      }
    });

    sock.on("project_trending", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:trending", payload);
      } catch (e) {
        warn("Error handling project_trending:", e.message);
      }
    });

    sock.on("workspace_activity", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:workspace_activity", payload);
      } catch (e) {
        warn("Error handling workspace_activity:", e.message);
      }
    });

    sock.on("collaboration_changed", function (data) {
      try {
        var payload = typeof data === "string" ? JSON.parse(data) : data;
        dispatch("devstage:collaboration", payload);
      } catch (e) {
        warn("Error handling collaboration_changed:", e.message);
      }
    });
  }

  // ─── Core init ────────────────────────────────────────────────────────────────

  function initSocket(token) {
    // Tear down any existing socket first
    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (e) {
        /* ignore */
      }
      socket = null;
    }

    stopHeartbeat();

    try {
      socket = io(SOCKET_URL, {
        auth: { token: token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      bindSocketEvents(socket);
      window.DevStageRealtime.socket = socket;
      log("Socket initialised");
    } catch (e) {
      warn("Failed to create socket:", e.message);
    }
  }

  /** Dynamically inject the socket.io client script if not already loaded. */
  function loadSocketIOScript(callback) {
    if (typeof io !== "undefined") {
      callback();
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
    script.async = true;
    script.onload = function () {
      log("socket.io CDN loaded dynamically.");
      callback();
    };
    script.onerror = function () {
      warn("Failed to load socket.io from CDN. Realtime features disabled.");
    };
    document.head.appendChild(script);
  }

  function tryInit() {
    if (typeof io === "undefined") {
      ioUnavailable = true;
      warn("socket.io (io) is not loaded. Loading from CDN…");
      loadSocketIOScript(function () {
        if (typeof io !== "undefined") {
          ioUnavailable = false;
          var t = getStoredToken();
          if (t) initSocket(t);
        } else {
          warn("socket.io still not available. Realtime features disabled.");
        }
      });
      return;
    }

    ioUnavailable = false;
    var token = getStoredToken();
    if (!token) {
      warn("No auth token found. Skipping socket init.");
      return;
    }

    initSocket(token);
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  window.DevStageRealtime = {
    socket: null,
    offlineQueue: offlineQueue,
    emitWithAck: emitWithAck,
    flushOfflineQueue: flushOfflineQueue,

    // ── Token sync ──────────────────────────────────────────────────────────────
    updateToken: function (newToken) {
      if (!newToken) return;
      try {
        if (socket) {
          socket.auth = { token: newToken };
          if (!socket.connected) {
            socket.connect();
          }
        } else {
          initSocket(newToken);
        }
      } catch (e) {
        warn("updateToken error:", e.message);
      }
    },

    // ── Conversation helpers ────────────────────────────────────────────────────
    joinConversation: function (conversationId) {
      if (socket && socket.connected) {
        socket.emit("join_conversation", { conversationId: conversationId });
      }
    },

    leaveConversation: function (conversationId) {
      if (socket && socket.connected) {
        socket.emit("leave_conversation", { conversationId: conversationId });
      }
    },

    /**
     * Emit send_message and return a Promise that resolves on receive_message
     * or rejects after SEND_MESSAGE_TIMEOUT ms.
     */
    sendMessage: function (data) {
      return new Promise(function (resolve, reject) {
        if (!socket || !socket.connected) {
          return reject(new Error("Socket not connected"));
        }

        var settled = false;
        var timeoutId = null;

        function onReceive(msg) {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          socket.off("receive_message", onReceive);
          resolve(msg);
        }

        socket.on("receive_message", onReceive);

        timeoutId = setTimeout(function () {
          if (settled) return;
          settled = true;
          socket.off("receive_message", onReceive);
          reject(
            new Error(
              "sendMessage timed out after " + SEND_MESSAGE_TIMEOUT + "ms",
            ),
          );
        }, SEND_MESSAGE_TIMEOUT);

        try {
          socket.emit("send_message", data);
        } catch (e) {
          settled = true;
          clearTimeout(timeoutId);
          socket.off("receive_message", onReceive);
          reject(e);
        }
      });
    },

    startTyping: function (conversationId) {
      if (socket && socket.connected) {
        socket.emit("typing_start", { conversationId: conversationId });
      }
    },

    stopTyping: function (conversationId) {
      if (socket && socket.connected) {
        socket.emit("typing_stop", { conversationId: conversationId });
      }
    },

    markRead: function (conversationId) {
      if (socket && socket.connected) {
        socket.emit("message_read", { conversationId: conversationId });
      }
    },

    // ── Disconnect / cleanup ────────────────────────────────────────────────────
    disconnect: function () {
      stopHeartbeat();
      if (socket) {
        try {
          socket.removeAllListeners();
          socket.disconnect();
        } catch (e) {
          /* ignore */
        }
        socket = null;
        window.DevStageRealtime.socket = null;
      }
      log("Disconnected by explicit call.");
    },
  };

  // ─── Page-visibility heartbeat ────────────────────────────────────────────────

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      if (socket && socket.connected) {
        socket.emit("presence_ping");
      }
    }
  });

  // ─── Graceful unload ──────────────────────────────────────────────────────────

  window.addEventListener("beforeunload", function () {
    // Best-effort ping before page is torn down
    try {
      if (socket && socket.connected) {
        socket.emit("presence_ping");
      }
    } catch (e) {
      /* ignore */
    }

    markPresenceOffline();
  });

  // ─── Auth event bridge ────────────────────────────────────────────────────────

  window.addEventListener("devstage:auth_changed", function (evt) {
    try {
      var detail = evt.detail || {};
      var loggedIn =
        detail.loggedIn !== undefined ? detail.loggedIn : !!detail.token;
      var token = detail.token || getStoredToken();

      if (loggedIn && token) {
        log("Auth changed: logged in. Re-initialising socket.");
        window.DevStageRealtime.updateToken(token);
      } else {
        log("Auth changed: logged out. Disconnecting socket.");
        window.DevStageRealtime.disconnect();
      }
    } catch (e) {
      warn("Error in devstage:auth_changed handler:", e.message);
    }
  });

  // ─── Bootstrap ────────────────────────────────────────────────────────────────

  // Run after DOM is ready to ensure any page-level scripts have had a chance
  // to set up localStorage and load socket.io.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit);
  } else {
    tryInit();
  }
})();
