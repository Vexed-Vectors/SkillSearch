import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * List packages with optional filters.
 */
export function listPackages({ persona, search, limit = 50, offset = 0 }) {
  let query = 'SELECT * FROM packages WHERE 1=1';
  const params = [];

  if (persona) {
    query += ' AND (persona_slug = ? OR persona_slug LIKE ?)';
    params.push(persona, `${persona}-%`);
  }

  if (search) {
    query += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const packages = db.prepare(query).all(...params);

  // Attach skill count and skill list to each package
  return packages.map(pkg => {
    const skills = getPackageSkills(pkg.id);
    return {
      ...pkg,
      skillCount: skills.length,
      skills,
    };
  });
}

/**
 * Get a single package by ID or name.
 */
export function getPackage(idOrName) {
  const pkg = db.prepare(
    'SELECT * FROM packages WHERE id = ? OR name = ?'
  ).get(idOrName, idOrName);

  if (!pkg) return null;

  const skills = getPackageSkills(pkg.id);
  return {
    ...pkg,
    skillCount: skills.length,
    skills,
  };
}

/**
 * Get all skills in a package.
 */
function getPackageSkills(packageId) {
  return db.prepare(`
    SELECT s.*, ps.version_constraint
    FROM package_skills ps
    JOIN skills s ON s.id = ps.skill_id
    WHERE ps.package_id = ?
    ORDER BY s.name
  `).all(packageId).map(s => ({
    ...s,
    tags: JSON.parse(s.tags),
    manifest: s.manifest ? JSON.parse(s.manifest) : null,
  }));
}

/**
 * Create a new package.
 */
export function createPackage({ name, display_name, description, persona_slug, curator_name = 'platform-team' }) {
  const existing = db.prepare('SELECT id FROM packages WHERE name = ?').get(name);
  if (existing) {
    throw new Error(`A package with name "${name}" already exists`);
  }

  const persona = db.prepare('SELECT slug FROM personas WHERE slug = ?').get(persona_slug);
  if (!persona) {
    throw new Error(`Persona "${persona_slug}" does not exist`);
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO packages (id, name, display_name, version, description, persona_slug, curator_name)
    VALUES (?, ?, ?, '1.0.0', ?, ?, ?)
  `).run(id, name, display_name, description, persona_slug, curator_name);

  return getPackage(id);
}

/**
 * Add a skill to a package.
 */
export function addSkillToPackage(packageIdOrName, skillIdOrName, versionConstraint = '*') {
  const pkg = getPackage(packageIdOrName);
  if (!pkg) throw new Error('Package not found');

  const skill = db.prepare('SELECT * FROM skills WHERE id = ? OR name = ?').get(skillIdOrName, skillIdOrName);
  if (!skill) throw new Error('Skill not found');

  // Check if already added
  const existing = db.prepare(
    'SELECT * FROM package_skills WHERE package_id = ? AND skill_id = ?'
  ).get(pkg.id, skill.id);

  if (existing) throw new Error('Skill is already in this package');

  db.prepare(
    'INSERT INTO package_skills (package_id, skill_id, version_constraint) VALUES (?, ?, ?)'
  ).run(pkg.id, skill.id, versionConstraint);

  return getPackage(pkg.id);
}

/**
 * Remove a skill from a package.
 */
export function removeSkillFromPackage(packageIdOrName, skillIdOrName) {
  const pkg = getPackage(packageIdOrName);
  if (!pkg) throw new Error('Package not found');

  const skill = db.prepare('SELECT * FROM skills WHERE id = ? OR name = ?').get(skillIdOrName, skillIdOrName);
  if (!skill) throw new Error('Skill not found');

  const result = db.prepare(
    'DELETE FROM package_skills WHERE package_id = ? AND skill_id = ?'
  ).run(pkg.id, skill.id);

  if (result.changes === 0) throw new Error('Skill was not in this package');

  return getPackage(pkg.id);
}

/**
 * Delete a package.
 */
export function deletePackage(idOrName) {
  const pkg = getPackage(idOrName);
  if (!pkg) return false;

  db.prepare('DELETE FROM packages WHERE id = ?').run(pkg.id);
  return true;
}
