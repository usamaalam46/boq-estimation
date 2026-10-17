import { ArrowUpRight, ClipboardList, FolderKanban, Plus, ReceiptText, TrendingUp } from "lucide-react";
import "./Dashboard.css";

const summaryCards = [
  { label: "Total projects", value: "0", detail: "Projects created in your workspace", icon: FolderKanban },
  { label: "BOQ estimates", value: "0", detail: "Estimates prepared so far", icon: ClipboardList },
  { label: "Estimated value", value: "PKR 0", detail: "Combined estimate value", icon: ReceiptText },
  { label: "Recent activity", value: "—", detail: "Activity will appear here", icon: TrendingUp },
];

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div>
          <div className="dashboard-breadcrumb">WORKSPACE <span>/</span> OVERVIEW</div>
          <h1 id="dashboard-title">Dashboard</h1>
          <p>Manage your projects, prepare BOQ estimates, and keep costs in one place.</p>
        </div>
        <div className="dashboard-quick-actions">
          <button type="button" className="dashboard-primary-action" onClick={() => window.location.assign("/projects")}>
            <Plus size={16} /> New project
          </button>
          <button type="button" className="dashboard-secondary-action" onClick={() => window.location.assign("/estimates")}>
            <ClipboardList size={16} /> Create estimate
          </button>
        </div>
      </section>

      <section className="dashboard-stats-grid" aria-label="Workspace summary">
        {summaryCards.map(({ label, value, detail, icon: Icon }) => (
          <article className="dashboard-stat-card" key={label}>
            <div className="dashboard-stat-top">
              <span>{label}</span>
              <span className="dashboard-stat-icon"><Icon size={18} /></span>
            </div>
            <div className="dashboard-stat-value">{value}</div>
            <p className="dashboard-stat-detail">{detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-content-grid">
        <article className="dashboard-panel dashboard-project-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Recent projects</h2>
              <p>Your latest BOQ projects will be listed here.</p>
            </div>
            <button type="button" className="dashboard-text-action" onClick={() => window.location.assign("/projects")}>
              View projects <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="dashboard-empty-state">
            <span className="dashboard-empty-icon"><FolderKanban size={23} /></span>
            <h3>No projects yet</h3>
            <p>Create your first project to start organizing BOQ items, materials, quantities, and costs.</p>
            <button type="button" className="dashboard-primary-action" onClick={() => window.location.assign("/projects")}>
              <Plus size={16} /> Create first project
            </button>
          </div>
        </article>

        <article className="dashboard-panel dashboard-activity-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Getting started</h2>
              <p>A simple workflow for your first estimate.</p>
            </div>
          </div>
          <ol className="dashboard-steps">
            <li><span>1</span><div><strong>Create a project</strong><p>Enter the project name, client, and location.</p></div></li>
            <li><span>2</span><div><strong>Add BOQ items</strong><p>Define work items, units, quantities, and rates.</p></div></li>
            <li><span>3</span><div><strong>Review the cost</strong><p>Check totals and prepare your estimate.</p></div></li>
          </ol>
        </article>
      </section>
      <p className="dashboard-demo-note">Dashboard summary values are placeholders until project and estimate APIs are connected.</p>
    </div>
  );
}
