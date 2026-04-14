import * as vscode from 'vscode';

const API_BASE_KEY = 'skillforge.registryUrl';

interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  content_md: string;
  persona_slug: string;
  tags: string[];
  author_name: string;
  target_file: string;
  apply_to: string | null;
  install_count: number;
}

interface Package {
  id: string;
  name: string;
  display_name: string;
  description: string;
  persona_slug: string;
  curator_name: string;
  skillCount: number;
  skills: Skill[];
}

interface Persona {
  slug: string;
  display_name: string;
  icon: string;
  totalSkillCount: number;
  children: Persona[];
}

interface InstallResponse {
  skill: Skill;
  install: {
    content: string;
    targetFile: string;
    isPathSpecific: boolean;
  };
}

function getApiBase(): string {
  return vscode.workspace.getConfiguration().get<string>(API_BASE_KEY) || 'http://localhost:3001';
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `API error: ${response.status}`);
  }
  const json = await response.json() as { data: T };
  return json.data;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const json = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error || `API error: ${response.status}`);
  }
  const json = await response.json() as { data: T };
  return json.data;
}

export async function getSkills(persona?: string, search?: string): Promise<Skill[]> {
  const params = new URLSearchParams();
  if (persona) { params.set('persona', persona); }
  if (search) { params.set('search', search); }
  return apiGet<Skill[]>(`/api/skills?${params}`);
}

export async function getPersonas(): Promise<Persona[]> {
  return apiGet<Persona[]>('/api/personas');
}

export async function getPackages(): Promise<Package[]> {
  return apiGet<Package[]>('/api/packages');
}

export async function installSkillApi(skillName: string): Promise<InstallResponse> {
  return apiPost<InstallResponse>(`/api/skills/${skillName}/install`, {});
}

export async function publishSkillApi(data: {
  name: string;
  description: string;
  content_md: string;
  persona_slug: string;
  tags: string[];
  author_name: string;
  apply_to?: string | null;
}): Promise<Skill> {
  return apiPost<Skill>('/api/skills', data);
}

export type { Skill, Package, Persona, InstallResponse };
