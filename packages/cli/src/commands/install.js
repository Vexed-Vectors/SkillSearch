import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { apiPost, apiGet } from '../utils/api.js';

/**
 * Install a single skill into the current workspace.
 */
export async function installSkill(skillName, options) {
  console.log(chalk.cyan(`\n  ⏳ Installing skill: ${chalk.bold(skillName)}...\n`));

  try {
    const installData = await apiPost(`/api/skills/${skillName}/install`, {});
    const { skill, install } = installData;

    const targetDir = options.dir || process.cwd();
    const targetPath = path.join(targetDir, install.targetFile);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    if (install.isPathSpecific) {
      // Path-specific: always write a new file
      fs.writeFileSync(targetPath, install.content, 'utf-8');
      console.log(chalk.green(`  ✅ Installed ${chalk.bold(skill.name)} as path-specific instruction`));
    } else {
      // Global: append to copilot-instructions.md or create new
      const marker = `<!-- SkillForge: ${skill.name} -->`;
      const endMarker = `<!-- /SkillForge: ${skill.name} -->`;

      if (fs.existsSync(targetPath)) {
        const existing = fs.readFileSync(targetPath, 'utf-8');

        if (existing.includes(marker)) {
          // Replace existing section
          const regex = new RegExp(`${escapeRegex(marker)}[\\s\\S]*?${escapeRegex(endMarker)}`, 'g');
          const updated = existing.replace(regex, `${marker}\n${install.content}\n${endMarker}`);
          fs.writeFileSync(targetPath, updated, 'utf-8');
          console.log(chalk.green(`  ✅ Updated ${chalk.bold(skill.name)} in ${install.targetFile}`));
        } else {
          // Append
          const appended = existing.trimEnd() + `\n\n${marker}\n${install.content}\n${endMarker}\n`;
          fs.writeFileSync(targetPath, appended, 'utf-8');
          console.log(chalk.green(`  ✅ Appended ${chalk.bold(skill.name)} to ${install.targetFile}`));
        }
      } else {
        // Create new
        const content = `${marker}\n${install.content}\n${endMarker}\n`;
        fs.writeFileSync(targetPath, content, 'utf-8');
        console.log(chalk.green(`  ✅ Created ${install.targetFile} with ${chalk.bold(skill.name)}`));
      }
    }

    console.log(chalk.gray(`     Target: ${targetPath}`));
    console.log(chalk.gray(`     Persona: ${skill.persona_slug}`));
    console.log(chalk.gray(`     Version: v${skill.version}\n`));
  } catch (err) {
    console.error(chalk.red(`  ❌ Failed to install: ${err.message}\n`));
    process.exit(1);
  }
}

/**
 * Install all skills from a package.
 */
export async function installPackage(packageName, options) {
  console.log(chalk.cyan(`\n  ⏳ Installing package: ${chalk.bold(packageName)}...\n`));

  try {
    const pkg = await apiGet(`/api/packages/${packageName}`);

    if (!pkg.skills || pkg.skills.length === 0) {
      console.log(chalk.yellow('  ⚠️  Package has no skills.\n'));
      return;
    }

    console.log(chalk.white(`  📦 ${chalk.bold(pkg.display_name)} (${pkg.skills.length} skills)\n`));

    for (const skill of pkg.skills) {
      await installSkill(skill.name, options);
    }

    console.log(chalk.green(`  🎉 Package ${chalk.bold(packageName)} installed successfully!\n`));
  } catch (err) {
    console.error(chalk.red(`  ❌ Failed to install package: ${err.message}\n`));
    process.exit(1);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
