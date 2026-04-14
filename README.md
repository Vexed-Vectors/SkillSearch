# SkillForge

An internal platform for managing and distributing AI copilot skill files (`.md` instructions for GitHub Copilot). Search, install, and publish skills from a centralized registry — via CLI, web portal, or VS Code extension.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Full Setup (from clone)](#full-setup-from-clone)
- [Running Each Component](#running-each-component)
- [CLI Usage](#cli-usage)
- [Building the VS Code Extension](#building-the-vs-code-extension)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | v18 or later | `node --version` |
| **npm** | v9 or later (comes with Node.js) | `npm --version` |
| **Git** | Any recent version | `git --version` |
| **VS Code** | v1.85+ (only for extension) | `code --version` |

---

## Full Setup (from clone)

### 1. Clone the repository

```powershell
git clone https://github.com/Vexed-Vectors/SkillSearch.git
cd SkillSearch
```

### 2. Install everything

This single command installs all dependencies and builds the VS Code extension:

```powershell
npm run setup
```

> This runs `npm install` for the root workspace (registry + CLI), the web portal, and the VS Code extension, then compiles the extension.

### 3. Build the VS Code extension `.vsix` (for installing in VS Code)

```powershell
npm run build:extension
```

This creates `packages/vscode-extension/skillforge-0.1.0.vsix`. Install it:

```powershell
code --install-extension packages/vscode-extension/skillforge-0.1.0.vsix
```

### 4. (Optional) Link the CLI globally

To use `skillforge` as a command from any directory:

```powershell
cd packages\cli
npm link
cd ..\..
```

After this, `skillforge search spring` works from anywhere. Without this step, use:

```powershell
node packages/cli/src/index.js search spring
```

---

## Running Each Component

> **The Registry API must be running first.** All other components depend on it.

### Registry API (required)

Open a terminal and run from the project root:

```powershell
npm run registry
```

Output:

```
🚀 SkillForge Registry API running at http://localhost:3001
   📚 Skills:   http://localhost:3001/api/skills
   📦 Packages: http://localhost:3001/api/packages
   👤 Personas: http://localhost:3001/api/personas
```

On first run, it automatically seeds the database with sample personas, skills, and packages.

### Web Portal

Open a **second terminal**:

```powershell
cd packages/web-portal
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### CLI

With `npm link` done (Step 6 above):

```powershell
skillforge --help
```

Without `npm link`:

```powershell
node packages/cli/src/index.js --help
```

### VS Code Extension

See [Building the VS Code Extension](#building-the-vs-code-extension) below.

---

## CLI Usage

### Search for skills

```powershell
skillforge search                          # List all skills
skillforge search spring                   # Search by keyword
skillforge search --persona java-spring    # Filter by persona
skillforge search --tags rest-api,java     # Filter by tags
```

### Browse persona taxonomy

```powershell
skillforge browse                          # Show full persona tree
skillforge browse --persona python-mcp     # Show skills for a persona
```

### Install a skill into your project

Navigate to your project folder first:

```powershell
cd C:\path\to\my-project
skillforge install spring-boot-rest-api
```

Or specify the target directory:

```powershell
skillforge install spring-boot-rest-api --dir C:\path\to\my-project
```

This creates/appends to `.github/copilot-instructions.md` in your project. GitHub Copilot reads this file automatically.

### Install a package (bundle of skills)

```powershell
skillforge install java-spring-starter --package
skillforge install python-ai-toolkit --package
skillforge install react-frontend-kit --package
```

### List installed skills

```powershell
cd C:\path\to\my-project
skillforge list
```

### Scaffold a new skill

```powershell
skillforge init my-awesome-skill
```

Creates a template directory:

```
my-awesome-skill/
├── skill.yaml        ← Edit metadata here
└── instruction.md    ← Write your copilot instructions here
```

### Publish a skill to the registry

```powershell
# From a directory with skill.yaml + instruction.md
skillforge publish ./my-awesome-skill

# Or provide metadata inline
skillforge publish ./my-awesome-skill --name my-skill --description "Does X" --persona java-spring --tags "spring,java" --author "your-name"
```

### Full end-to-end workflow

```powershell
# Terminal 1: Start registry
npm run registry

# Terminal 2: Use the CLI
skillforge search                                    # See what's available
skillforge install spring-boot-rest-api              # Install to current dir
skillforge list                                      # Verify installation
cat .github\copilot-instructions.md                  # View the generated file
code .                                               # Open VS Code — Copilot now uses these!
```

---

## Building the VS Code Extension

### Build from source

```powershell
cd packages/vscode-extension

# 1. Install dev dependencies
npm install

# 2. Compile TypeScript → JavaScript bundle
npm run compile
```

The compiled extension is at `dist/extension.js`.

### Package as .vsix

To create an installable `.vsix` file:

```powershell
cd packages/vscode-extension
npx @vscode/vsce package --no-dependencies --allow-missing-repository --skip-license
```

This produces `skillforge-0.1.0.vsix` in the same directory.

### Install the extension in VS Code

```powershell
code --install-extension packages/vscode-extension/skillforge-0.1.0.vsix
```

Or in VS Code: **Extensions panel → ⋯ menu → Install from VSIX...** → select the `.vsix` file.

### Using the extension

1. Look for the **⚡ SkillForge** icon in the Activity Bar (left sidebar)
2. The **Skills** panel shows a tree: Persona → Skills
3. The **Packages** panel shows curated bundles
4. Right-click a skill → **Install** to add it to your workspace
5. Right-click any `.md` file in the editor → **Publish to SkillForge**
6. Use the Command Palette (`Ctrl+Shift+P`) and type `SkillForge` to see all commands

> **Note:** The registry must be running (`npm run registry`) for the extension to work.

### Watch mode (for development)

If you're modifying the extension source code:

```powershell
cd packages/vscode-extension
npm run watch
```

This auto-rebuilds on file changes. Press `F5` in VS Code to launch a debug Extension Host.

---

## Project Structure

```
SkillSearch/
├── package.json                           # Monorepo root (npm workspaces)
├── README.md                              # This file
├── IMPLEMENTATION_PLAN.md                 # Architecture documentation
├── .github/
│   └── copilot-instructions.md            # Copilot instructions for this project
├── sample-skills/                         # Pre-built sample skills (seed data)
│   ├── spring-boot-rest-api/
│   ├── react-typescript-components/
│   ├── python-mcp-server/
│   └── skillforge-development/
└── packages/
    ├── registry/                          # REST API (Express + SQLite)
    │   └── src/
    │       ├── index.js                   # Server entry point
    │       ├── db.js                      # SQLite schema
    │       ├── seed.js                    # Seeds sample data
    │       ├── routes/                    # HTTP route handlers
    │       └── services/                  # Business logic
    ├── web-portal/                        # Web UI (Next.js)
    │   └── src/app/
    │       ├── page.tsx                   # Skills catalog
    │       ├── skills/[id]/page.tsx       # Skill detail
    │       ├── packages/page.tsx          # Packages catalog
    │       └── publish/page.tsx           # Publish wizard
    ├── cli/                               # CLI tool (Commander.js)
    │   └── src/
    │       ├── index.js                   # Entry point
    │       └── commands/                  # search, install, publish, etc.
    └── vscode-extension/                  # VS Code extension (TypeScript)
        ├── src/
        │   ├── extension.ts               # Main activation
        │   ├── providers/                 # Sidebar tree views
        │   └── api/                       # Registry API client
        └── dist/                          # Compiled output (after build)
```

---

## API Reference

The Registry API runs on `http://localhost:3001`. Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/skills` | List/search skills (`?search=`, `?persona=`, `?tags=`) |
| `GET` | `/api/skills/:name` | Get skill details |
| `POST` | `/api/skills` | Publish a new skill |
| `POST` | `/api/skills/:name/install` | Record install + get formatted content |
| `GET` | `/api/packages` | List packages |
| `GET` | `/api/packages/:name` | Get package with skills |
| `GET` | `/api/packages/:name/download` | Download package as zip |
| `GET` | `/api/personas` | Get persona taxonomy tree |
| `GET` | `/api/stats` | Registry statistics |
| `GET` | `/api/health` | Health check |

---

## Troubleshooting

### `skillforge: command not found`

The CLI isn't globally linked. Either:

```powershell
# Option A: Link it globally (one-time)
cd packages/cli
npm link

# Option B: Use the full path
node packages/cli/src/index.js <command>
```

### `fetch failed` / `ECONNREFUSED`

The registry isn't running. Start it:

```powershell
npm run registry
```

### `Cannot find module 'better-sqlite3'`

Dependencies aren't installed. Run from the project root:

```powershell
npm install
```

### VS Code extension doesn't show in sidebar

1. Make sure the `.vsix` is installed: `code --install-extension packages/vscode-extension/skillforge-0.1.0.vsix`
2. Reload VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`
3. Check the registry is running on `localhost:3001`

### Extension build fails with TypeScript errors

Make sure dev dependencies are installed:

```powershell
cd packages/vscode-extension
npm install
npm run compile
```

### Web portal shows "skills: 0"

The registry isn't running or hasn't been seeded. Start the registry first — it auto-seeds on the first run.

---

## Contributing

### Adding a new skill

1. `skillforge init my-skill`
2. Edit `instruction.md` with your copilot instructions
3. Update `skill.yaml` with the correct persona and tags
4. `skillforge publish ./my-skill`

### Adding a new persona

Edit `packages/registry/src/seed.js` and add to the `PERSONAS` array. Delete `packages/registry/data/skillforge.db` and restart the registry to re-seed.

---

## License

Internal use only.
