'use strict';

const { extractSkillsFromText, buildSkillGraph } = require('./skillAnalysis');
const { tagProject } = require('./projectTagging');
const { rankProjectsForUser, rankUsersForUser } = require('./recommendationEngine');

function hashString(value) {
  const text = String(value || '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function deterministicEmbedding(text, dimensions = 16) {
  const source = String(text || '');
  const embedding = [];

  for (let index = 0; index < dimensions; index += 1) {
    const seed = hashString(`${source}:${index}`);
    embedding.push(Number(((seed % 2001) / 1000 - 1).toFixed(3)));
  }

  return embedding;
}

function safeObject(value) {
  return value && typeof value === 'object' ? value : {};
}

class AIService {
  constructor(env = process.env) {
    this.enabled = env.AI_ENABLED === 'true';
    this.provider = env.AI_PROVIDER || 'local-fallback';
    this.model = env.AI_MODEL || 'deterministic-heuristics-v1';
  }

  isEnabled() {
    return this.enabled;
  }

  analyzeText(text, context = {}) {
    const sourceText = String(text || '');
    const words = sourceText.trim() ? sourceText.trim().split(/\s+/) : [];
    const skills = extractSkillsFromText(sourceText);

    return {
      enabled: this.isEnabled(),
      provider: this.provider,
      model: this.model,
      summary: words.slice(0, 30).join(' '),
      keywords: this.extractKeywords(sourceText),
      skills,
      sentiment: 'neutral',
      language: 'en',
      confidence: skills.length ? 70 : 45,
      context: safeObject(context),
      fallback: true
    };
  }

  inferProjectMetadata(project) {
    const safeProject = safeObject(project);
    const taggedProject = tagProject(safeProject);

    return {
      enabled: this.isEnabled(),
      provider: this.provider,
      model: this.model,
      title: safeProject.title || safeProject.name || '',
      description: safeProject.description || safeProject.summary || '',
      ...taggedProject,
      fallback: true
    };
  }

  recommend(input) {
    const safeInput = safeObject(input);
    const user = safeInput.user || safeInput.currentUser || {};
    const projects = Array.isArray(safeInput.projects) ? safeInput.projects : [];
    const users = Array.isArray(safeInput.users) ? safeInput.users : [];

    return {
      enabled: this.isEnabled(),
      provider: this.provider,
      model: this.model,
      skillGraph: buildSkillGraph(user, projects),
      projects: rankProjectsForUser(user, projects),
      users: rankUsersForUser(user, users),
      fallback: true
    };
  }

  generateEmbedding(text) {
    return {
      enabled: this.isEnabled(),
      provider: this.provider,
      model: this.model,
      dimensions: 16,
      embedding: deterministicEmbedding(text, 16),
      fallback: true
    };
  }

  extractKeywords(text) {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'with'
    ]);

    const counts = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .reduce((accumulator, word) => {
        accumulator[word] = (accumulator[word] || 0) + 1;
        return accumulator;
      }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([word]) => word);
  }
}

const aiService = new AIService();

module.exports = aiService;
module.exports.AIService = AIService;
module.exports.aiService = aiService;
