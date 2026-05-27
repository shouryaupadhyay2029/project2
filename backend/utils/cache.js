// Redis-ready: Replace CacheStore methods with ioredis client calls when scaling

const DEFAULT_TTL = 60; // seconds

// ─── CacheStore Class ─────────────────────────────────────────────────────────

class CacheStore {
    constructor() {
        /** @type {Map<string, { value: any, expiresAt: number }>} */
        this._store = new Map();
    }

    /**
     * Retrieve a cached value by key. Returns null if missing or expired.
     * @param {string} key
     * @returns {any|null}
     */
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this._store.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Store a value with an optional TTL (in seconds).
     * @param {string} key
     * @param {any} value
     * @param {number} [ttlSeconds]
     */
    set(key, value, ttlSeconds = DEFAULT_TTL) {
        this._store.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    /**
     * Delete a single key from the cache.
     * @param {string} key
     */
    del(key) {
        this._store.delete(key);
    }

    /**
     * Clear all entries from the cache.
     */
    flush() {
        this._store.clear();
    }

    /**
     * Check whether a key exists and has not expired.
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

const cache = new CacheStore();

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get a cached value by key.
 * @param {string} key
 * @returns {any|null}
 */
const getCache = (key) => cache.get(key);

/**
 * Set a cached value with an optional TTL (in seconds).
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl]
 */
const setCache = (key, value, ttl = DEFAULT_TTL) => cache.set(key, value, ttl);

/**
 * Delete a cached entry by key.
 * @param {string} key
 */
const delCache = (key) => cache.del(key);

/**
 * Flush all cached entries.
 */
const flushCache = () => cache.flush();

// ─── Express Middleware Factory ───────────────────────────────────────────────

/**
 * Express middleware that caches GET responses in memory.
 *
 * Usage: router.get("/endpoint", cacheMiddleware("my-key", 120), handler)
 *
 * @param {string} key   - Cache key (or a function (req) => string for dynamic keys)
 * @param {number} [ttl] - TTL in seconds (default: 60)
 * @returns {import("express").RequestHandler}
 */
const cacheMiddleware = (key, ttl = DEFAULT_TTL) => (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const cacheKey = typeof key === "function" ? key(req) : key;
    const cached = cache.get(cacheKey);

    if (cached !== null) {
        return res.status(200).json({
            ...cached,
            _fromCache: true,
        });
    }

    // Intercept res.json to store the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
            cache.set(cacheKey, body, ttl);
        }
        return originalJson(body);
    };

    next();
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = cache;
module.exports.CacheStore = CacheStore;
module.exports.getCache = getCache;
module.exports.setCache = setCache;
module.exports.delCache = delCache;
module.exports.flushCache = flushCache;
module.exports.cacheMiddleware = cacheMiddleware;
