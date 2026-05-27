'use strict';

const { extractSkillsFromText } = require('./skillAnalysis');

const CATEGORY_KEYWORDS = {
  frontend: ['frontend', 'front-end', 'ui', 'ux', 'react', 'next.js', 'vue', 'angular', 'tailwind', 'css', 'dashboard', 'landing page'],
  backend: ['backend', 'back-end', 'api', 'server', 'express', 'node.js', 'django', 'flask', 'fastapi', 'database', 'microservice'],
  fullstack: ['fullstack', 'full-stack', 'mern', 'mean', 'web app', 'saas', 'ecommerce', 'e-commerce'],
  mobile: ['mobile', 'android', 'ios', 'react native', 'flutter', 'kotlin', 'swift'],
  ai: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'nlp', 'computer vision', 'tensorflow', 'pytorch', 'chatbot'],
  devops: ['devops', 'docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'gcp', 'deployment', 'terraform'],
  data: ['data', 'analytics', 'etl', 'pipeline', 'pandas', 'numpy', 'visualization', 'bi', 'sql'],
  game: ['game', 'unity', 'unreal', 'phaser', 'godot']
};

function toText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(toText).join(' ');
  if (typeof value === 'object') return Object.values(value).map(toText).join(' ');
  return String(value);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function projectSearchText(project) {
  if (!project) return '';
  return toText([
    project.title,
    project.name,
    project.description,
    project.summary,
    project.githubUrl,
    project.liveUrl,
    project.techStack,
    project.tags,
    project.category
  ]);
}

function normalizeProjectTechStack(project) {
  const existing = [];
  if (project && Array.isArray(project.techStack)) existing.push(...project.techStack);
  if (project && typeof project.techStack === 'string') existing.push(...project.techStack.split(/[;,]/));
  return existing.map((item) => String(item).trim()).filter(Boolean);
}

function detectTechStack(project) {
  const text = projectSearchText(project);
  const extracted = extractSkillsFromText(text);
  return unique([...normalizeProjectTechStack(project), ...extracted]);
}

function countKeywordHits(text, keywords) {
  return keywords.reduce((count, keyword) => {
    return text.includes(keyword.toLowerCase()) ? count + 1 : count;
  }, 0);
}

function inferCategory(project) {
  const text = projectSearchText(project).toLowerCase();
  const techStack = detectTechStack(project).map((skill) => skill.toLowerCase()).join(' ');
  const combinedText = `${text} ${techStack}`;

  const scores = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => ({
    category,
    score: countKeywordHits(combinedText, keywords)
  }));

  const best = scores.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))[0];

  if (!best || best.score === 0) return 'other';

  const frontendScore = scores.find((item) => item.category === 'frontend').score;
  const backendScore = scores.find((item) => item.category === 'backend').score;
  if (frontendScore > 0 && backendScore > 0) return 'fullstack';

  return best.category;
}

function tagProject(project) {
  const techStack = detectTechStack(project);
  const category = inferCategory(project);
  const baseTags = Array.isArray(project && project.tags) ? project.tags : [];
  const tags = unique([...baseTags, category !== 'other' ? category : null, ...techStack.slice(0, 8)]);

  const evidenceCount = techStack.length + (category === 'other' ? 0 : 2) + baseTags.length;
  const confidence = Math.max(20, Math.min(95, 35 + evidenceCount * 8));

  return {
    techStack,
    category,
    tags,
    confidence
  };
}

module.exports = {
  detectTechStack,
  inferCategory,
  tagProject
};
