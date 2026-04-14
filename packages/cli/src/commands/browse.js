import chalk from 'chalk';
import Table from 'cli-table3';
import { apiGet } from '../utils/api.js';

/**
 * Browse skills by persona with an interactive display.
 */
export async function browseSkills(options) {
  const personas = await apiGet('/api/personas');

  if (options.persona) {
    // Show skills for specific persona
    const params = new URLSearchParams({ persona: options.persona });
    const skills = await apiGet(`/api/skills?${params}`);

    console.log(chalk.bold(`\n  📂 Skills for persona: ${chalk.magenta(options.persona)}\n`));

    if (skills.length === 0) {
      console.log(chalk.yellow('  No skills found for this persona.\n'));
      return;
    }

    for (const skill of skills) {
      console.log(`  ${chalk.white.bold(skill.name)} ${chalk.gray(`v${skill.version}`)}`);
      console.log(`    ${chalk.gray(skill.description)}`);
      console.log(`    Tags: ${skill.tags.map(t => chalk.dim(`#${t}`)).join(' ')}`);
      console.log('');
    }
    return;
  }

  // Show persona tree
  console.log(chalk.bold('\n  🌳 Persona Taxonomy\n'));

  function printTree(nodes, indent = '') {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isLast = i === nodes.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      const countStr = node.totalSkillCount > 0
        ? chalk.green(` (${node.totalSkillCount} skills)`)
        : chalk.gray(' (0 skills)');

      console.log(`${indent}${prefix}${node.icon}  ${chalk.white.bold(node.display_name)}${countStr}`);

      if (node.children && node.children.length > 0) {
        printTree(node.children, indent + childPrefix);
      }
    }
  }

  printTree(personas);
  console.log('');
  console.log(chalk.gray('  Tip: Use --persona <slug> to see skills for a specific persona'));
  console.log(chalk.gray('  Example: skillforge browse --persona java-spring\n'));
}
