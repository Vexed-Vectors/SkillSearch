import * as vscode from 'vscode';
import { getPersonas, getSkills, Persona, Skill } from '../api/registryClient';

type TreeNode = PersonaNode | SkillNode;

class PersonaNode extends vscode.TreeItem {
  constructor(
    public readonly persona: Persona,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`${persona.icon}  ${persona.display_name}`, collapsibleState);
    this.tooltip = persona.description;
    this.description = `${persona.totalSkillCount} skills`;
    this.contextValue = 'persona';
  }
}

class SkillNode extends vscode.TreeItem {
  constructor(public readonly skill: Skill) {
    super(skill.name, vscode.TreeItemCollapsibleState.None);
    this.tooltip = skill.description;
    this.description = `v${skill.version}`;
    this.contextValue = 'skill';
    this.iconPath = new vscode.ThemeIcon('file');
    this.command = {
      command: 'skillforge.viewSkillDetail',
      title: 'View Skill Details',
      arguments: [skill],
    };
  }
}

export class SkillTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private searchQuery: string = '';
  private personas: Persona[] = [];
  private skillsByPersona: Map<string, Skill[]> = new Map();

  refresh(): void {
    this.skillsByPersona.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  setSearch(query: string): void {
    this.searchQuery = query;
    this.refresh();
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    try {
      if (!element) {
        // Root level: show personas (or search results)
        if (this.searchQuery) {
          const skills = await getSkills(undefined, this.searchQuery);
          return skills.map(s => new SkillNode(s));
        }

        this.personas = await getPersonas();
        return this.personas
          .filter(p => p.totalSkillCount > 0 || p.children.some(c => c.totalSkillCount > 0))
          .map(p => new PersonaNode(
            p,
            p.totalSkillCount > 0 || p.children.length > 0
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None
          ));
      }

      if (element instanceof PersonaNode) {
        const persona = element.persona;
        const results: TreeNode[] = [];

        // Add child personas
        if (persona.children?.length > 0) {
          for (const child of persona.children) {
            if (child.totalSkillCount > 0) {
              results.push(new PersonaNode(
                child,
                vscode.TreeItemCollapsibleState.Collapsed
              ));
            }
          }
        }

        // Add direct skills
        if (!this.skillsByPersona.has(persona.slug)) {
          const skills = await getSkills(persona.slug);
          // Filter to only direct children (not sub-persona skills)
          const directSkills = skills.filter(s => s.persona_slug === persona.slug);
          this.skillsByPersona.set(persona.slug, directSkills);
        }

        const skills = this.skillsByPersona.get(persona.slug) || [];
        for (const skill of skills) {
          results.push(new SkillNode(skill));
        }

        return results;
      }

      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      vscode.window.showWarningMessage(`SkillForge: Could not load skills — ${message}. Is the registry running?`);
      return [];
    }
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }
}

export class PackageTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    try {
      if (!element) {
        const { getPackages } = await import('../api/registryClient');
        const packages = await getPackages();
        return packages.map(pkg => {
          const item = new vscode.TreeItem(
            `📦 ${pkg.display_name}`,
            pkg.skills.length > 0
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None
          );
          item.tooltip = pkg.description;
          item.description = `${pkg.skillCount} skills`;
          item.contextValue = 'package';
          (item as any).packageData = pkg;
          return item;
        });
      }

      // Package children — show skills
      const pkg = (element as any).packageData;
      if (pkg?.skills) {
        return pkg.skills.map((skill: Skill) => {
          const item = new vscode.TreeItem(skill.name, vscode.TreeItemCollapsibleState.None);
          item.description = `v${skill.version}`;
          item.iconPath = new vscode.ThemeIcon('file');
          item.tooltip = skill.description;
          return item;
        });
      }

      return [];
    } catch (err) {
      return [];
    }
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }
}
