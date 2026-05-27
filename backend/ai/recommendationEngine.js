'use strict';

const { buildSkillGraph } = require('./skillAnalysis');
const { tagProject } = require('./projectTagging');

function normalizeList(values) {
  if (!values) return [];
  const list = Array.isArray(values) ? values : String(values).split(/[;,]/);
  return Array.from(
    new Set(
      list
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
}

function similarityScore(a = [], b = []) {
  const first = new Set(normalizeList(a));
  const second = new Set(normalizeList(b));

  if (first.size === 0 && second.size === 0) return 0;

  const intersection = Array.from(first).filter((item) => second.has(item)).length;
  const union = new Set([...first, ...second]).size;

  return Math.round((intersection / union) * 100);
}

function toPlainObject(value) {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
}

function identifierFor(value) {
  if (!value) return null;
  return String(value._id || value.id || value.email || value.username || '');
}

function reasonFromMatches(prefix, matches) {
  if (!matches.length) return null;
  return `${prefix}: ${matches.slice(0, 5).join(', ')}`;
}

function intersectLabels(a = [], b = []) {
  const normalizedB = new Set(normalizeList(b));
  return normalizeList(a).filter((item) => normalizedB.has(item));
}

function rankProjectsForUser(user, projects) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const userGraph = buildSkillGraph(user, safeProjects);
  const userSkills = userGraph.skills;

  return safeProjects
    .map((project) => {
      const plainProject = toPlainObject(project);
      const projectTags = tagProject(plainProject);
      const techScore = similarityScore(userSkills, projectTags.techStack);
      const tagScore = similarityScore(user && user.developerTags, projectTags.tags);
      const recommendationScore = Math.round(techScore * 0.75 + tagScore * 0.25);
      const matchedSkills = intersectLabels(userSkills, projectTags.techStack);
      const matchedTags = intersectLabels(user && user.developerTags, projectTags.tags);
      const reasons = [
        reasonFromMatches('Matches your skills', matchedSkills),
        reasonFromMatches('Matches your interests', matchedTags),
        projectTags.category !== 'other' ? `Project category: ${projectTags.category}` : null
      ].filter(Boolean);

      if (!reasons.length) reasons.push('Included as a discovery recommendation');

      return {
        ...plainProject,
        recommendationScore,
        reasons,
        inferredTechStack: projectTags.techStack,
        inferredCategory: projectTags.category
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore || String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')));
}

function rankUsersForUser(user, users) {
  const safeUsers = Array.isArray(users) ? users : [];
  const currentUserId = identifierFor(user);
  const currentGraph = buildSkillGraph(user);
  const currentSkills = currentGraph.skills;
  const currentTags = normalizeList(user && user.developerTags);

  return safeUsers
    .map(toPlainObject)
    .filter((candidate) => !currentUserId || identifierFor(candidate) !== currentUserId)
    .map((candidate) => {
      const candidateGraph = buildSkillGraph(candidate);
      const skillScore = similarityScore(currentSkills, candidateGraph.skills);
      const tagScore = similarityScore(currentTags, candidate.developerTags);
      const recommendationScore = Math.round(skillScore * 0.8 + tagScore * 0.2);
      const matchedSkills = intersectLabels(currentSkills, candidateGraph.skills);
      const matchedTags = intersectLabels(currentTags, candidate.developerTags);
      const reasons = [
        reasonFromMatches('Shared skills', matchedSkills),
        reasonFromMatches('Shared developer tags', matchedTags)
      ].filter(Boolean);

      if (!reasons.length) reasons.push('Potential networking match');

      return {
        ...candidate,
        recommendationScore,
        reasons,
        inferredSkills: candidateGraph.skills
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore || String(a.name || '').localeCompare(String(b.name || '')));
}

module.exports = {
  similarityScore,
  rankProjectsForUser,
  rankUsersForUser
};
