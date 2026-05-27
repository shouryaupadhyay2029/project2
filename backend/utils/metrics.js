const metrics = {
  startedAt: new Date(),
  requests: {
    total: 0,
    byMethod: {},
  },
  statuses: {},
  routes: {},
  socketConnections: 0,
  errors: {
    total: 0,
    byName: {},
  },
};

const getRouteKey = (req) => {
  const routePath = req.route?.path;
  const baseUrl = req.baseUrl || "";

  if (routePath) {
    return `${req.method} ${baseUrl}${routePath}`;
  }

  return `${req.method} ${req.originalUrl || req.url}`;
};

const metricsMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  metrics.requests.total += 1;
  metrics.requests.byMethod[req.method] =
    (metrics.requests.byMethod[req.method] || 0) + 1;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1000000;
    const statusCode = String(res.statusCode);
    const routeKey = getRouteKey(req);

    metrics.statuses[statusCode] = (metrics.statuses[statusCode] || 0) + 1;

    if (!metrics.routes[routeKey]) {
      metrics.routes[routeKey] = {
        count: 0,
        totalMs: 0,
        minMs: null,
        maxMs: 0,
      };
    }

    const routeMetrics = metrics.routes[routeKey];
    routeMetrics.count += 1;
    routeMetrics.totalMs += durationMs;
    routeMetrics.minMs =
      routeMetrics.minMs === null ? durationMs : Math.min(routeMetrics.minMs, durationMs);
    routeMetrics.maxMs = Math.max(routeMetrics.maxMs, durationMs);
    routeMetrics.avgMs = routeMetrics.totalMs / routeMetrics.count;
  });

  next();
};

const recordError = (error) => {
  const name = error?.name || "UnknownError";

  metrics.errors.total += 1;
  metrics.errors.byName[name] = (metrics.errors.byName[name] || 0) + 1;
};

const recordSocketConnection = (delta) => {
  const change = Number(delta) || 0;
  metrics.socketConnections = Math.max(0, metrics.socketConnections + change);
};

const getMetricsSnapshot = () => ({
  startedAt: metrics.startedAt,
  uptimeSeconds: Math.floor((Date.now() - metrics.startedAt.getTime()) / 1000),
  requests: {
    total: metrics.requests.total,
    byMethod: { ...metrics.requests.byMethod },
  },
  statuses: { ...metrics.statuses },
  routes: Object.fromEntries(
    Object.entries(metrics.routes).map(([route, values]) => [
      route,
      {
        count: values.count,
        totalMs: Number(values.totalMs.toFixed(2)),
        minMs: values.minMs === null ? null : Number(values.minMs.toFixed(2)),
        maxMs: Number(values.maxMs.toFixed(2)),
        avgMs: Number((values.avgMs || 0).toFixed(2)),
      },
    ]),
  ),
  socketConnections: metrics.socketConnections,
  errors: {
    total: metrics.errors.total,
    byName: { ...metrics.errors.byName },
  },
});

module.exports = {
  metricsMiddleware,
  recordError,
  recordSocketConnection,
  getMetricsSnapshot,
};
