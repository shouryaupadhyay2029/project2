'use strict';

const KNOWN_SKILLS = [
  { name: 'JavaScript', aliases: ['javascript', 'js', 'ecmascript'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'React', aliases: ['react', 'reactjs', 'react.js'] },
  { name: 'Next.js', aliases: ['nextjs', 'next.js'] },
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node.js'] },
  { name: 'Express', aliases: ['express', 'expressjs', 'express.js'] },
  { name: 'MongoDB', aliases: ['mongodb', 'mongo', 'mongoose'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'Redis', aliases: ['redis'] },
  { name: 'Python', aliases: ['python', 'py'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'Flask', aliases: ['flask'] },
  { name: 'FastAPI', aliases: ['fastapi'] },
  { name: 'Java', aliases: ['java'] },
  { name: 'Spring Boot', aliases: ['spring boot', 'springboot'] },
  { name: 'C++', aliases: ['c++', 'cpp'] },
  { name: 'C#', aliases: ['c#', 'csharp'] },
  { name: 'PHP', aliases: ['php'] },
  { name: 'Laravel', aliases: ['laravel'] },
  { name: 'Ruby', aliases: ['ruby'] },
  { name: 'Rails', aliases: ['rails', 'ruby on rails'] },
  { name: 'Go', aliases: ['go', 'golang'] },
  { name: 'Rust', aliases: ['rust'] },
  { name: 'HTML', aliases: ['html', 'html5'] },
  { name: 'CSS', aliases: ['css', 'css3'] },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwind css'] },
  { name: 'Bootstrap', aliases: ['bootstrap'] },
  { name: 'Sass', aliases: ['sass', 'scss'] },
  { name: 'Redux', aliases: ['redux', 'redux toolkit'] },
  { name: 'GraphQL', aliases: ['graphql'] },
  { name: 'REST API', aliases: ['rest api', 'restful', 'api'] },
  { name: 'Docker', aliases: ['docker', 'dockerfile'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services'] },
  { name: 'Azure', aliases: ['azure'] },
  { name: 'Google Cloud', aliases: ['google cloud', 'gcp'] },
  { name: 'Git', aliases: ['git', 'github', 'gitlab'] },
  { name: 'CI/CD', aliases: ['ci/cd', 'cicd', 'github actions', 'jenkins'] },
  { name: 'Machine Learning', aliases: ['machine learning', 'ml'] },
  { name: 'Artificial Intelligence', aliases: ['artificial intelligence', 'ai'] },
  { name: 'Data Science', aliases: ['data science'] },
  { name: 'Pandas', aliases: ['pandas'] },
  { name: 'NumPy', aliases: ['numpy'] },
  { name: 'TensorFlow', aliases: ['tensorflow'] },
  { name: 'PyTorch', aliases: ['pytorch'] },
  { name: 'OpenCV', aliases: ['opencv'] },
  { name: 'React Native', aliases: ['react native', 'react-native'] },
  { name: 'Flutter', aliases: ['flutter'] },
  { name: 'Kotlin', aliases: ['kotlin'] },
  { name: 'Swift', aliases: ['swift'] },
  { name: 'Unity', aliases: ['unity', 'unity3d'] },
  { name: 'Unreal Engine', aliases: ['unreal', 'unreal engine'] },
  { name: 'WebSocket', aliases: ['websocket', 'websockets', 'socket.io'] },
  { name: 'Testing', aliases: ['testing', 'jest', 'mocha', 'vitest', 'cypress', 'playwright'] }
];

const SKILL_BY_NAME = new Map(KNOWN_SKILLS.map((skill) => [skill.name.toLowerCase(), skill.name]));

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(toText).join(' ');
  if (typeof value === 'object') return Object.values(value).map(toText).join(' ');
  return String(value);
}

function normalizeSkillName(skill) {
  if (!skill) return null;
  const exact = SKILL_BY_NAME.get(String(skill).trim().toLowerCase());
  if (exact) return exact;

  const lowered = String(skill).trim().toLowerCase();
  const match = KNOWN_SKILLS.find((knownSkill) =>
    knownSkill.aliases.some((alias) => alias.toLowerCase() === lowered)
  );

  return match ? match.name : String(skill).trim();
}

function extractSkillsFromText(text) {
  const haystack = toText(text).toLowerCase();
  const matches = new Set();

  for (const skill of KNOWN_SKILLS) {
    for (const alias of skill.aliases) {
      const escapedAlias = escapeRegExp(alias.toLowerCase());
      const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapedAlias}([^a-z0-9+#.]|$)`, 'i');
      if (pattern.test(haystack)) {
        matches.add(skill.name);
        break;
      }
    }
  }

  return Array.from(matches).sort((a, b) => a.localeCompare(b));
}

function collectUserText(user) {
  if (!user) return '';
  return toText([
    user.name,
    user.title,
    user.headline,
    user.bio,
    user.about,
    user.location,
    user.skills,
    user.developerTags,
    user.interests,
    user.experience
  ]);
}

function collectProjectText(project) {
  if (!project) return '';
  return toText([
    project.title,
    project.name,
    project.description,
    project.summary,
    project.techStack,
    project.tags,
    project.category,
    project.githubUrl,
    project.liveUrl
  ]);
}

function addSkillScores(scoreBySkill, skills, weight) {
  for (const skill of skills) {
    const normalizedSkill = normalizeSkillName(skill);
    if (!normalizedSkill) continue;
    scoreBySkill[normalizedSkill] = (scoreBySkill[normalizedSkill] || 0) + weight;
  }
}

function buildSkillGraph(user, projects = []) {
  const scoreBySkill = {};
  const userSkills = Array.isArray(user && user.skills) ? user.skills : [];
  const userTags = Array.isArray(user && user.developerTags) ? user.developerTags : [];
  const detectedUserSkills = extractSkillsFromText(collectUserText(user));

  addSkillScores(scoreBySkill, userSkills, 4);
  addSkillScores(scoreBySkill, userTags, 3);
  addSkillScores(scoreBySkill, detectedUserSkills, 2);

  const relatedSets = {};
  for (const project of Array.isArray(projects) ? projects : []) {
    const projectSkills = extractSkillsFromText(collectProjectText(project));
    addSkillScores(scoreBySkill, projectSkills, 1);

    for (const skill of projectSkills) {
      relatedSets[skill] = relatedSets[skill] || new Set();
      for (const relatedSkill of projectSkills) {
        if (relatedSkill !== skill) relatedSets[skill].add(relatedSkill);
      }
    }
  }

  const skills = Object.keys(scoreBySkill).sort((a, b) => {
    const scoreDiff = scoreBySkill[b] - scoreBySkill[a];
    return scoreDiff || a.localeCompare(b);
  });

  const primarySkills = skills.slice(0, 8);
  const relatedSkills = Object.fromEntries(
    Object.entries(relatedSets).map(([skill, related]) => [skill, Array.from(related).sort()])
  );

  return {
    skills,
    primarySkills,
    relatedSkills,
    scoreBySkill
  };
}

module.exports = {
  KNOWN_SKILLS,
  extractSkillsFromText,
  buildSkillGraph
};
