import { Router } from 'express';
import db from '../db.js';

const router = Router();

/**
 * GET /api/personas
 * Returns the full persona taxonomy as a tree.
 */
router.get('/', (req, res) => {
  try {
    const allPersonas = db.prepare('SELECT * FROM personas ORDER BY slug').all();

    // Build tree structure
    const roots = [];
    const map = {};

    for (const p of allPersonas) {
      map[p.slug] = { ...p, children: [] };
    }

    for (const p of allPersonas) {
      if (p.parent_slug && map[p.parent_slug]) {
        map[p.parent_slug].children.push(map[p.slug]);
      } else if (!p.parent_slug) {
        roots.push(map[p.slug]);
      }
    }

    // Attach skill counts to each persona
    const skillCounts = db.prepare(`
      SELECT persona_slug, COUNT(*) as count
      FROM skills
      WHERE status = 'published'
      GROUP BY persona_slug
    `).all();

    const countMap = {};
    for (const sc of skillCounts) {
      countMap[sc.persona_slug] = sc.count;
    }

    function attachCounts(node) {
      node.skillCount = countMap[node.slug] || 0;
      node.totalSkillCount = node.skillCount;
      for (const child of node.children) {
        attachCounts(child);
        node.totalSkillCount += child.totalSkillCount;
      }
    }

    for (const root of roots) {
      attachCounts(root);
    }

    res.json({ data: roots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
