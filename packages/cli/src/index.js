#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { searchSkills } from './commands/search.js';
import { installSkill, installPackage } from './commands/install.js';
import { publishSkill } from './commands/publish.js';
import { listInstalled } from './commands/list.js';
import { initSkill } from './commands/init.js';
import { browseSkills } from './commands/browse.js';

const program = new Command();

program
  .name('skillforge')
  .description(chalk.bold('⚡ SkillForge CLI') + chalk.gray(' — Search, install, and publish AI copilot skills'))
  .version('0.1.0');

// Search
program
  .command('search [query]')
  .description('Search for skills in the registry')
  .option('-p, --persona <persona>', 'Filter by persona (e.g., java-spring, react)')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .action(searchSkills);

// Browse
program
  .command('browse')
  .description('Browse the persona taxonomy and skills')
  .option('-p, --persona <persona>', 'Show skills for a specific persona')
  .action(browseSkills);

// Install
program
  .command('install <name>')
  .description('Install a skill into the current workspace')
  .option('-d, --dir <directory>', 'Target workspace directory (defaults to cwd)')
  .option('--package', 'Install a package (bundle of skills) instead of a single skill')
  .action(async (name, options) => {
    if (options.package) {
      await installPackage(name, options);
    } else {
      await installSkill(name, options);
    }
  });

// Publish
program
  .command('publish [directory]')
  .description('Publish a skill from a directory to the registry')
  .option('-n, --name <name>', 'Skill name (kebab-case)')
  .option('-d, --description <desc>', 'Skill description')
  .option('-p, --persona <persona>', 'Persona slug')
  .option('-a, --author <author>', 'Author name')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('--apply-to <pattern>', 'Glob pattern for path-specific instructions')
  .action(publishSkill);

// List installed
program
  .command('list')
  .description('List skills installed in the current workspace')
  .option('-d, --dir <directory>', 'Workspace directory to scan (defaults to cwd)')
  .action(listInstalled);

// Init / scaffold
program
  .command('init [name]')
  .description('Scaffold a new skill with template files')
  .option('-d, --dir <directory>', 'Target directory')
  .action(initSkill);

// Parse and run
program.parse();
