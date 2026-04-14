const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  persona_slug: string;
  tags: string[];
}

interface Package {
  id: string;
  name: string;
  display_name: string;
  version: string;
  description: string;
  persona_slug: string;
  curator_name: string;
  skillCount: number;
  skills: Skill[];
  created_at: string;
}

async function getPackages(): Promise<Package[]> {
  try {
    const res = await fetch(`${API_URL}/api/packages`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data;
  } catch {
    return [];
  }
}

export default async function PackagesPage() {
  const packages = await getPackages();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <span className="page-title-gradient">Skill Packages</span>
        </h1>
        <p className="page-subtitle">
          Curated bundles of skills organized by developer persona. Install an
          entire package to get everything you need in one go.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h2 className="empty-state-title">No packages yet</h2>
          <p className="empty-state-text">
            Packages will appear here once leads create curated skill bundles.
          </p>
        </div>
      ) : (
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div className="package-card" key={pkg.id} id={`package-${pkg.name}`}>
              <div className="package-card-header">
                <div>
                  <h2 className="package-card-name">{pkg.display_name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                    <span className={`persona-badge ${pkg.persona_slug}`}>
                      {pkg.persona_slug}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                      v{pkg.version} · by {pkg.curator_name}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: "var(--text-2xl)",
                    fontWeight: 800,
                    background: "var(--accent-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                  }}>
                    {pkg.skillCount}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                    skills
                  </div>
                </div>
              </div>

              <p className="package-card-description">{pkg.description}</p>

              {pkg.skills.length > 0 && (
                <div className="package-skills-list">
                  {pkg.skills.map((skill) => (
                    <div className="package-skill-item" key={skill.id}>
                      <span style={{ flex: 1 }}>{skill.name}</span>
                      <span className="skill-card-version">v{skill.version}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <a
                  href={`${API_URL}/api/packages/${pkg.name}/download`}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  id={`download-${pkg.name}`}
                >
                  ⬇️ Download Package
                </a>
                <div
                  className="btn btn-secondary"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  skillforge install --package {pkg.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
