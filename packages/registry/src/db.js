import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'skillforge.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      slug TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      parent_slug TEXT,
      description TEXT,
      icon TEXT,
      FOREIGN KEY (parent_slug) REFERENCES personas(slug)
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0.0',
      description TEXT NOT NULL,
      content_md TEXT NOT NULL,
      readme_md TEXT,
      author_name TEXT NOT NULL DEFAULT 'anonymous',
      persona_slug TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      target_file TEXT NOT NULL DEFAULT '.github/copilot-instructions.md',
      apply_to TEXT,
      quality_score REAL,
      status TEXT NOT NULL DEFAULT 'published',
      manifest TEXT,
      install_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (persona_slug) REFERENCES personas(slug)
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0.0',
      description TEXT NOT NULL,
      persona_slug TEXT NOT NULL,
      curator_name TEXT NOT NULL DEFAULT 'platform-team',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (persona_slug) REFERENCES personas(slug)
    );

    CREATE TABLE IF NOT EXISTS package_skills (
      package_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      version_constraint TEXT NOT NULL DEFAULT '*',
      PRIMARY KEY (package_id, skill_id),
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_skills_persona ON skills(persona_slug);
    CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
    CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
    CREATE INDEX IF NOT EXISTS idx_packages_persona ON packages(persona_slug);
  `);

  console.log('✅ Database initialized');
}

export default db;
