import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  content_md: string;
  readme_md: string;
  persona_slug: string;
  tags: string[];
  author_name: string;
  target_file: string;
  apply_to: string | null;
  install_count: number;
  created_at: string;
  updated_at: string;
  manifest: Record<string, unknown>;
}

async function getSkill(id: string): Promise<Skill | null> {
  try {
    const res = await fetch(`${API_URL}/api/skills/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

/**
 * Very basic markdown-to-HTML for the demo.
 * Handles headings, code blocks, inline code, bold, lists, paragraphs.
 */
function renderMarkdownBasic(md: string): string {
  let html = md;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
  });

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Paragraphs — lines that aren't already wrapped
  const lines = html.split("\n");
  const result: string[] = [];
  let inPre = false;
  for (const line of lines) {
    if (line.includes("<pre>")) inPre = true;
    if (line.includes("</pre>")) { inPre = false; result.push(line); continue; }
    if (inPre) { result.push(line); continue; }

    if (
      line.trim() &&
      !line.trim().startsWith("<h") &&
      !line.trim().startsWith("<ul") &&
      !line.trim().startsWith("<ol") &&
      !line.trim().startsWith("<li") &&
      !line.trim().startsWith("</") &&
      !line.trim().startsWith("<pre") &&
      !line.trim().startsWith("<p")
    ) {
      result.push(`<p>${line}</p>`);
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const skill = await getSkill(resolvedParams.id);

  if (!skill) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <h2 className="empty-state-title">Skill not found</h2>
          <p className="empty-state-text">
            The skill you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
            ← Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  const renderedContent = renderMarkdownBasic(skill.content_md);

  return (
    <div className="page-container">
      <Link href="/" className="back-link">
        ← Back to catalog
      </Link>

      <div className="skill-detail">
        {/* Main Content */}
        <div className="skill-detail-main">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.5rem" }}>
                {skill.name}
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-base)" }}>
                {skill.description}
              </p>
            </div>
            <span className="skill-card-version" style={{ fontSize: "var(--text-sm)" }}>
              v{skill.version}
            </span>
          </div>

          <div
            className="md-preview"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>

        {/* Sidebar */}
        <div className="skill-detail-sidebar">
          {/* Install Card */}
          <div className="sidebar-card">
            <div className="sidebar-card-title">Install</div>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                CLI
              </div>
              <div style={{
                background: "var(--bg-primary)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                color: "var(--accent-tertiary)",
                border: "1px solid var(--border-subtle)",
                wordBreak: "break-all"
              }}>
                skillforge install {skill.name}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                Target file
              </div>
              <div style={{
                background: "var(--bg-primary)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                wordBreak: "break-all"
              }}>
                {skill.target_file}
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="sidebar-card">
            <div className="sidebar-card-title">Details</div>
            <div className="sidebar-card-item">
              <span className="sidebar-card-item-label">Persona</span>
              <span className={`persona-badge ${skill.persona_slug}`}>
                {skill.persona_slug}
              </span>
            </div>
            <div className="sidebar-card-item">
              <span className="sidebar-card-item-label">Author</span>
              <span className="sidebar-card-item-value">{skill.author_name}</span>
            </div>
            <div className="sidebar-card-item">
              <span className="sidebar-card-item-label">Installs</span>
              <span className="sidebar-card-item-value">{skill.install_count}</span>
            </div>
            <div className="sidebar-card-item">
              <span className="sidebar-card-item-label">Published</span>
              <span className="sidebar-card-item-value">
                {new Date(skill.created_at).toLocaleDateString()}
              </span>
            </div>
            {skill.apply_to && (
              <div className="sidebar-card-item">
                <span className="sidebar-card-item-label">Applies to</span>
                <span className="sidebar-card-item-value" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                  {skill.apply_to}
                </span>
              </div>
            )}
          </div>

          {/* Tags Card */}
          <div className="sidebar-card">
            <div className="sidebar-card-title">Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              {skill.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
