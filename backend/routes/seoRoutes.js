const express = require("express");
const { generateSitemap } = require("../utils/sitemapGenerator");

const router = express.Router();

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const xml = await generateSitemap(baseUrl);

    res.type("application/xml").send(xml);
  } catch (error) {
    next(error);
  }
});

router.get("/robots.txt", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.type("text/plain").send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

module.exports = router;
