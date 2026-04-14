import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * List installed skills in the current workspace.
 * Scans .github/copilot-instructions.md for SkillForge markers
 * and .github/instructions/ for .instructions.md files.
 */
export async function listInstalled(options) {
  const dir = options.dir || process.cwd();
  const results = [];

  // Check global instructions file
  const globalFile = path.join(dir, '.github', 'copilot-instructions.md');
  if (fs.existsSync(globalFile)) {
    const content = fs.readFileSync(globalFile, 'utf-8');
    const regex = /<!-- SkillForge: (.+?) -->/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      results.push({
        name: match[1],
        type: 'global',
        file: '.github/copilot-instructions.md',
      });
    }
  }

  // Check instructions directory
  const instructionsDir = path.join(dir, '.github', 'instructions');
  if (fs.existsSync(instructionsDir)) {
    const files = fs.readdirSync(instructionsDir).filter(f => f.endsWith('.instructions.md'));
    for (const file of files) {
      const name = file.replace('.instructions.md', '');
      results.push({
        name,
        type: 'path-specific',
        file: `.github/instructions/${file}`,
      });
    }
  }

  if (results.length === 0) {
    console.log(chalk.yellow('\n  No SkillForge skills installed in this workspace.\n'));
    console.log(chalk.gray('  Install one with: skillforge install <skill-name>\n'));
    return;
  }

  console.log(chalk.bold(`\n  📋 Installed skills (${results.length}):\n`));

  for (const skill of results) {
    const typeLabel = skill.type === 'global'
      ? chalk.blue('global')
      : chalk.yellow('path-specific');

    console.log(`  ${chalk.white.bold(skill.name)}`);
    console.log(`    Type: ${typeLabel}`);
    console.log(`    File: ${chalk.gray(skill.file)}`);
    console.log('');
  }
}
