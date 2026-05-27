const APP_NAME = "DevStage";
const DEFAULT_DESCRIPTION = "Discover developer projects, profiles, and collaboration opportunities on DevStage.";

function buildProjectMetadata(project = {}, baseUrl = "") {
  const title = clean(project.title) || "Project";
  const description = clean(project.description) || DEFAULT_DESCRIPTION;
  const url = projectUrl(project, baseUrl);
  const image = absoluteUrl(project.thumbnail || "/assets/icon-512.png", baseUrl);

  return {
    title: `${title} | ${APP_NAME}`,
    description,
    canonical: url,
    keywords: normalizeList(project.techStack),
    openGraph: {
      type: "article",
      siteName: APP_NAME,
      title,
      description,
      url,
      image,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
    },
    structuredData: structuredData("Project", project, baseUrl),
  };
}

function buildProfileMetadata(user = {}, baseUrl = "") {
  const name = clean(user.displayName) || clean(user.username) || "Developer";
  const description = clean(user.bio) || `${name}'s developer profile on ${APP_NAME}.`;
  const url = profileUrl(user, baseUrl);
  const image = absoluteUrl(user.profilePhoto || "/assets/icon-512.png", baseUrl);

  return {
    title: `${name} | ${APP_NAME}`,
    description,
    canonical: url,
    keywords: [...normalizeList(user.skills), ...normalizeList(user.techStack), ...normalizeList(user.developerTags)],
    openGraph: {
      type: "profile",
      siteName: APP_NAME,
      title: name,
      description,
      url,
      image,
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      image,
    },
    structuredData: structuredData("Profile", user, baseUrl),
  };
}

function structuredData(type, data = {}, baseUrl = "") {
  if (type === "Project") {
    const title = clean(data.title) || "Project";

    return compactObject({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: title,
      description: clean(data.description),
      url: projectUrl(data, baseUrl),
      image: absoluteUrl(data.thumbnail, baseUrl),
      keywords: normalizeList(data.techStack).join(", ") || undefined,
      dateCreated: toIsoDate(data.createdAt),
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/LikeAction",
          userInteractionCount: data.likes || 0,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/ViewAction",
          userInteractionCount: data.views || 0,
        },
      ],
      sameAs: [data.githubUrl, data.liveUrl].filter(Boolean),
    });
  }

  if (type === "Profile" || type === "Person") {
    const name = clean(data.displayName) || clean(data.username) || "Developer";

    return compactObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name,
      alternateName: clean(data.username),
      description: clean(data.bio),
      url: profileUrl(data, baseUrl),
      image: absoluteUrl(data.profilePhoto, baseUrl),
      knowsAbout: [...normalizeList(data.skills), ...normalizeList(data.techStack), ...normalizeList(data.developerTags)],
      homeLocation: clean(data.location),
      sameAs: [
        data.portfolioWebsite,
        data.socialLinks && data.socialLinks.github,
        data.socialLinks && data.socialLinks.twitter,
        data.socialLinks && data.socialLinks.linkedin,
      ].filter(Boolean),
    });
  }

  return compactObject({
    "@context": "https://schema.org",
    "@type": type || "WebSite",
    name: APP_NAME,
    url: absoluteUrl("/", baseUrl),
    description: DEFAULT_DESCRIPTION,
  });
}

function projectUrl(project = {}, baseUrl = "") {
  const id = encodeURIComponent(String(project.slug || project._id || project.id || ""));
  return absoluteUrl(id ? `/pages/explore.html?project=${id}` : "/pages/explore.html", baseUrl);
}

function profileUrl(user = {}, baseUrl = "") {
  const identifier = encodeURIComponent(String(user.username || user._id || user.id || ""));
  return absoluteUrl(identifier ? `/pages/profile.html?user=${identifier}` : "/pages/profile.html", baseUrl);
}

function absoluteUrl(value = "", baseUrl = "") {
  if (!value) {
    return undefined;
  }

  const text = String(value);
  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  const base = String(baseUrl || "").replace(/\/+$/, "");
  const path = text.startsWith("/") ? text : `/${text}`;
  return `${base}${path}`;
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(clean).filter(Boolean);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toIsoDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function compactObject(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined && item !== null && item !== "");
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (Array.isArray(item)) {
        return item.length > 0;
      }
      return item !== undefined && item !== null && item !== "";
    }),
  );
}

module.exports = {
  buildProjectMetadata,
  buildProfileMetadata,
  structuredData,
};
