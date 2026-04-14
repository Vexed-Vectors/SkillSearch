"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Persona {
  slug: string;
  display_name: string;
  icon: string;
  children: Persona[];
}

const STEPS = [
  { label: "Upload", number: 1 },
  { label: "Details", number: 2 },
  { label: "Preview", number: 3 },
];

/**
 * Flatten persona tree into a flat list with indentation info.
 */
function flattenPersonas(personas: Persona[], depth = 0): Array<Persona & { depth: number }> {
  const result: Array<Persona & { depth: number }> = [];
  for (const p of personas) {
    result.push({ ...p, depth });
    if (p.children?.length) {
      result.push(...flattenPersonas(p.children, depth + 1));
    }
  }
  return result;
}

export default function PublishPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [personaSlug, setPersonaSlug] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [tags, setTags] = useState("");
  const [applyTo, setApplyTo] = useState("");

  // Load personas on mount
  useState(() => {
    fetch(`${API_URL}/api/personas`)
      .then((res) => res.json())
      .then((data) => setPersonas(data.data || []))
      .catch(() => {});
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".md")) {
      readFile(file);
    } else {
      setError("Please upload a .md file");
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  }, []);

  function readFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string);
      setError(null);
      // Auto-generate a skill name from filename
      const baseName = file.name.replace(/\.md$/, "").replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
      setSkillName(baseName);
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`${API_URL}/api/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skillName,
          description,
          content_md: fileContent,
          persona_slug: personaSlug,
          tags: tagList,
          author_name: authorName || "anonymous",
          apply_to: applyTo || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }

      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  const flatPersonas = flattenPersonas(personas);

  // Generated preview
  const generatedYaml = `name: ${skillName}
version: 1.0.0
description: "${description}"
author: ${authorName || "anonymous"}
persona: ${personaSlug}
tags:
${tags.split(",").filter(t => t.trim()).map((t) => `  - ${t.trim()}`).join("\n") || "  []"}
compatibleWith:
  - copilot-instructions
targetFile: ${applyTo ? `.github/instructions/${skillName}.instructions.md` : ".github/copilot-instructions.md"}${applyTo ? `\napplyTo: '${applyTo}'` : ""}`;

  const generatedReadme = `# ${skillName}

${description}

## Persona

**${personaSlug}**

## Tags

${tags.split(",").filter(t => t.trim()).map((t) => `\`${t.trim()}\``).join(" · ") || "_No tags_"}

## Usage

