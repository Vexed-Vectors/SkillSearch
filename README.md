# SkillForge

An internal platform for managing and distributing AI copilot skill files (`.md` instructions for GitHub Copilot).

---

## Quick Start (from scratch)

### Prerequisites

- **Node.js** v18 or later — [download](https://nodejs.org/)
- **npm** (comes with Node.js)
- A terminal (PowerShell, CMD, or VS Code integrated terminal)

---

### Step 1: Clone / Copy the project

Get the `SkillSearch` folder onto your machine. Open a terminal and navigate into it:

```powershell
cd C:\Users\VEDANT SINGH\Desktop\SkillSearch
```

---

### Step 2: Install all dependencies

This installs dependencies for the registry API and CLI in one go (npm workspaces):

```powershell
npm install
```

You should see output like `added XXX packages`. This step is done once.

---

### Step 3: Start the Registry API

The registry must be running before you can use the CLI, web portal, or extension. Open a **new terminal** and run:

```powershell
npm run registry
```

You should see:

```
✅ Database initialized
🌱 Seeding database...
  ✅ Seeded 19 personas
  ✅ Seeded 4 skills
  ✅ Seeded 3 packages
🎉 Seeding complete!

🚀 SkillForge Registry API running at http://localhost:3001
```

> **Keep this terminal open.** The registry must stay running while you use the CLI.

---

### Step 4: Link the CLI globally

By default, you'd have to type `node packages/cli/src/index.js` every time. To use the shorthand `skillforge` command instead, run this **once**:

```powershell
cd packages\cli
npm link
cd ..\..
```

After this, the `skillforge` command works from **any directory** on your system.

> **If `npm link` gives a permission error**, run PowerShell as Administrator and try again.

---

### Step 5: Verify it works

```powershell
skillforge --help
```

You should see:

```
Usage: skillforge [options] [command]

⚡ SkillForge CLI — Search, install, and publish AI copilot skills

Options:
  -V, --version                  output the version number
  -h, --help                     display help for command

Commands:
  search [options] [query]       Search for skills in the registry
  browse [options]               Browse the persona taxonomy and skills
  install [options] <name>       Install a skill into the current workspace
  publish [options] [directory]  Publish a skill from a directory to the registry
  list [options]                 List skills installed in the current workspace
  init [options] [name]          Scaffold a new skill with template files
  help [command]                 display help for command
```

---

## CLI Commands

### Search for skills

```powershell
# Search by keyword
skillforge search spring

# Search with persona filter
skillforge search --persona java-spring

# Search with tags
skillforge search --tags rest-api,java

# List all skills
skillforge search
```

---

### Browse persona taxonomy

```powershell
# Show the full persona tree
skillforge browse

# Show skills for a specific persona
skillforge browse --persona python-mcp
```

---

### Install a skill

Navigate to **your project folder** (the workspace where you want the skill installed), then:

```powershell
# Navigate to your project
cd C:\path\to\my-project

# Install a skill (writes to .github/copilot-instructions.md)
skillforge install spring-boot-rest-api

# Install a different skill
skillforge install react-typescript-components

# Install from a different directory (without cd)
skillforge install python-mcp-server --dir C:\path\to\my-project
```

**What happens:**
- A `.github/copilot-instructions.md` file is created (or appended to) in your project
- Each skill is wrapped in comment markers so multiple skills can coexist:
  ```markdown
  <!-- SkillForge: spring-boot-rest-api -->
  ...skill content...
  <!-- /SkillForge: spring-boot-rest-api -->
  ```
- GitHub Copilot automatically reads this file and uses it as context

---

### Install a package (bundle of skills)

```powershell
# Install all skills in a curated package
skillforge install java-spring-starter --package

# Other available packages
skillforge install python-ai-toolkit --package
skillforge install react-frontend-kit --package
```

---

### Scaffold a new skill

```powershell
# Create a new skill template
skillforge init my-awesome-skill

# This creates:
#   my-awesome-skill/
#   ├── skill.yaml        ← Edit metadata here
#   └── instruction.md    ← Write your copilot instructions here
```

---

### Publish a skill to the registry

After editing your skill's `instruction.md`:

```powershell
# Option A: Publish from a directory that has skill.yaml
skillforge publish ./my-awesome-skill

# Option B: Publish with inline metadata (no skill.yaml needed)
skillforge publish ./my-awesome-skill \
  --name my-awesome-skill \
  --description "Guides Copilot to do X" \
  --persona java-spring \
  --tags "spring,java,rest" \
  --author "your-name"
```

---

### List installed skills

```powershell
# Check what skills are installed in the current workspace
cd C:\path\to\my-project
skillforge list

# Or specify a directory
skillforge list --dir C:\path\to\my-project
```

---

## Full Example: End-to-End Workflow

```powershell
# 1. Make sure registry is running (in a separate terminal)
npm run registry

# 2. Search for what's available
skillforge search

# 3. Go to your project
cd C:\Users\VEDANT SINGH\Projects\my-spring-app

# 4. Install a skill
skillforge install spring-boot-rest-api

# 5. Verify it was installed
skillforge list

# 6. Check the generated file
cat .github\copilot-instructions.md

# 7. Open VS Code — Copilot now uses these instructions!
code .
```

---

## Troubleshooting

### `skillforge: command not found`

You haven't linked the CLI globally. Run:
```powershell
cd C:\Users\VEDANT SINGH\Desktop\SkillSearch\packages\cli
npm link
```

Or use the long form instead:
```powershell
node C:\Users\VEDANT SINGH\Desktop\SkillSearch\packages\cli\src\index.js search spring
```

### `fetch failed` or `API error`

The registry isn't running. Open a terminal and run:
```powershell
cd C:\Users\VEDANT SINGH\Desktop\SkillSearch
npm run registry
```

### `A skill with name "X" already exists`

That skill name is already in the registry. Use a different name or update the existing skill via the web portal.

---

## Optional: Web Portal

For a visual UI to browse and publish skills, start the web portal in a separate terminal:

```powershell
cd C:\Users\VEDANT SINGH\Desktop\SkillSearch\packages\web-portal
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Optional: VS Code Extension

Install the pre-built extension to get a sidebar panel in VS Code:

```powershell
code --install-extension C:\Users\VEDANT SINGH\Desktop\SkillSearch\packages\vscode-extension\skillforge-0.1.0.vsix
```

Look for the ⚡ icon in the Activity Bar. The extension requires the registry to be running.
