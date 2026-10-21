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
import type { Organization, OrganizationFormData } from "../../types/organization";
import "./Organizations.css";

const PAGE_SIZE = 10;

const emptyForm: CreateOrganizationData = {
  name: "",
  slug: "",
  address: "",
  location: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
};

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
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
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [form, setForm] = useState<CreateOrganizationData>(emptyForm);
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
    } catch (err: unknown) {
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
    setForm(emptyForm);
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(organization: Organization) {
    setEditingOrganization(organization);
    setForm({
      name: organization.name,
      slug: organization.slug,
      address: organization.address ?? "",
      location: organization.location ?? "",
    });
    setNotice("");
    setShowForm(true);
  }

  function changeField(field: keyof CreateOrganizationData, value: string) {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === "name" && !editingOrganization) {
        updated.slug = value.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return updated;
    });
  }

  async function saveOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingOrganization) {
        const data: UpdateOrganizationData = { name: form.name.trim(), slug: form.slug.trim().toLowerCase(), address: form.address.trim(), location: form.location.trim() };
        await organizationService.update(editingOrganization.id, data);
        setNotice("Organization updated successfully.");
      } else {
        const data: CreateOrganizationData = { name: form.name.trim(), slug: form.slug.trim().toLowerCase(), address: form.address.trim(), location: form.location.trim(), ownerName: form.ownerName.trim(), ownerEmail: form.ownerEmail.trim().toLowerCase(), ownerPassword: form.ownerPassword };
        await organizationService.create(data);
        setPage(1);
        setNotice("Organization created successfully.");
      }
      setShowForm(false);
      if (page === 1) await loadOrganizations();
      else setPage(1);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(organization: Organization) {
    const action = organization.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${organization.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await organizationService.updateStatus(organization.id, !organization.isActive);
      setNotice(`Organization ${action}d successfully.`);
      await loadOrganizations();
    } catch (err: unknown) {
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
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1);

  return (
    <section className="organizations-page">
      <div className="organizations-heading">
        <div>
          <h1>Organizations</h1>
          <p>Manage organizations registered on the BOQ platform.</p>
        </div>
        <div className="organization-heading-actions">
          <button type="button" className="organizations-refresh" onClick={() => void loadOrganizations()} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="organization-primary-button" onClick={openCreateForm}>
            <Plus size={16} /> Add organization
          </button>
        </div>
      </div>

      {notice && <div className="organization-notice" role="status">{notice}</div>}
      {error && <div className="organizations-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadOrganizations()}>Try again</button></div>}

      <div className="organizations-summary">
        <div className="organization-summary-card"><div className="organization-summary-icon"><Building2 size={20} /></div><div><span>Total organizations</span><strong>{total}</strong></div></div>
        <div className="organization-summary-card"><div className="organization-summary-icon"><Users size={20} /></div><div><span>Organizations on this page</span><strong>{organizations.length}</strong></div></div>
        <div className="organization-summary-card"><div className="organization-summary-icon"><FolderKanban size={20} /></div><div><span>Current page</span><strong>{totalPages ? `${page} / ${totalPages}` : "0 / 0"}</strong></div></div>
      </div>

      <div className="organizations-panel">
        <div className="organizations-toolbar">
          <div><h2>All organizations</h2><p>Manage organization details, members and projects.</p></div>
          <form className="organizations-search" onSubmit={handleSearch}>
            <Search size={18} />
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or slug..." aria-label="Search organizations by name or slug" />
            <button type="submit">Search</button>
          </form>
        </div>

        <div className="organizations-table-wrapper">
          <table className="organizations-table">
            <thead><tr><th>Organization</th><th>Location</th><th>Members</th><th>Projects</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="organizations-message">Loading organizations...</td></tr>
                : organizations.length === 0 ? <tr><td colSpan={7} className="organizations-message">{search ? "No organizations match your search." : "No organizations have been created yet."}</td></tr>
                : organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td><div className="organization-name-cell"><div className="organization-avatar">{organization.name.charAt(0).toUpperCase()}</div><div><strong>{organization.name}</strong><span>{organization.slug}</span></div></div></td>
                    <td>{organization.location || organization.address || "—"}</td>
                    <td>{organization._count.members}</td><td>{organization._count.projects}</td>
                    <td><span className={`organization-status ${organization.isActive ? "is-active" : "is-inactive"}`}>{organization.isActive ? "Active" : "Inactive"}</span></td>
                    <td>{new Date(organization.createdAt).toLocaleDateString()}</td>
                    <td><div className="organization-row-actions">
                      <button type="button" title="Edit organization" onClick={() => openEditForm(organization)}><Pencil size={15} /></button>
                      <button type="button" title={organization.isActive ? "Deactivate organization" : "Activate organization"} onClick={() => void toggleStatus(organization)}><Power size={15} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="organizations-pagination"><span>Showing {startRecord}–{endRecord} of {total} organizations</span><div className="organizations-pagination-controls">
          <button type="button" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} /></button>
          {pageNumbers.map((number, index) => <span className="organization-page-number" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span>…</span>}<button type="button" className={number === page ? "current" : ""} disabled={loading} onClick={() => setPage(number)}>{number}</button></span>)}
          <button type="button" aria-label="Next page" disabled={loading || page >= totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={17} /></button>
        </div></div>
      </div>

      {showForm && <div className="organization-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
        <section className="organization-modal" role="dialog" aria-modal="true" aria-labelledby="organization-form-title">
          <div className="organization-modal-heading"><div><h2 id="organization-form-title">{editingOrganization ? "Edit organization" : "Create organization"}</h2><p>Enter the organization details below.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close"><X size={20} /></button></div>
          <form onSubmit={(event) => void saveOrganization(event)}>
            <label>Organization name<input required maxLength={120} value={form.name} onChange={(event) => changeField("name", event.target.value)} placeholder="e.g. Apex Engineering" /></label>
            <label>Slug<input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(event) => changeField("slug", event.target.value)} placeholder="apex-engineering" /></label>
            <label>Location<input maxLength={150} value={form.location} onChange={(event) => changeField("location", event.target.value)} placeholder="City, country" /></label>
            <label>Address<textarea maxLength={500} value={form.address} onChange={(event) => changeField("address", event.target.value)} placeholder="Organization address" rows={3} /></label>
            {!editingOrganization && <>
              <div className="organization-form-section"><h3>Organization owner</h3><p>The owner account will be created and assigned automatically.</p></div>
              <label>Owner full name<input required maxLength={150} autoComplete="name" value={form.ownerName} onChange={(event) => changeField("ownerName", event.target.value)} placeholder="e.g. Ahmed Khan" /></label>
              <label>Owner email<input required type="email" maxLength={254} autoComplete="email" value={form.ownerEmail} onChange={(event) => changeField("ownerEmail", event.target.value)} placeholder="owner@company.com" /></label>
              <label>Owner password<input required type="password" minLength={8} autoComplete="new-password" value={form.ownerPassword} onChange={(event) => changeField("ownerPassword", event.target.value)} placeholder="At least 8 characters" /></label>
            </>}
            <div className="organization-modal-actions"><button type="button" className="organization-cancel-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="organization-primary-button" disabled={saving}>{saving ? "Saving..." : editingOrganization ? "Save changes" : "Create organization"}</button></div>
          </form>
        </section>
      </div>}
    </section>
  );
}
