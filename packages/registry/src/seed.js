import db, { initializeDatabase } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLE_SKILLS_DIR = path.join(__dirname, '..', '..', '..', 'sample-skills');

const PERSONAS = [
  { slug: 'java-spring', display_name: 'Java / Spring Boot', parent_slug: null, description: 'Java / Spring Boot development', icon: '☕' },
  { slug: 'java-spring-micro', display_name: 'Spring Microservices', parent_slug: 'java-spring', description: 'Spring Boot Microservices patterns', icon: '🔀' },
  { slug: 'java-spring-batch', display_name: 'Spring Batch', parent_slug: 'java-spring', description: 'Spring Batch processing', icon: '📦' },
  { slug: 'react', display_name: 'React', parent_slug: null, description: 'React frontend development', icon: '⚛️' },
  { slug: 'react-typescript', display_name: 'React + TypeScript', parent_slug: 'react', description: 'React with TypeScript', icon: '📘' },
  { slug: 'react-nextjs', display_name: 'Next.js', parent_slug: 'react', description: 'Next.js development', icon: '▲' },
  { slug: 'python', display_name: 'Python', parent_slug: null, description: 'Python development', icon: '🐍' },
  { slug: 'python-agents', display_name: 'AI Agents', parent_slug: 'python', description: 'AI Agents / LangChain / CrewAI', icon: '🤖' },
  { slug: 'python-data', display_name: 'Data Science', parent_slug: 'python', description: 'Data Science / ML / Analytics', icon: '📊' },
  { slug: 'python-mcp', display_name: 'MCP Servers', parent_slug: 'python', description: 'MCP Server development', icon: '🔌' },
  { slug: 'data', display_name: 'Data Engineering', parent_slug: null, description: 'Data Engineering pipelines', icon: '📊' },
  { slug: 'data-spark', display_name: 'Apache Spark', parent_slug: 'data', description: 'Apache Spark / PySpark', icon: '⚡' },
  { slug: 'data-sql', display_name: 'SQL / Databases', parent_slug: 'data', description: 'SQL and database design', icon: '🗃️' },
  { slug: 'data-airflow', display_name: 'Airflow', parent_slug: 'data', description: 'Apache Airflow DAGs', icon: '🌊' },
  { slug: 'hogan', display_name: 'Hogan Templates', parent_slug: null, description: 'Hogan / Mustache templates', icon: '🔧' },
  { slug: 'hogan-templates', display_name: 'Hogan Templates', parent_slug: 'hogan', description: 'Hogan template patterns', icon: '📄' },
  { slug: 'hogan-partials', display_name: 'Hogan Partials', parent_slug: 'hogan', description: 'Hogan partial templates', icon: '🧩' },
  { slug: 'devops', display_name: 'DevOps', parent_slug: null, description: 'DevOps and CI/CD', icon: '🚀' },
  { slug: 'general', display_name: 'General', parent_slug: null, description: 'General purpose skills', icon: '🎯' },
];

/**
 * Generate a README.md from the skill's description.
 */
function generateReadme(name, description, persona, tags) {
  return `# ${name}

${description}

## Persona

**${persona}**

## Tags

${tags.map(t => `\`${t}\``).join(' · ')}

## Usage

Install this skill using SkillForge:
- **VS Code Extension**: Search for "${name}" in the SkillForge sidebar
- **CLI**: \`skillforge install ${name}\`
- **Web Portal**: Browse and install from the catalog
`;
}

