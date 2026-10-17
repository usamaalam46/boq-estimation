import { useLocation } from "react-router-dom";

const pageDetails: Record<string, { title: string; description: string }> = {
  "/organizations": {
    title: "Organizations",
    description: "Manage companies and their workspaces.",
  },
  "/projects": {
    title: "Projects",
    description: "Create and manage your BOQ projects.",
  },
  "/estimates": {
    title: "Estimates",
    description: "Prepare and manage bills of quantities.",
  },
  "/settings": {
    title: "Settings",
    description: "Manage your platform preferences.",
  },
};

export default function WorkspacePage() {
  const { pathname } = useLocation();
  const page = pageDetails[pathname] ?? {
    title: "Workspace",
    description: "Your workspace content will appear here.",
  };

  return (
    <section aria-labelledby="workspace-page-title">
      <div className="app-page-heading">
        <div>
          <span className="app-eyebrow">WORKSPACE / OVERVIEW</span>
          <h1 id="workspace-page-title">{page.title}</h1>
          <p>{page.description}</p>
        </div>
      </div>

      <section className="app-panel" style={{ padding: 24 }}>
        <h2>{page.title}</h2>
        <p style={{ marginBottom: 0, color: "var(--color-text-muted)" }}>
          This page is ready for its content. Your sidebar, header, and footer
          stay in place while you navigate.
        </p>
      </section>
    </section>
  );
}
