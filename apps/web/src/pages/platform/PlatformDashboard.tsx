import { useState } from "react";
import { Activity, ArrowUpRight, Building2, FolderKanban, ShieldCheck } from "lucide-react";
import AppLayout from "../../layouts/AppLayout";
import StatCard from "../../components/platform/StatCard";
import OrganizationsTable from "../../components/platform/OrganizationsTable";
import CreateOrganizationModal from "../../components/platform/CreateOrganizationModal";
import { initialOrganizations } from "../../data/organizations";
import type { Organization } from "../../types/organization";

export default function PlatformDashboard() {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [activePage, setActivePage] = useState("Overview");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState("");

  const activeCount = organizations.filter((item) => item.status === "Active").length;
  const totalProjects = organizations.reduce((sum, item) => sum + item.projects, 0);

  function createOrganization(organization: Organization) {
    setOrganizations((current) => [organization, ...current]);
    setShowCreateForm(false);
    setActivePage("Organizations");
    setNotice("Demo organization added locally. It has not been saved to the database.");
  }

  return (
    <AppLayout
      pageTitle={activePage}
      organizationCount={organizations.length}
      onNavigate={setActivePage}
      onNotice={setNotice}
    >
      <div className="app-page-heading">
        <div>
          <div className="app-eyebrow">PLATFORM MANAGEMENT</div>
          <h1>{activePage}</h1>
          <p>
            {activePage === "Overview"
              ? "Monitor your organizations and platform activity."
              : `Manage ${activePage.toLowerCase()} across the platform.`}
          </p>
        </div>
        <button className="app-primary-button" onClick={() => setShowCreateForm(true)}>
          + Create organization
        </button>
      </div>

      {notice && (
        <div className="app-notice" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {activePage === "Overview" || activePage === "Organizations" ? (
        <>
          <section className="app-stats-grid">
            <StatCard label="Total organizations" value={organizations.length} icon={Building2} detail="Demo data" note="Registered companies" />
            <StatCard label="Active organizations" value={activeCount} icon={ShieldCheck} detail={`${organizations.length ? Math.round(activeCount / organizations.length * 100) : 0}%`} note="Currently active" />
            <StatCard label="Platform users" value="—" icon={Activity} detail="Not connected" note="Real count via API later" />
            <StatCard label="Total projects" value={totalProjects} icon={FolderKanban} detail={<ArrowUpRight size={14} />} note="Across organizations (demo)" />
          </section>
          <OrganizationsTable
            organizations={organizations}
            onCreate={() => setShowCreateForm(true)}
            onNotice={setNotice}
          />
        </>
      ) : (
        <section className="app-welcome-panel">
          <h2>{activePage}</h2>
          <p>This module will be designed separately. The shared application layout is ready.</p>
        </section>
      )}

      {showCreateForm && (
        <CreateOrganizationModal
          existingOrganizations={organizations}
          onClose={() => setShowCreateForm(false)}
          onCreate={createOrganization}
        />
      )}
    </AppLayout>
  );
}
