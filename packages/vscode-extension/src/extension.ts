import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { installSkillApi, getSkills, getPackages, getPersonas, publishSkillApi, Skill } from './api/registryClient';
import { SkillTreeProvider, PackageTreeProvider } from './providers/skillTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('SkillForge extension activated');

  // Create tree providers
  const skillTreeProvider = new SkillTreeProvider();
  const packageTreeProvider = new PackageTreeProvider();

  // Register tree views
  vscode.window.registerTreeDataProvider('skillforgeSkills', skillTreeProvider);
  vscode.window.registerTreeDataProvider('skillforgePackages', packageTreeProvider);

  // ============================================
  // Command: Refresh Skills
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.refreshSkills', () => {
      skillTreeProvider.refresh();
      packageTreeProvider.refresh();
      vscode.window.showInformationMessage('SkillForge: Refreshed');
    })
  );

  // ============================================
  // Command: Search Skills
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.searchSkills', async () => {
      const query = await vscode.window.showInputBox({
        placeHolder: 'Search skills...',
        prompt: 'Search by name, description, or content',
      });

      if (query !== undefined) {
        skillTreeProvider.setSearch(query);
      }
    })
  );

  // ============================================
  // Command: Install Skill
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.installSkill', async (skillOrName?: Skill | string) => {
      try {
        let skillName: string;

        if (typeof skillOrName === 'string') {
          skillName = skillOrName;
        } else if (skillOrName && typeof skillOrName === 'object' && 'name' in skillOrName) {
          skillName = skillOrName.name;
        } else {
          // Show quick-pick of all skills
          const skills = await getSkills();
          const pick = await vscode.window.showQuickPick(
            skills.map(s => ({
              label: s.name,
              description: `v${s.version} · ${s.persona_slug}`,
              detail: s.description,
              skill: s,
            })),
            { placeHolder: 'Select a skill to install' }
          );
          if (!pick) { return; }
          skillName = pick.skill.name;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('SkillForge: No workspace folder open');
          return;
        }

        const wsRoot = workspaceFolders[0].uri.fsPath;

        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Installing ${skillName}...` },
          async () => {
            const data = await installSkillApi(skillName);
            const { skill, install } = data;

            const targetPath = path.join(wsRoot, install.targetFile);
            const targetDir = path.dirname(targetPath);

            // Ensure directory exists
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            if (install.isPathSpecific) {
              fs.writeFileSync(targetPath, install.content, 'utf-8');
            } else {
              const marker = `<!-- SkillForge: ${skill.name} -->`;
              const endMarker = `<!-- /SkillForge: ${skill.name} -->`;

              if (fs.existsSync(targetPath)) {
                const existing = fs.readFileSync(targetPath, 'utf-8');
                if (existing.includes(marker)) {
                  const regex = new RegExp(
                    escapeRegex(marker) + '[\\s\\S]*?' + escapeRegex(endMarker),
                    'g'
                  );
                  const updated = existing.replace(regex, `${marker}\n${install.content}\n${endMarker}`);
                  fs.writeFileSync(targetPath, updated, 'utf-8');
                } else {
                  const appended = existing.trimEnd() + `\n\n${marker}\n${install.content}\n${endMarker}\n`;
                  fs.writeFileSync(targetPath, appended, 'utf-8');
                }
              } else {
                fs.writeFileSync(targetPath, `${marker}\n${install.content}\n${endMarker}\n`, 'utf-8');
              }
            }

            vscode.window.showInformationMessage(
              `✅ Installed "${skill.name}" → ${install.targetFile}`
            );

            // Open the file
            const doc = await vscode.workspace.openTextDocument(targetPath);
            await vscode.window.showTextDocument(doc);
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`SkillForge: Failed to install — ${message}`);
      }
    })
  );

  // ============================================
  // Command: Install Package
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.installPackage', async () => {
      try {
        const packages = await getPackages();
        const pick = await vscode.window.showQuickPick(
          packages.map(p => ({
            label: `📦 ${p.display_name}`,
            description: `${p.skillCount} skills · ${p.persona_slug}`,
            detail: p.description,
            pkg: p,
          })),
          { placeHolder: 'Select a package to install' }
        );

        if (!pick) { return; }

        for (const skill of pick.pkg.skills) {
          await vscode.commands.executeCommand('skillforge.installSkill', skill.name);
        }

        vscode.window.showInformationMessage(
          `✅ Package "${pick.pkg.display_name}" installed (${pick.pkg.skills.length} skills)`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`SkillForge: Failed to install package — ${message}`);
      }
    })
  );

  // ============================================
  // Command: Publish Skill
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.publishSkill', async () => {
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.md')) {
          vscode.window.showWarningMessage('SkillForge: Open a .md file first');
          return;
        }

        const content = editor.document.getText();
        const fileName = path.basename(editor.document.fileName, '.md');

        // Prompt for metadata
        const name = await vscode.window.showInputBox({
          value: fileName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          prompt: 'Skill name (kebab-case)',
          placeHolder: 'my-awesome-skill',
        });
        if (!name) { return; }

        const description = await vscode.window.showInputBox({
          prompt: 'Description — what does this skill instruct Copilot to do?',
          placeHolder: 'Guides Copilot to generate...',
        });
        if (!description) { return; }

        // Pick persona
        const personas = await getPersonas();
        const flatPersonas: Array<{ label: string; slug: string }> = [];
        function flatten(nodes: any[], depth: number = 0) {
          for (const p of nodes) {
            flatPersonas.push({
              label: '  '.repeat(depth) + `${p.icon} ${p.display_name}`,
              slug: p.slug,
            });
            if (p.children?.length) { flatten(p.children, depth + 1); }
          }
        }
        flatten(personas);

        const personaPick = await vscode.window.showQuickPick(
          flatPersonas.map(p => ({ label: p.label, description: p.slug, slug: p.slug })),
          { placeHolder: 'Select the persona for this skill' }
        );
        if (!personaPick) { return; }

        const tagsInput = await vscode.window.showInputBox({
          prompt: 'Tags (comma-separated, optional)',
          placeHolder: 'spring-boot, rest-api, java',
        });

        const tags = tagsInput
          ? tagsInput.split(',').map(t => t.trim()).filter(Boolean)
          : [];

        const authorName = await vscode.window.showInputBox({
          prompt: 'Your name (optional)',
          placeHolder: 'Anonymous',
        });

        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Publishing ${name}...` },
          async () => {
            const skill = await publishSkillApi({
              name,
              description,
              content_md: content,
              persona_slug: personaPick.slug,
              tags,
              author_name: authorName || 'anonymous',
            });

            vscode.window.showInformationMessage(
              `✅ Published "${skill.name}" to SkillForge registry!`,
              'View in Portal'
            ).then(action => {
              if (action === 'View in Portal') {
                const portalUrl = vscode.workspace.getConfiguration().get<string>('skillforge.portalUrl') || 'http://localhost:3000';
                vscode.env.openExternal(vscode.Uri.parse(`${portalUrl}/skills/${skill.name}`));
              }
            });

            skillTreeProvider.refresh();
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`SkillForge: Failed to publish — ${message}`);
      }
    })
  );

  // ============================================
  // Command: View Skill Detail
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.viewSkillDetail', async (skill: Skill) => {
      const panel = vscode.window.createWebviewPanel(
        'skillforgeDetail',
        `Skill: ${skill.name}`,
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = getSkillDetailHtml(skill);
    })
  );

  // ============================================
  // Command: Open Portal
  // ============================================
  context.subscriptions.push(
    vscode.commands.registerCommand('skillforge.openPortal', () => {
      const portalUrl = vscode.workspace.getConfiguration().get<string>('skillforge.portalUrl') || 'http://localhost:3000';
      vscode.env.openExternal(vscode.Uri.parse(portalUrl));
    })
  );
}

