const Project = require("../models/Project");
const User = require("../models/user");

const STATIC_ROUTES = [
  "/",
  "/index.html",
  "/pages/explore.html",
  "/pages/feed.html",
  "/pages/profile.html",
  "/pages/teams.html",
  "/pages/challenges.html",
  "/pages/beginner.html"
];

async function generateSitemap(baseUrl = "") {
  const base = normalizeBaseUrl(baseUrl);
  const [projects, users] = await Promise.all([
    Project.find({}).select("_id updatedAt createdAt").sort({ createdAt: -1 }).limit(1000).lean(),
    User.find({
      isBanned: { $ne: true },
      $or: [
        { "security.profileVisibility": "public" },
        { "security.profileVisibility": { $exists: false } },
      ],
    })
      .select("_id username updatedAt createdAt")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean(),
  ]);

  const urls = [
    ...STATIC_ROUTES.map((route) => ({ loc: absoluteUrl(route, base), priority: route === "/" ? "1.0" : "0.7" })),
    ...projects.map((project) => ({
      loc: absoluteUrl(`/pages/explore.html?project=${encodeURIComponent(String(project._id))}`, base),
      lastmod: formatDate(project.updatedAt || project.createdAt),
      priority: "0.8",
    })),
    ...users.map((user) => ({
      loc: absoluteUrl(
        `/pages/profile.html?user=${encodeURIComponent(String(user.username || user._id))}`,
        base,
      ),
      lastmod: formatDate(user.updatedAt || user.createdAt),
      priority: "0.8",
    })),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(urlEntry),
    "</urlset>",
  ].join("\n");
}

function urlEntry({ loc, lastmod, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : "",
    priority ? `    <priority>${priority}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

function absoluteUrl(path, baseUrl) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function formatDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().split("T")[0];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = {
  generateSitemap,
};
