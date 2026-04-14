import chalk from 'chalk';
import Table from 'cli-table3';
import { apiGet } from '../utils/api.js';

export async function searchSkills(query, options) {
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (options.persona) params.set('persona', options.persona);
  if (options.tags) params.set('tags', options.tags);

  const skills = await apiGet(`/api/skills?${params}`);

  if (skills.length === 0) {
    console.log(chalk.yellow('\n  No skills found matching your query.\n'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('Name'),
      chalk.cyan('Persona'),
      chalk.cyan('Description'),
      chalk.cyan('Author'),
      chalk.cyan('Installs'),
    ],
    colWidths: [30, 18, 45, 15, 10],
    style: { head: [], border: ['dim'] },
    wordWrap: true,
  });

  for (const skill of skills) {
    table.push([
      chalk.white.bold(skill.name),
      chalk.magenta(skill.persona_slug),
      chalk.gray(skill.description.substring(0, 80) + (skill.description.length > 80 ? '...' : '')),
      chalk.gray(skill.author_name),
      chalk.green(skill.install_count.toString()),
    ]);
  }

  console.log('');
  console.log(chalk.bold(`  Found ${chalk.green(skills.length)} skill(s):`));
  console.log(table.toString());
  console.log('');
}
