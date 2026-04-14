import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { apiPost } from '../utils/api.js';

/**
 * Publish a skill directory to the registry.
 * Expects a directory with at least an instruction.md file.
 * If skill.yaml exists, reads metadata from it.
 * Otherwise, prompts for metadata interactively.
 */
export async function publishSkill(directory, options) {
  const dir = path.resolve(directory || '.');
  console.log(chalk.cyan(`\n  ⏳ Publishing skill from: ${chalk.bold(dir)}...\n`));

  // Look for instruction.md or any .md file
  let mdFile = null;
  let manifest = null;

  const instructionPath = path.join(dir, 'instruction.md');
  const yamlPath = path.join(dir, 'skill.yaml');

  if (fs.existsSync(instructionPath)) {
    mdFile = instructionPath;
  } else {
    // Find any .md file
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
    if (files.length > 0) {
      mdFile = path.join(dir, files[0]);
    }
  }

  if (!mdFile) {
    console.error(chalk.red('  ❌ No .md instruction file found in the directory.\n'));
    console.log(chalk.gray('  Expected: instruction.md or any .md file in the directory.\n'));
    process.exit(1);
  }

  const contentMd = fs.readFileSync(mdFile, 'utf-8');

  // Read skill.yaml if exists
  if (fs.existsSync(yamlPath)) {
    manifest = YAML.parse(fs.readFileSync(yamlPath, 'utf-8'));
  }

  // Build the payload — prefer CLI options, then manifest, then defaults
  const name = options.name || manifest?.name;
  const description = options.description || manifest?.description;
  const persona = options.persona || manifest?.persona;
  const author = options.author || manifest?.author || 'anonymous';
  const tags = options.tags
    ? options.tags.split(',').map(t => t.trim())
    : manifest?.tags || [];
  const applyTo = options.applyTo || manifest?.applyTo || null;

  if (!name || !description || !persona) {
    console.error(chalk.red('  ❌ Missing required metadata.\n'));
    console.log(chalk.yellow('  Either provide a skill.yaml with name, description, persona fields,'));
    console.log(chalk.yellow('  or pass them as CLI options: --name, --description, --persona\n'));
    console.log(chalk.gray('  Example:'));
    console.log(chalk.gray('    skillforge publish . --name my-skill --description "My skill" --persona java-spring\n'));
    process.exit(1);
  }

  try {
    const skill = await apiPost('/api/skills', {
      name,
      description,
      content_md: contentMd,
      persona_slug: persona,
      tags,
      author_name: author,
      apply_to: applyTo,
    });

    console.log(chalk.green(`  ✅ Published: ${chalk.bold(skill.name)} v${skill.version}`));
    console.log(chalk.gray(`     Persona: ${skill.persona_slug}`));
    console.log(chalk.gray(`     Tags: ${skill.tags.join(', ') || 'none'}`));
    console.log(chalk.gray(`     Target: ${skill.target_file}`));
    console.log('');
    console.log(chalk.white(`  📝 Auto-generated files:`));
    console.log(chalk.gray(`     • skill.yaml (manifest)`));
    console.log(chalk.gray(`     • README.md (documentation)\n`));
    console.log(chalk.cyan(`  🌐 View in portal: http://localhost:3000/skills/${skill.name}\n`));
  } catch (err) {
    console.error(chalk.red(`  ❌ Failed to publish: ${err.message}\n`));
    process.exit(1);
  }
}