Install this skill using SkillForge:
- **VS Code Extension**: Search for "${skillName}" in the SkillForge sidebar
- **CLI**: \`skillforge install ${skillName}\`
- **Web Portal**: Browse and install from the catalog`;

  return (
    <div className="page-container" style={{ maxWidth: "800px" }}>
      <div className="page-header">
        <h1 className="page-title">
          <span className="page-title-gradient">Publish a Skill</span>
        </h1>
        <p className="page-subtitle">
          Share your copilot instructions with the team.
          Upload your <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-glass)", padding: "2px 6px", borderRadius: "4px", fontSize: "var(--text-sm)" }}>.md</code> file and we&apos;ll handle the rest.
        </p>
      </div>

      {/* Wizard Steps */}
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <div
            key={s.number}
            className={`wizard-step ${step === s.number ? "active" : ""} ${step > s.number ? "completed" : ""}`}
          >
            <div className="wizard-step-dot">
              {step > s.number ? "✓" : s.number}
            </div>
            <span className="wizard-step-label">{s.label}</span>
            {i < STEPS.length - 1 && <div className="wizard-step-connector" />}
          </div>
        ))}
      </div>

      {/* Success Toast */}
      {success && (
        <div className="toast toast-success">
          ✅ Skill published successfully! Redirecting to catalog...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "var(--space-4)",
          background: "var(--error-bg)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "var(--radius-md)",
          color: "var(--error)",
          fontSize: "var(--text-sm)",
          marginBottom: "var(--space-5)",
        }}>
          ❌ {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="wizard-content">
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
            Upload your skill file
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
            Drag and drop your <code>.md</code> instruction file, or click to browse.
            This is the file you would normally place at <code>.github/copilot-instructions.md</code>.
          </p>

          <div
            className={`drop-zone ${dragOver ? "dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div className="drop-zone-icon">📄</div>
            <div className="drop-zone-text">
              Drop your .md file here, or <strong>click to browse</strong>
            </div>
            <div className="drop-zone-hint">
              Only .md files accepted
            </div>
            {fileName && (
              <div className="drop-zone-file">
                ✅ {fileName} loaded ({fileContent.length.toLocaleString()} characters)
              </div>
            )}
          </div>

          <input
            type="file"
            id="file-input"
            accept=".md"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />

          {fileContent && (
            <div className="preview-panel" style={{ marginTop: "var(--space-6)" }}>
              <div className="preview-header">
                <span className="preview-filename">{fileName}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                  Preview
                </span>
              </div>
              <div className="preview-content">
                {fileContent.substring(0, 500)}{fileContent.length > 500 ? "\n\n... (truncated)" : ""}
              </div>
            </div>
          )}

          <div className="wizard-actions">
            <div />
            <button
              className="btn btn-primary"
              disabled={!fileContent}
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="wizard-content">
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-6)" }}>
            Describe your skill
          </h2>

          <div className="form-group">
            <label className="form-label" htmlFor="skill-name">Skill Name</label>
            <input
              className="form-input"
              type="text"
              id="skill-name"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g., spring-boot-rest-api"
            />
            <p className="form-hint">Must be kebab-case (lowercase, hyphens). This becomes the install identifier.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="skill-description">Description</label>
            <textarea
              className="form-textarea"
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill instruct GitHub Copilot to do? Be specific about the coding patterns, frameworks, and conventions it enforces."
              style={{ fontFamily: "var(--font-sans)", minHeight: "100px" }}
            />
            <p className="form-hint">This is used to generate the README.md and help others understand the skill.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="skill-persona">Persona</label>
            <select
              className="form-select"
              id="skill-persona"
              value={personaSlug}
              onChange={(e) => setPersonaSlug(e.target.value)}
            >
              <option value="">Select a persona...</option>
              {flatPersonas.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {"  ".repeat(p.depth)}{p.icon} {p.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="skill-author">Author Name</label>
            <input
              className="form-input"
              type="text"
              id="skill-author"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name or team name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="skill-tags">Tags</label>
            <input
              className="form-input"
              type="text"
              id="skill-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="spring-boot, rest-api, java (comma-separated)"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="skill-apply-to">
              Apply To Pattern <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="form-input"
              type="text"
              id="skill-apply-to"
              value={applyTo}
              onChange={(e) => setApplyTo(e.target.value)}
              placeholder="e.g., **/*.py or src/**/*.tsx"
            />
            <p className="form-hint">
              If set, this skill will be installed as a path-specific instruction file
              (at <code>.github/instructions/</code>) that only activates for matching files.
              Leave empty for workspace-wide instructions.
            </p>
          </div>

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!skillName || !description || !personaSlug}
              onClick={() => setStep(3)}
            >
              Preview →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="wizard-content">
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
            Review &amp; Publish
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
            These files will be auto-generated when you publish. Only your <code>.md</code> skill file is stored — you never need to create these yourself.
          </p>

          {/* Generated skill.yaml preview */}
          <div className="preview-panel">
            <div className="preview-header">
              <span className="preview-filename">skill.yaml</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>auto-generated</span>
            </div>
            <div className="preview-content">{generatedYaml}</div>
          </div>

          {/* Generated README.md preview */}
          <div className="preview-panel">
            <div className="preview-header">
              <span className="preview-filename">README.md</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>auto-generated</span>
            </div>
            <div className="preview-content">{generatedReadme}</div>
          </div>

          {/* Original file preview */}
          <div className="preview-panel">
            <div className="preview-header">
              <span className="preview-filename">instruction.md (your file)</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>original</span>
            </div>
            <div className="preview-content">
              {fileContent.substring(0, 800)}{fileContent.length > 800 ? "\n\n... (truncated)" : ""}
            </div>
          </div>

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              ← Back
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" /> Publishing...
                </>
              ) : (
                "🚀 Publish Skill"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
