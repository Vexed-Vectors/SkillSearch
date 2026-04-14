import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SkillForge — AI Skills Registry",
  description: "Discover, install, and share AI copilot instruction files for GitHub Copilot. Boost your team's productivity with curated skill packages.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stats = await getStats();

  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-logo">
                <div className="sidebar-logo-icon">⚡</div>
                <span className="sidebar-logo-text">SkillForge</span>
              </div>
            </div>

            <nav className="sidebar-nav">
              <Link href="/" className="sidebar-nav-item" id="nav-catalog">
                <span className="nav-icon">📚</span>
                Skills Catalog
              </Link>
              <Link href="/packages" className="sidebar-nav-item" id="nav-packages">
                <span className="nav-icon">📦</span>
                Packages
              </Link>
              <Link href="/publish" className="sidebar-nav-item" id="nav-publish">
                <span className="nav-icon">🚀</span>
                Publish Skill
              </Link>
            </nav>

            <div className="sidebar-footer">
              <div className="sidebar-stats">
                <div className="sidebar-stat">
                  <div className="sidebar-stat-value">{stats.skills}</div>
                  <div className="sidebar-stat-label">Skills</div>
                </div>
                <div className="sidebar-stat">
                  <div className="sidebar-stat-value">{stats.packages}</div>
                  <div className="sidebar-stat-label">Packages</div>
                </div>
                <div className="sidebar-stat">
                  <div className="sidebar-stat-value">{stats.totalInstalls}</div>
                  <div className="sidebar-stat-label">Installs</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
