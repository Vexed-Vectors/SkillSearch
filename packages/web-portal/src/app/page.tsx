import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Persona {
  slug: string;
  display_name: string;
  icon: string;
  totalSkillCount: number;
  children: Persona[];
}

interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  persona_slug: string;
  tags: string[];
  author_name: string;
  install_count: number;
  created_at: string;
}

async function getSkills(persona?: string, search?: string): Promise<Skill[]> {
  const params = new URLSearchParams();
  if (persona) params.set("persona", persona);
  if (search) params.set("search", search);

  try {
    const res = await fetch(`${API_URL}/api/skills?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data;
  } catch {
    return [];
  }
}

async function getPersonas(): Promise<Persona[]> {
  try {
    const res = await fetch(`${API_URL}/api/personas`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const res = await fetch(`${API_URL}/api/stats`, { cache: "no-store" });
    if (!res.ok) return { skills: 0, packages: 0, personas: 0, totalInstalls: 0 };
    const data = await res.json();
    return data.data;
  } catch {
    return { skills: 0, packages: 0, personas: 0, totalInstalls: 0 };
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; search?: string }>;
}) {
  const resolvedParams = await searchParams;
  const [skills, personas, stats] = await Promise.all([
    getSkills(resolvedParams.persona, resolvedParams.search),
    getPersonas(),
    getStats(),
  ]);

  const activePersona = resolvedParams.persona || null;
  const activeSearch = resolvedParams.search || "";

  return (
    <div className="page-container">
      {/* Hero */}
      <div className="hero">
        <h1 className="hero-title">
          <span className="page-title-gradient">AI Skills</span> for your IDE
        </h1>
        <p className="hero-subtitle">
          Discover, install, and share copilot instruction files that make
          GitHub Copilot work smarter for your stack.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">{stats.skills}</div>
            <div className="hero-stat-label">Skills</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{stats.packages}</div>
            <div className="hero-stat-label">Packages</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">{stats.totalInstalls}</div>
            <div className="hero-stat-label">Installs</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <span className="search-icon">🔍</span>
        <form action="/" method="GET">
          {activePersona && <input type="hidden" name="persona" value={activePersona} />}
          <input
            className="search-input"
            type="text"
            name="search"
            placeholder="Search skills by name, description, or content..."
            defaultValue={activeSearch}
            id="search-skills"
          />
        </form>
      </div>

      {/* Persona Filter Chips */}
      <div className="filter-chips">
        <Link
          href="/"
          className={`filter-chip ${!activePersona ? "active" : ""}`}
          id="filter-all"
        >
          <span className="chip-icon">🎯</span>
          All
          <span className="chip-count">{stats.skills}</span>
        </Link>
        {personas.map((persona) => (
          <Link
            key={persona.slug}
            href={`/?persona=${persona.slug}${activeSearch ? `&search=${activeSearch}` : ""}`}
            className={`filter-chip ${activePersona === persona.slug ? "active" : ""}`}
            id={`filter-${persona.slug}`}
          >
            <span className="chip-icon">{persona.icon}</span>
            {persona.display_name}
            <span className="chip-count">{persona.totalSkillCount}</span>
          </Link>
        ))}
      </div>

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h2 className="empty-state-title">No skills found</h2>
          <p className="empty-state-text">
            {activeSearch
              ? `No skills match "${activeSearch}". Try a different search term.`
              : "No skills available yet. Be the first to publish one!"}
          </p>
        </div>
      ) : (
        <div className="skills-grid">
          {skills.map((skill) => (
            <Link
              href={`/skills/${skill.name}`}
              className="skill-card"
              key={skill.id}
              id={`skill-${skill.name}`}
            >
              <div className="skill-card-header">
                <h3 className="skill-card-name">{skill.name}</h3>
                <span className="skill-card-version">v{skill.version}</span>
              </div>
              <p className="skill-card-description">{skill.description}</p>
              <div className="skill-card-meta">
                <span className={`persona-badge ${skill.persona_slug}`}>
                  {skill.persona_slug}
                </span>
                <div className="skill-card-tags">
                  {skill.tags.slice(0, 3).map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                  {skill.tags.length > 3 && (
                    <span className="tag">+{skill.tags.length - 3}</span>
                  )}
                </div>
              </div>
              <div className="skill-card-footer">
                <span>by {skill.author_name}</span>
                <span className="install-count">
                  ⬇️ {skill.install_count} installs
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
