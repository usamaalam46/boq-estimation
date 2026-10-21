import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import BaseButton from "../../components/ui/BaseButton";
import BaseInput from "../../components/ui/BaseInput";
import disciplineService from "../../services/discipline.service";
import type { Discipline, DisciplineFormData } from "../../types/discipline";
import "./Disciplines.css";

const PAGE_SIZE = 10;
const EMPTY_FORM: DisciplineFormData = { name: "", code: "", description: "" };

function readApiError(error: unknown): string {
  return disciplineService.errorMessage(error, "Something went wrong. Please try again.");
}

export default function Disciplines() {
  const [items, setItems] = useState<Discipline[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discipline | null>(null);
  const [form, setForm] = useState<DisciplineFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await disciplineService.list({
        page,
        limit: PAGE_SIZE,
        ...(search ? { search } : {}),
      });
      setItems(result.data);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: Discipline) {
    setEditing(item);
    setForm({ name: item.name, code: item.code, description: item.description ?? "" });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    const payload: DisciplineFormData = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
    };
    try {
      if (editing) {
        await disciplineService.update(editing.id, payload);
        setNotice("Discipline updated successfully.");
      } else {
        await disciplineService.create(payload);
        setNotice("Discipline created successfully.");
        setPage(1);
      }
      setModalOpen(false);
      await loadItems();
    } catch (err) {
      setFormError(readApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: Discipline) {
    setNotice("");
    setError("");
    try {
      await disciplineService.updateStatus(item.id, !item.isActive);
      setNotice(`Discipline ${item.isActive ? "deactivated" : "activated"}.`);
      await loadItems();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  async function handleDelete(item: Discipline) {
    if (!window.confirm(`Delete discipline “${item.name}”? This may be blocked if it is already in use.`)) return;
    setNotice("");
    setError("");
    try {
      await disciplineService.delete(item.id);
      setNotice("Discipline deleted successfully.");
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await loadItems();
    } catch (err) {
      setError(readApiError(err));
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const activeCount = items.filter((item) => item.isActive).length;
  const firstRecord = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <section className="disciplines-page">
      <header className="disciplines-heading">
        <div>
          <div className="disciplines-eyebrow">ENGINEERING FOUNDATION</div>
          <h1>Disciplines</h1>
          <p>Manage the engineering disciplines used to organize your BOQ catalogue.</p>
        </div>
        <div className="disciplines-heading-actions">
          <BaseButton variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={() => void loadItems()} disabled={loading}>Refresh</BaseButton>
          <BaseButton leftIcon={<Plus size={17} />} onClick={openCreate}>Add discipline</BaseButton>
        </div>
      </header>

      {notice && <div className="discipline-alert success" role="status"><Check size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={16} /></button></div>}
      {error && <div className="discipline-alert error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadItems()}>Try again</button></div>}

      <div className="disciplines-stats">
        <article className="discipline-stat-card"><span className="discipline-stat-icon"><BookOpen size={19} /></span><div><span>Total disciplines</span><strong>{total}</strong></div></article>
        <article className="discipline-stat-card"><span className="discipline-stat-icon"><Check size={19} /></span><div><span>Active on this page</span><strong>{activeCount}</strong></div></article>
        <article className="discipline-stat-card"><span className="discipline-stat-icon"><ToggleRight size={19} /></span><div><span>Page</span><strong>{total ? `${page} / ${totalPages}` : "0 / 0"}</strong></div></article>
      </div>

      <div className="disciplines-panel">
        <div className="disciplines-toolbar">
          <div><h2>All disciplines</h2><p>Use a short unique code for each engineering discipline.</p></div>
          <form className="disciplines-search" onSubmit={handleSearch}>
            <Search size={17} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or code..." aria-label="Search disciplines" />
            <button type="submit">Search</button>
          </form>
        </div>

        <div className="disciplines-table-wrap">
          <table className="disciplines-table">
            <thead><tr><th>Discipline</th><th>Code</th><th>Description</th><th>Status</th><th className="discipline-actions-head">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="discipline-table-message"><span className="discipline-loading-dot" /> Loading disciplines...</td></tr>
                : items.length === 0 ? <tr><td colSpan={5} className="discipline-table-message">{search ? "No disciplines match your search." : "No disciplines yet. Add your first discipline to get started."}</td></tr>
                : items.map((item) => <tr key={item.id}>
                  <td><div className="discipline-name-cell"><span className="discipline-row-icon"><BookOpen size={17} /></span><strong>{item.name}</strong></div></td>
                  <td><span className="discipline-code">{item.code}</span></td>
                  <td className="discipline-description">{item.description?.trim() || "—"}</td>
                  <td><span className={`discipline-status ${item.isActive ? "active" : "inactive"}`}><span />{item.isActive ? "Active" : "Inactive"}</span></td>
                  <td><div className="discipline-row-actions">
                    <button type="button" title="Edit discipline" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><Edit3 size={16} /></button>
                    <button type="button" title={item.isActive ? "Deactivate" : "Activate"} aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`} onClick={() => void handleToggle(item)}>{item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                    <button type="button" className="delete" title="Delete discipline" aria-label={`Delete ${item.name}`} onClick={() => void handleDelete(item)}><Trash2 size={16} /></button>
                  </div></td>
                </tr>)}
            </tbody>
          </table>
        </div>

        <footer className="disciplines-pagination">
          <span>Showing <strong>{firstRecord}–{lastRecord}</strong> of <strong>{total}</strong> disciplines</span>
          <div><button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /></button><span>Page {page} of {totalPages}</span><button type="button" aria-label="Next page" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={17} /></button></div>
        </footer>
      </div>

      {modalOpen && <div className="discipline-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <section className="discipline-modal" role="dialog" aria-modal="true" aria-labelledby="discipline-modal-title">
          <header><div><h2 id="discipline-modal-title">{editing ? "Edit discipline" : "Add discipline"}</h2><p>{editing ? "Update the discipline details below." : "Create a discipline for your engineering catalogue."}</p></div><button type="button" aria-label="Close dialog" onClick={() => setModalOpen(false)} disabled={saving}><X size={19} /></button></header>
          <form onSubmit={(event) => void handleSubmit(event)}>
            {formError && <div className="discipline-form-error" role="alert">{formError}</div>}
            <BaseInput label="Discipline name" placeholder="e.g. Mechanical" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={100} autoFocus />
            <BaseInput label="Code" placeholder="e.g. MECH" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required maxLength={30} hint="Use a short unique code, such as MECH or CIVIL." />
            <div className="discipline-textarea-group"><label htmlFor="discipline-description">Description <span>(optional)</span></label><textarea id="discipline-description" rows={3} maxLength={500} placeholder="Describe the discipline..." value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
            <footer><BaseButton variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</BaseButton><BaseButton type="submit" loading={saving}>{editing ? "Save changes" : "Create discipline"}</BaseButton></footer>
          </form>
        </section>
      </div>}
    </section>
  );
}
