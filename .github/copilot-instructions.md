# SkillForge — Project Copilot Instructions

You are assisting in the development of **SkillForge**, an internal developer tool that serves as a centralized registry and distribution system for AI copilot skill files (`.md` instruction files used by GitHub Copilot).

## Project Overview

SkillForge has four components in a monorepo:

| Component | Tech Stack | Location |
|-----------|-----------|----------|
| **Registry API** | Node.js + Express + SQLite (better-sqlite3) | `packages/registry/` |
| **VS Code Extension** | TypeScript + VS Code Extension API + Webview | `packages/vscode-extension/` |
| **Web Portal** | Next.js (App Router) | `packages/web-portal/` |
| **CLI Tool** | Node.js + Commander.js | `packages/cli/` |

## Core Concepts

- **Skill**: A `.md` file containing instructions/rules for GitHub Copilot, packaged with a `skill.yaml` manifest, optional examples, and an auto-generated `README.md`.
- **Package**: A curated collection of skills grouped by developer persona (e.g., `java-spring-fullstack`). Curated by Leads and Principal Engineers.
- **Persona**: A hierarchical taxonomy of developer roles (e.g., `java-spring` → `java-spring-microservices`). Each skill belongs to exactly one persona.
- **Skill Manifest** (`skill.yaml`): Structured metadata for a skill — name, version, description, persona, tags, target file path, author.

## Architecture Principles

1. **Registry-First**: All clients (Extension, Portal, CLI) consume the same REST API. Never duplicate business logic in clients.
2. **Local-First Demo**: The registry runs locally with SQLite. No cloud dependencies.
3. **Skill as Directory**: A skill is a directory containing `skill.yaml` + `instruction.md` + optional `examples/` + `README.md`.
4. **Packages as Bundles**: Packages reference skills by name + version constraint. They are not monolithic files.
5. **No Auth for MVP**: All endpoints are open. Auth is a post-approval feature.
6. **No LLM for MVP**: Classification and quality checks are manual. The LLM pipeline is a TODO.

## Data Model

### Skill
```
id (UUID), name (unique string), version (semver), description (text),
content_md (text — the actual instruction), author_name (string),
persona_slug (FK → personas), tags (JSON array), target_file (string),
quality_score (float, default null — future LLM feature),
status (enum: draft|published), manifest (JSON — full skill.yaml),
created_at (timestamp), updated_at (timestamp)
```

### Package
```
id (UUID), name (unique string), display_name (string), version (semver),
description (text), persona_slug (FK → personas), curator_name (string),
created_at (timestamp), updated_at (timestamp)
```

### PackageSkill (join table)
```
package_id (FK), skill_id (FK), version_constraint (string)
```

### Persona
```
slug (PK string), display_name (string), parent_slug (FK → personas, nullable),
description (text), icon (string — emoji)
```

## API Endpoints

```
GET    /api/personas                  — List persona taxonomy
GET    /api/skills                    — List/search skills (?persona=&search=&tags=)
POST   /api/skills                    — Publish a skill (multipart: skill.yaml + instruction.md + examples)
GET    /api/skills/:nameOrId          — Get skill detail
DELETE /api/skills/:nameOrId          — Remove a skill
GET    /api/packages                  — List/search packages
POST   /api/packages                  — Create a package
GET    /api/packages/:nameOrId        — Get package detail with resolved skills
POST   /api/packages/:nameOrId/skills — Add skill to package
DELETE /api/packages/:nameOrId/skills/:skillId — Remove skill from package
GET    /api/packages/:nameOrId/download — Download package as zip
GET    /api/stats                     — Basic stats (skill count, package count, etc.)
```

## File Conventions

- Use TypeScript for all components except where impractical.
- Use ES modules (`"type": "module"` in package.json).
- Use `prettier` formatting defaults (no config file needed for demo).
- Prefer `async/await` over callbacks.
- Use named exports, not default exports.
- Error responses follow: `{ error: string, details?: string }`.
- Success responses follow: `{ data: T }` or `{ data: T[] }` for lists.

## Coding Guidelines

- **Registry**: Keep route handlers thin. Business logic goes in service modules (`services/skills.js`, `services/packages.js`).
- **Extension**: Use VS Code TreeDataProvider for the sidebar. Use Webview for rich UIs (publish form, skill preview).
- **Portal**: Use Server Components where possible. Client Components only for interactivity.
- **CLI**: Use `commander` for command parsing. Output should be human-friendly with color (use `chalk`).

## Persona Taxonomy (Seed Data)

```
java-spring          ☕  Java / Spring Boot development
  java-spring-micro  🔀  Spring Boot Microservices
  java-spring-batch  📦  Spring Batch processing
react                ⚛️   React frontend development
  react-typescript   📘  React with TypeScript
  react-nextjs       ▲   Next.js development
python               🐍  Python development
  python-agents      🤖  AI Agents / LangChain / CrewAI
  python-data        📊  Data Science / ML
  python-mcp         🔌  MCP Server development
data                 📊  Data Engineering
  data-spark         ⚡  Apache Spark
  data-sql           🗃️  SQL / Database design
hogan                🔧  Hogan templates
```

## Current Limitations (Demo Scope)

- No authentication or authorization
- No LLM-driven classification (manual persona selection)
- No LLM quality/sanity checks (future feature)
- No versioning of skills (v1 only, updates overwrite)
- No conflict detection between skills
- SQLite only (no production database)
- Local filesystem storage only
