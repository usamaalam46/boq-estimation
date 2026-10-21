import { useEffect, useState } from "react";
import {
  Search,
  Building2,
  Users,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Pencil,
  Power,
  X,
} from "lucide-react";
import organizationService from "../../services/organization.service";
import type {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
} from "../../types/organization";
import "./Organizations.css";

const PAGE_SIZE = 10;
const emptyCreateForm: CreateOrganizationData = {
  name: "",
  address: "",
  location: "",
  ownerName: "",
  ownerEmail: "",
};
const emptyEditForm: UpdateOrganizationData = {
  name: "",
  address: "",
  location: "",
};
function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    if (response?.data?.message) return response.data.message;
    if (response?.data?.error) return response.data.error;
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [createForm, setCreateForm] = useState<CreateOrganizationData>({
    ...emptyCreateForm,
  });
  const [editForm, setEditForm] = useState<UpdateOrganizationData>({
    ...emptyEditForm,
  });
  const [saving, setSaving] = useState(false);

  async function loadOrganizations() {
    setLoading(true);
    setError("");
    try {
      const result = await organizationService.list({
        page,
        limit: PAGE_SIZE,
        ...(search ? { search } : {}),
      });
      setOrganizations(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadOrganizations();
  }, [page, search]);

  function openCreateForm() {
    setEditingOrganization(null);
    setCreateForm({ ...emptyCreateForm });
    setNotice("");
    setError("");
    setShowForm(true);
  }
  function openEditForm(org: Organization) {
    setEditingOrganization(org);
    setEditForm({
      name: org.name,
      address: org.address ?? "",
      location: org.location ?? "",
    });
    setNotice("");
    setError("");
    setShowForm(true);
  }
  function changeCreateField(
    field: keyof CreateOrganizationData,
    value: string,
  ) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }
  function changeEditField(field: keyof UpdateOrganizationData, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }
  async function saveOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingOrganization) {
        await organizationService.update(editingOrganization.id, {
          ...editForm,
          name: editForm.name.trim(),
          address: editForm.address.trim(),
          location: editForm.location.trim(),
        });
        setNotice("Organization updated successfully.");
      } else {
        await organizationService.create({
          ...createForm,
          name: createForm.name.trim(),
          address: createForm.address.trim(),
          location: createForm.location.trim(),
          ownerName: createForm.ownerName.trim(),
          ownerEmail: createForm.ownerEmail.trim().toLowerCase(),
        });
        setNotice(
          "Organization and owner created. The owner welcome email is being sent.",
        );
      }
      setShowForm(false);
      if (page === 1) await loadOrganizations();
      else setPage(1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  async function toggleStatus(org: Organization) {
    const action = org.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${org.name}?`))
      return;
    setError("");
    setNotice("");
    try {
      await organizationService.updateStatus(org.id, !org.isActive);
      setNotice(`Organization ${action}d successfully.`);
      await loadOrganizations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }
  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }
  const startRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, total);
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  ).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
  const activeForm = editingOrganization ? editForm : createForm;
  const changeField = editingOrganization ? changeEditField : changeCreateField;
  return (
    <section className="organizations-page">
      <div className="organizations-heading">
        <div>
          <h1>Organizations</h1>
          <p>Manage organizations registered on the BOQ platform.</p>
        </div>
        <div className="organization-heading-actions">
          <button
            type="button"
            className="organizations-refresh"
            onClick={() => void loadOrganizations()}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            className="organization-primary-button"
            onClick={openCreateForm}
          >
            <Plus size={16} /> Add organization
          </button>
        </div>
      </div>
      {notice && (
        <div className="organization-notice" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="organizations-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadOrganizations()}>
            Try again
          </button>
        </div>
      )}
      <div className="organizations-summary">
        <div className="organization-summary-card">
          <div className="organization-summary-icon">
            <Building2 size={20} />
          </div>
          <div>
            <span>Total organizations</span>
            <strong>{total}</strong>
          </div>
        </div>
        <div className="organization-summary-card">
          <div className="organization-summary-icon">
            <Users size={20} />
          </div>
          <div>
            <span>Organizations on this page</span>
            <strong>{organizations.length}</strong>
          </div>
        </div>
        <div className="organization-summary-card">
          <div className="organization-summary-icon">
            <FolderKanban size={20} />
          </div>
          <div>
            <span>Current page</span>
            <strong>{totalPages ? `${page} / ${totalPages}` : "0 / 0"}</strong>
          </div>
        </div>
      </div>
      <div className="organizations-panel">
        <div className="organizations-toolbar">
          <div>
            <h2>All organizations</h2>
            <p>Manage organization details, members and projects.</p>
          </div>
          <form className="organizations-search" onSubmit={handleSearch}>
            <Search size={18} />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or slug..."
              aria-label="Search organizations by name or slug"
            />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="organizations-table-wrapper">
          <table className="organizations-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Owner</th>
                <th>Location</th>
                <th>Members</th>
                <th>Projects</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="organizations-message">
                    Loading organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="organizations-message">
                    {search
                      ? "No organizations match your search."
                      : "No organizations have been created yet."}
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div className="organization-name-cell">
                        <div className="organization-avatar">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{org.name}</strong>
                          <span>{org.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="organization-owner-cell">
                        <strong>{org.owner?.name ?? "Owner not found"}</strong>
                        <span>{org.owner?.email ?? "—"}</span>
                      </div>
                    </td>
                    <td>{org.location || org.address || "—"}</td>
                    <td>{org._count?.members ?? 0}</td>
                    <td>{org._count?.projects ?? 0}</td>
                    <td>
                      <span
                        className={`organization-status ${org.isActive ? "is-active" : "is-inactive"}`}
                      >
                        {org.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="organization-row-actions">
                        <button
                          type="button"
                          title="Edit organization"
                          onClick={() => openEditForm(org)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title={
                            org.isActive
                              ? "Deactivate organization"
                              : "Activate organization"
                          }
                          onClick={() => void toggleStatus(org)}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="organizations-pagination">
          <span>
            Showing {startRecord}–{endRecord} of {total} organizations
          </span>
          <div className="organizations-pagination-controls">
            <button
              type="button"
              aria-label="Previous page"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            {pageNumbers.map((n, i) => (
              <span className="organization-page-number" key={n}>
                {i > 0 && n - pageNumbers[i - 1] > 1 && <span>…</span>}
                <button
                  type="button"
                  className={n === page ? "current" : ""}
                  disabled={loading}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              </span>
            ))}
            <button
              type="button"
              aria-label="Next page"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
      {showForm && (
        <div
          className="organization-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setShowForm(false);
          }}
        >
          <section
            className="organization-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="organization-form-title"
          >
            <div className="organization-modal-heading">
              <div>
                <h2 id="organization-form-title">
                  {editingOrganization
                    ? "Edit organization"
                    : "Create organization"}
                </h2>
                <p>
                  {editingOrganization
                    ? "Update organization details below."
                    : "Enter organization and owner details below."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => void saveOrganization(e)}>
              <label>
                Organization name
                <input
                  required
                  maxLength={150}
                  value={activeForm.name}
                  onChange={(e) => changeField("name", e.target.value)}
                  placeholder="e.g. Apex Engineering"
                />
              </label>
              <p className="organization-slug-help">
                Slug is generated automatically by the server.
              </p>
              <label>
                Location
                <input
                  maxLength={500}
                  value={activeForm.location}
                  onChange={(e) => changeField("location", e.target.value)}
                  placeholder="City, country"
                />
              </label>
              <label>
                Address
                <textarea
                  maxLength={500}
                  value={activeForm.address}
                  onChange={(e) => changeField("address", e.target.value)}
                  placeholder="Organization address"
                  rows={3}
                />
              </label>
              {!editingOrganization && (
                <>
                  <div className="organization-form-section">
                    <h3>Organization owner</h3>
                    <p>
                      The owner account will be created and assigned to this
                      organization.
                    </p>
                  </div>
                  <label>
                    Owner full name
                    <input
                      required
                      maxLength={150}
                      autoComplete="name"
                      value={createForm.ownerName}
                      onChange={(e) =>
                        changeCreateField("ownerName", e.target.value)
                      }
                      placeholder="e.g. Ahmed Khan"
                    />
                  </label>
                  <label>
                    Owner email
                    <input
                      required
                      type="email"
                      maxLength={254}
                      autoComplete="email"
                      value={createForm.ownerEmail}
                      onChange={(e) =>
                        changeCreateField("ownerEmail", e.target.value)
                      }
                      placeholder="owner@company.com"
                    />
                  </label>
                </>
              )}
              <div className="organization-modal-actions">
                <button
                  type="button"
                  className="organization-cancel-button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="organization-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingOrganization
                      ? "Save changes"
                      : "Create organization"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
