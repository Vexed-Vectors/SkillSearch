import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a README.md from skill metadata.
 * This is called automatically when a user publishes a skill — 
 * they never need to write a README themselves.
 */
function generateReadme(name, description, personaSlug, tags) {
  const tagLine = tags.length > 0
    ? tags.map(t => `\`${t}\``).join(' · ')
    : '_No tags_';

  return `# ${name}

${description}

## Persona

**${personaSlug}**

## Tags

${tagLine}

## Usage

Install this skill using SkillForge:
- **VS Code Extension**: Search for "${name}" in the SkillForge sidebar
- **CLI**: \`skillforge install ${name}\`
- **Web Portal**: Browse and install from the catalog
`;
}

/**
 * Generate a skill.yaml manifest from provided metadata.
 * The user never creates this — our tool generates it from their inputs.
 */
function generateManifest({ name, version, description, author, persona, tags, applyTo }) {
  return {
    name,
    version: version || '1.0.0',
    description,
    author: author || 'anonymous',
    persona,
    tags: tags || [],
    compatibleWith: ['copilot-instructions'],
    targetFile: applyTo
      ? `.github/instructions/${name}.instructions.md`
      : '.github/copilot-instructions.md',
    ...(applyTo ? { applyTo } : {}),
  };
}

/**
 * List skills with optional filters.
 */
export function listSkills({ persona, search, tags, status = 'published', limit = 50, offset = 0 }) {
  let query = 'SELECT * FROM skills WHERE status = ?';
  const params = [status];

  if (persona) {
    // Include sub-personas: find all personas whose slug starts with the given persona
    query += ' AND (persona_slug = ? OR persona_slug LIKE ?)';
    params.push(persona, `${persona}-%`);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR content_md LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',');
    for (const tag of tagList) {
      query += ' AND tags LIKE ?';
      params.push(`%"${tag.trim()}"%`);
    }
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const skills = db.prepare(query).all(...params);

  // Parse JSON fields
  return skills.map(s => ({
    ...s,
    tags: JSON.parse(s.tags),
    manifest: s.manifest ? JSON.parse(s.manifest) : null,
  }));
}

/**
 * Get a single skill by ID or name.
 */
export function getSkill(idOrName) {
  const skill = db.prepare(
    'SELECT * FROM skills WHERE id = ? OR name = ?'
  ).get(idOrName, idOrName);

  if (!skill) return null;

  return {
    ...skill,
    tags: JSON.parse(skill.tags),
    manifest: skill.manifest ? JSON.parse(skill.manifest) : null,
  };
}

/**
 * Create / publish a new skill.
 * The user provides: name, description, content_md, persona_slug, tags, author_name, applyTo (optional)
 * We auto-generate: skill.yaml manifest, README.md
 */
export function createSkill({ name, description, content_md, persona_slug, tags = [], author_name = 'anonymous', apply_to = null }) {
  // Check for duplicate name
  const existing = db.prepare('SELECT id FROM skills WHERE name = ?').get(name);
  if (existing) {
    throw new Error(`A skill with name "${name}" already exists`);
  }

  // Verify persona exists
  const persona = db.prepare('SELECT slug FROM personas WHERE slug = ?').get(persona_slug);
  if (!persona) {
    throw new Error(`Persona "${persona_slug}" does not exist`);
  }

  const id = uuidv4();
  const manifest = generateManifest({
    name,
    version: '1.0.0',
    description,
    author: author_name,
    persona: persona_slug,
    tags,
    applyTo: apply_to,
  });
  const readmeMd = generateReadme(name, description, persona_slug, tags);
  const targetFile = manifest.targetFile;

  db.prepare(`
    INSERT INTO skills (id, name, version, description, content_md, readme_md, author_name, persona_slug, tags, target_file, apply_to, manifest, status)
    VALUES (?, ?, '1.0.0', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `).run(
    id,
    name,
    description,
    content_md,
    readmeMd,
    author_name,
    persona_slug,
    JSON.stringify(tags),
    targetFile,
    apply_to,
    JSON.stringify(manifest)
  );

  return getSkill(id);
}

/**
 * Update a skill.
 */
export function updateSkill(idOrName, updates) {
  const skill = getSkill(idOrName);
  if (!skill) return null;

  const fields = [];
  const params = [];

  if (updates.description !== undefined) {
    fields.push('description = ?');
    params.push(updates.description);
  }
  if (updates.content_md !== undefined) {
    fields.push('content_md = ?');
    params.push(updates.content_md);
  }
  if (updates.persona_slug !== undefined) {
    fields.push('persona_slug = ?');
    params.push(updates.persona_slug);
  }
  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    params.push(JSON.stringify(updates.tags));
  }
  if (updates.apply_to !== undefined) {
    fields.push('apply_to = ?');
    params.push(updates.apply_to);
  }

  if (fields.length === 0) return skill;

  // Regenerate README and manifest
  const newDesc = updates.description || skill.description;
  const newPersona = updates.persona_slug || skill.persona_slug;
  const newTags = updates.tags || skill.tags;
  const newApplyTo = updates.apply_to !== undefined ? updates.apply_to : skill.apply_to;

  const manifest = generateManifest({
    name: skill.name,
    version: skill.version,
    description: newDesc,
    author: skill.author_name,
    persona: newPersona,
    tags: newTags,
    applyTo: newApplyTo,
  });
  const readmeMd = generateReadme(skill.name, newDesc, newPersona, newTags);

  fields.push('readme_md = ?', 'manifest = ?', "updated_at = datetime('now')");
  params.push(readmeMd, JSON.stringify(manifest));

  params.push(skill.id);
  db.prepare(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  return getSkill(skill.id);
}

/**
 * Delete a skill.
 */
export function deleteSkill(idOrName) {
  const skill = getSkill(idOrName);
  if (!skill) return false;

  db.prepare('DELETE FROM skills WHERE id = ?').run(skill.id);
  return true;
}

/**
 * Increment install count for a skill.
 */
export function incrementInstallCount(idOrName) {
  const skill = getSkill(idOrName);
  if (!skill) return null;

  db.prepare('UPDATE skills SET install_count = install_count + 1 WHERE id = ?').run(skill.id);
  return getSkill(skill.id);
}

/**
 * Get stats.
 */
export function getStats() {
  const skillCount = db.prepare("SELECT COUNT(*) as count FROM skills WHERE status = 'published'").get();
  const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get();
  const personaCount = db.prepare('SELECT COUNT(*) as count FROM personas WHERE parent_slug IS NULL').get();
  const totalInstalls = db.prepare('SELECT COALESCE(SUM(install_count), 0) as total FROM skills').get();

  return {
    skills: skillCount.count,
    packages: packageCount.count,
    personas: personaCount.count,
    totalInstalls: totalInstalls.total,
  };
}