function getSkillDetailHtml(skill: Skill): string {
  const tagsHtml = skill.tags.map(t => `<span class="tag">${t}</span>`).join(' ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    h1 { font-size: 1.5em; margin-bottom: 4px; }
    .meta { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin-bottom: 16px; }
    .description { margin-bottom: 20px; line-height: 1.6; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); margin-bottom: 6px; font-weight: 600; }
    .tag { display: inline-block; padding: 2px 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; font-size: 0.8em; margin: 2px; }
    .install-cmd { font-family: var(--vscode-editor-font-family); background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 6px; font-size: 0.9em; margin-top: 8px; }
    .content { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--vscode-panel-border); }
    pre { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em; }
    code { font-family: var(--vscode-editor-font-family); }
  </style>
</head>
<body>
  <h1>${skill.name}</h1>
  <div class="meta">v${skill.version} · by ${skill.author_name} · ${skill.persona_slug} · ${skill.install_count} installs</div>
  <div class="description">${skill.description}</div>

  <div class="section">
    <div class="section-title">Install via CLI</div>
    <div class="install-cmd">skillforge install ${skill.name}</div>
  </div>

  <div class="section">
    <div class="section-title">Tags</div>
    <div>${tagsHtml || '<span style="color: var(--vscode-descriptionForeground)">No tags</span>'}</div>
  </div>

  <div class="section">
    <div class="section-title">Target File</div>
    <div class="install-cmd">${skill.target_file}</div>
  </div>

  <div class="content">
    <div class="section-title">Instruction Content</div>
    <pre><code>${escapeHtml(skill.content_md)}</code></pre>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function deactivate() {}
