import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * Scaffold a new skill directory with skill.yaml and instruction.md templates.
 */
export async function initSkill(name, options) {
  const dir = options.dir ? path.resolve(options.dir) : path.resolve(name || 'my-skill');

  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
    console.error(chalk.red(`\n  ❌ Directory ${dir} already exists and is not empty.\n`));
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });

  const skillName = name || path.basename(dir);

  // Create skill.yaml
  const yamlContent = `name: ${skillName}
version: 1.0.0
description: "Briefly describe what this skill instructs GitHub Copilot to do"
author: your-name
persona: general
tags:
  - your-tag
compatibleWith:
  - copilot-instructions
targetFile: .github/copilot-instructions.md
`;

  // Create instruction.md
  const mdContent = `# ${skillName} — Copilot Instructions

You are assisting a developer with [describe the domain].

## Guidelines

- [Add your coding guidelines here]
- [Add conventions and patterns]
- [Add framework-specific instructions]

## Code Style

- [Preferred patterns]
- [Naming conventions]
- [Architecture rules]

## Examples

\`\`\`
// Add code examples that demonstrate the expected patterns
\`\`\`
`;

  fs.writeFileSync(path.join(dir, 'skill.yaml'), yamlContent);
  fs.writeFileSync(path.join(dir, 'instruction.md'), mdContent);

  console.log(chalk.green(`\n  ✅ Skill scaffolded at: ${chalk.bold(dir)}\n`));
  console.log(chalk.white('  Created files:'));
  console.log(chalk.gray(`    📄 skill.yaml    — Edit metadata (name, persona, tags)`));
  console.log(chalk.gray(`    📝 instruction.md — Write your copilot instructions here`));
  console.log('');
  console.log(chalk.white('  Next steps:'));
  console.log(chalk.gray(`    1. Edit ${chalk.cyan('instruction.md')} with your copilot instructions`));
  console.log(chalk.gray(`    2. Update ${chalk.cyan('skill.yaml')} with the correct persona and tags`));
  console.log(chalk.gray(`    3. Run ${chalk.cyan(`skillforge publish ${dir}`)} to publish\n`));
}
