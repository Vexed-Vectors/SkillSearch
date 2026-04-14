import { Router } from 'express';
import { listSkills, getSkill, createSkill, updateSkill, deleteSkill, incrementInstallCount, getStats } from '../services/skills.js';

const router = Router();

/**
 * GET /api/skills
 * List/search skills with optional filters.
 * Query params: persona, search, tags, limit, offset
 */
router.get('/', (req, res) => {
  try {
    const { persona, search, tags, limit = 50, offset = 0 } = req.query;
    const skills = listSkills({
      persona,
      search,
      tags,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ data: skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/skills/:idOrName
 * Get a single skill by ID or name.
 */
router.get('/:idOrName', (req, res) => {
  try {
    const skill = getSkill(req.params.idOrName);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json({ data: skill });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/skills
 * Publish a new skill.
 * 
 * User provides (JSON body):
 *   - name: string (required)
 *   - description: string (required)
 *   - content_md: string (required) — the actual .md skill content
 *   - persona_slug: string (required) — manually selected persona
 *   - tags: string[] (optional)
 *   - author_name: string (optional)
 *   - apply_to: string (optional) — glob pattern for path-specific instructions (e.g., "** /*.py")
 * 
 * We auto-generate: skill.yaml, README.md
 */
router.post('/', (req, res) => {
  try {
    const { name, description, content_md, persona_slug, tags, author_name, apply_to } = req.body;

    if (!name || !description || !content_md || !persona_slug) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'name, description, content_md, and persona_slug are required',
      });
    }

    // Validate name format (kebab-case)
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && name.length > 1) {
      return res.status(400).json({
        error: 'Invalid skill name',
        details: 'Name must be kebab-case (lowercase letters, numbers, hyphens). Example: "my-cool-skill"',
      });
    }

    const skill = createSkill({
      name,
      description,
      content_md,
      persona_slug,
      tags: tags || [],
      author_name: author_name || 'anonymous',
      apply_to: apply_to || null,
    });

    res.status(201).json({ data: skill });
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.includes('does not exist')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/skills/:idOrName
 * Update a skill.
 */
router.patch('/:idOrName', (req, res) => {
  try {
    const skill = updateSkill(req.params.idOrName, req.body);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json({ data: skill });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/skills/:idOrName
 * Delete a skill.
 */
router.delete('/:idOrName', (req, res) => {
  try {
    const deleted = deleteSkill(req.params.idOrName);
    if (!deleted) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/skills/:idOrName/install
 * Record an install and return the skill content formatted for VS Code.
 * Returns the .md content ready to be written to the workspace.
 */
router.post('/:idOrName/install', (req, res) => {
  try {
    const skill = incrementInstallCount(req.params.idOrName);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Format for VS Code installation
    let installContent;
    if (skill.apply_to) {
      // Path-specific instruction file with YAML frontmatter
      installContent = `---\ndescription: '${skill.description.replace(/'/g, "''")}'\napplyTo: '${skill.apply_to}'\n---\n${skill.content_md}`;
    } else {
      // Global copilot instructions
      installContent = skill.content_md;
    }

    res.json({
      data: {
        skill,
        install: {
          content: installContent,
          targetFile: skill.apply_to
            ? `.github/instructions/${skill.name}.instructions.md`
            : '.github/copilot-instructions.md',
          isPathSpecific: !!skill.apply_to,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats
 * Basic statistics.
 */
router.get('/../stats', (req, res) => {
  // This won't work under /api/skills, will be mounted separately
});

export default router;
