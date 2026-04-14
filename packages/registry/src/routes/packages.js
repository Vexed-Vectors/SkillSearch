import { Router } from 'express';
import { listPackages, getPackage, createPackage, addSkillToPackage, removeSkillFromPackage, deletePackage } from '../services/packages.js';
import { incrementInstallCount } from '../services/skills.js';
import archiver from 'archiver';

const router = Router();

/**
 * GET /api/packages
 * List packages with optional filters.
 */
router.get('/', (req, res) => {
  try {
    const { persona, search, limit = 50, offset = 0 } = req.query;
    const packages = listPackages({
      persona,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ data: packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/packages/:idOrName
 * Get a single package with all its skills.
 */
router.get('/:idOrName', (req, res) => {
  try {
    const pkg = getPackage(req.params.idOrName);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json({ data: pkg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/packages
 * Create a new package.
 */
router.post('/', (req, res) => {
  try {
    const { name, display_name, description, persona_slug, curator_name } = req.body;

    if (!name || !display_name || !description || !persona_slug) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'name, display_name, description, and persona_slug are required',
      });
    }

    const pkg = createPackage({ name, display_name, description, persona_slug, curator_name });
    res.status(201).json({ data: pkg });
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/packages/:idOrName/skills
 * Add a skill to a package.
 */
router.post('/:idOrName/skills', (req, res) => {
  try {
    const { skill_id, version_constraint } = req.body;
    if (!skill_id) {
      return res.status(400).json({ error: 'skill_id is required' });
    }

    const pkg = addSkillToPackage(req.params.idOrName, skill_id, version_constraint);
    res.json({ data: pkg });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('already in')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/packages/:idOrName/skills/:skillIdOrName
 * Remove a skill from a package.
 */
router.delete('/:idOrName/skills/:skillIdOrName', (req, res) => {
  try {
    const pkg = removeSkillFromPackage(req.params.idOrName, req.params.skillIdOrName);
    res.json({ data: pkg });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('was not in')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/packages/:idOrName/download
 * Download a package as a zip file containing all skills formatted for VS Code.
 */
router.get('/:idOrName/download', (req, res) => {
  try {
    const pkg = getPackage(req.params.idOrName);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    if (pkg.skills.length === 0) {
      return res.status(400).json({ error: 'Package has no skills' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${pkg.name}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Add each skill as a properly formatted file
    for (const skill of pkg.skills) {
      let content;
      let filePath;

      if (skill.apply_to) {
        // Path-specific instruction
        content = `---\ndescription: '${skill.description.replace(/'/g, "''")}'\napplyTo: '${skill.apply_to}'\n---\n${skill.content_md}`;
        filePath = `.github/instructions/${skill.name}.instructions.md`;
      } else {
        // Global instruction — append to copilot-instructions
        content = `\n<!-- SkillForge: ${skill.name} -->\n${skill.content_md}\n<!-- /SkillForge: ${skill.name} -->\n`;
        filePath = `.github/copilot-instructions-skills/${skill.name}.md`;
      }

      archive.append(content, { name: filePath });

      // Also increment install counts
      incrementInstallCount(skill.id);
    }

    // Add a manifest of what was installed
    const manifest = {
      package: pkg.name,
      version: pkg.version,
      installedAt: new Date().toISOString(),
      skills: pkg.skills.map(s => ({ name: s.name, version: s.version })),
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: '.skillforge/manifest.json' });

    archive.finalize();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/packages/:idOrName
 * Delete a package.
 */
router.delete('/:idOrName', (req, res) => {
  try {
    const deleted = deletePackage(req.params.idOrName);
    if (!deleted) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
