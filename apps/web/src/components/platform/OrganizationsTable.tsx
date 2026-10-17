import { ArrowUpRight, Clock3, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Organization, OrganizationStatus } from "../../types/organization";

type OrganizationsTableProps = {
  organizations: Organization[];
  onCreate: () => void;
  onNotice: (message: string) => void;
};

export default function OrganizationsTable({
  organizations,
  onCreate,
  onNotice,
}: OrganizationsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | OrganizationStatus>("All");

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations.filter((organization) => {
      const matchesSearch =
        !query ||
        organization.name.toLowerCase().includes(query) ||
        organization.slug.toLowerCase().includes(query) ||
        organization.email.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || organization.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, search, statusFilter]);

  return (
    <section className="app-panel">
      <div className="app-panel-heading">
        <div>
          <h2>Organizations</h2>
          <p>Manage companies registered on your platform.</p>
        </div>
        <button className="app-secondary-button" onClick={onCreate}>
          <Plus size={16} /> Add organization
        </button>
      </div>

      <div className="app-table-toolbar">
        <label className="app-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search organizations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          className="app-select"
          aria-label="Filter organizations by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
        >
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="app-table-wrap">
        <table className="app-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Administrator</th>
              <th>Projects</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrganizations.map((organization) => (
              <tr key={organization.id}>
                <td>
                  <div className="app-org-cell">
                    <div className="app-org-avatar">{organization.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <strong>{organization.name}</strong>
                      <span>{organization.slug}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="app-admin-cell">
                    <strong>{organization.admin}</strong>
                    <span>{organization.email}</span>
                  </div>
                </td>
                <td>{organization.projects}</td>
                <td>
                  <span className={`app-status app-status-${organization.status.toLowerCase()}`}>
                    <span />{organization.status}
                  </span>
                </td>
                <td className="app-date-cell">{organization.createdAt}</td>
                <td>
                  <button
                    className="app-row-action"
                    onClick={() => onNotice(`${organization.name}: detail page will be added later.`)}
                  >
                    View <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredOrganizations.length === 0 && (
              <tr><td colSpan={6} className="app-empty">No organizations match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="app-table-footer">
        <span>Showing {filteredOrganizations.length} of {organizations.length} organizations</span>
        <span className="app-demo-label"><Clock3 size={14} /> Sample data</span>
      </div>
    </section>
  );
}