export async function seedDatabase() {
  initializeDatabase();

  // Check if already seeded
  const personaCount = db.prepare('SELECT COUNT(*) as count FROM personas').get();
  if (personaCount.count > 0) {
    console.log('ℹ️  Database already seeded, skipping');
    return;
  }

  console.log('🌱 Seeding database...');

  // Seed personas
  const insertPersona = db.prepare(
    'INSERT INTO personas (slug, display_name, parent_slug, description, icon) VALUES (?, ?, ?, ?, ?)'
  );

  const seedPersonas = db.transaction(() => {
    for (const p of PERSONAS) {
      insertPersona.run(p.slug, p.display_name, p.parent_slug, p.description, p.icon);
    }
  });
  seedPersonas();
  console.log(`  ✅ Seeded ${PERSONAS.length} personas`);

  // Seed sample skills from sample-skills/ directory
  const insertSkill = db.prepare(`
    INSERT INTO skills (id, name, version, description, content_md, readme_md, author_name, persona_slug, tags, target_file, apply_to, manifest, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `);

  let skillCount = 0;
  const skillIds = {};

  if (fs.existsSync(SAMPLE_SKILLS_DIR)) {
    const entries = fs.readdirSync(SAMPLE_SKILLS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(SAMPLE_SKILLS_DIR, entry.name);
      const yamlPath = path.join(skillDir, 'skill.yaml');
      const mdPath = path.join(skillDir, 'instruction.md');

      if (!fs.existsSync(yamlPath) || !fs.existsSync(mdPath)) {
        console.log(`  ⚠️  Skipping ${entry.name} — missing skill.yaml or instruction.md`);
        continue;
      }

      const manifest = YAML.parse(fs.readFileSync(yamlPath, 'utf-8'));
      const contentMd = fs.readFileSync(mdPath, 'utf-8');

      const id = uuidv4();
      const tags = JSON.stringify(manifest.tags || []);
      const targetFile = manifest.targetFile || '.github/copilot-instructions.md';
      const applyTo = manifest.applyTo || null;
      const readmeMd = generateReadme(manifest.name, manifest.description, manifest.persona, manifest.tags || []);

      insertSkill.run(
        id,
        manifest.name,
        manifest.version || '1.0.0',
        manifest.description,
        contentMd,
        readmeMd,
        manifest.author || 'anonymous',
        manifest.persona,
        tags,
        targetFile,
        applyTo,
        JSON.stringify(manifest)
      );

      skillIds[manifest.name] = id;
      skillCount++;
      console.log(`  ✅ Seeded skill: ${manifest.name}`);
    }
  }

  console.log(`  ✅ Seeded ${skillCount} skills`);

  // Create sample packages
  const insertPackage = db.prepare(`
    INSERT INTO packages (id, name, display_name, version, description, persona_slug, curator_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPackageSkill = db.prepare(`
    INSERT INTO package_skills (package_id, skill_id, version_constraint)
    VALUES (?, ?, ?)
  `);

  const javaPackageId = uuidv4();
  insertPackage.run(
    javaPackageId,
    'java-spring-starter',
    'Java Spring Starter Kit',
    '1.0.0',
    'Essential skills for Java Spring Boot development — REST APIs, architecture patterns, and best practices.',
    'java-spring',
    'platform-team'
  );

  if (skillIds['spring-boot-rest-api']) {
    insertPackageSkill.run(javaPackageId, skillIds['spring-boot-rest-api'], '^1.0.0');
  }

  const pythonPackageId = uuidv4();
  insertPackage.run(
    pythonPackageId,
    'python-ai-toolkit',
    'Python AI Toolkit',
    '1.0.0',
    'Skills for building AI-powered applications — MCP servers, agents, and data processing.',
    'python',
    'ai-platform-team'
  );

  if (skillIds['python-mcp-server']) {
    insertPackageSkill.run(pythonPackageId, skillIds['python-mcp-server'], '^1.0.0');
  }

  const reactPackageId = uuidv4();
  insertPackage.run(
    reactPackageId,
    'react-frontend-kit',
    'React Frontend Kit',
    '1.0.0',
    'Complete skill set for modern React + TypeScript frontend development.',
    'react',
    'frontend-team'
  );

  if (skillIds['react-typescript-components']) {
    insertPackageSkill.run(reactPackageId, skillIds['react-typescript-components'], '^1.0.0');
  }

  console.log('  ✅ Seeded 3 packages');
  console.log('🎉 Seeding complete!');
}

// Allow running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase();
}
