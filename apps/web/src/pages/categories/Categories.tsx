import { useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, RefreshCw, Search, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import BaseButton from "../../components/ui/BaseButton";
import BaseInput from "../../components/ui/BaseInput";
import categoryService from "../../services/category.service";
import disciplineService from "../../services/discipline.service";
import type { Category, CategoryFormData } from "../../types/category";
import type { Discipline } from "../../types/discipline";
import "./Categories.css";

const PAGE_SIZE = 10;
const EMPTY_FORM: CategoryFormData = {
  disciplineId: 0,
  parentId: null,
  name: "",
  code: "",
  description: "",
  sortOrder: 0,
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);

  async function loadDisciplines() {
    try {
      const result = await disciplineService.list({ page: 1, limit: 100 });
      setDisciplines(result.data.filter((item) => item.isActive));
    } catch {
      setError("Could not load disciplines. Check the disciplines API.");
    }
  }

  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      const result = await categoryService.list({
        page,
        limit: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(disciplineFilter ? { disciplineId: Number(disciplineFilter) } : {}),
      });
      setCategories(result.data);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (err) {
      setError(categoryService.errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDisciplines();
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [page, search, disciplineFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, disciplineId: disciplines[0]?.id ?? 0 });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      disciplineId: category.disciplineId,
      parentId: category.parentId,
      name: category.name,
      code: category.code ?? "",
      description: category.description ?? "",
      sortOrder: category.sortOrder,
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.disciplineId) {
      setError("Please select a discipline.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data: CategoryFormData = {
        ...form,
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
      };
      if (editing) {
        await categoryService.update(editing.id, data);
        setNotice("Category updated successfully.");
      } else {
        await categoryService.create(data);
        setNotice("Category created successfully.");
        setPage(1);
      }
      setModalOpen(false);
      await loadCategories();
    } catch (err) {
      setError(categoryService.errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(category: Category) {
    try {
      await categoryService.updateStatus(category.id, !category.isActive);
      setNotice(`Category ${category.isActive ? "deactivated" : "activated"}.`);
      await loadCategories();
    } catch (err) {
      setError(categoryService.errorMessage(err));
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await categoryService.delete(category.id);
      setNotice("Category deleted successfully.");
      await loadCategories();
    } catch (err) {
      setError(categoryService.errorMessage(err));
    }
  }

  const parentCategories = categories.filter(
    (category) => category.disciplineId === form.disciplineId && category.id !== editing?.id,
  );

  return (
    <div className="categories-page">
      <div className="categories-heading">
        <div>
          <p className="categories-eyebrow">ENGINEERING FOUNDATION</p>
          <h1>Categories</h1>
          <p className="categories-subtitle">Organize catalogue items into discipline-specific categories.</p>
        </div>
        <BaseButton onClick={openCreate} leftIcon={<Plus size={17} />}>Add Category</BaseButton>
      </div>

      {notice && <div className="categories-notice">{notice}</div>}
      {error && <div className="categories-error">{error}</div>}

      <div className="categories-toolbar">
        <div className="categories-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search categories..."
          />
        </div>
        <select value={disciplineFilter} onChange={(event) => { setDisciplineFilter(event.target.value); setPage(1); }}>
          <option value="">All disciplines</option>
          {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
        </select>
        <BaseButton variant="outline" onClick={() => void loadCategories()} leftIcon={<RefreshCw size={16} />}>Refresh</BaseButton>
      </div>

      <div className="categories-card">
        <div className="categories-card-heading">
          <div><h2>Category List</h2><p>{total} categories in total</p></div>
        </div>
        <div className="categories-table-wrap">
          <table className="categories-table">
            <thead><tr><th>Category</th><th>Code</th><th>Discipline</th><th>Parent</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="categories-empty">Loading categories...</td></tr> : categories.length === 0 ? <tr><td colSpan={7} className="categories-empty">No categories found.</td></tr> : categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong>{category.description && <small>{category.description}</small>}</td>
                  <td>{category.code || "—"}</td>
                  <td>{category.discipline?.name ?? disciplines.find((item) => item.id === category.disciplineId)?.name ?? `#${category.disciplineId}`}</td>
                  <td>{category.parent?.name ?? "—"}</td>
                  <td>{category.sortOrder}</td>
                  <td><span className={`categories-status ${category.isActive ? "is-active" : "is-inactive"}`}>{category.isActive ? "Active" : "Inactive"}</span></td>
                  <td><div className="categories-actions">
                    <button title="Edit category" onClick={() => openEdit(category)}><Edit3 size={16} /></button>
                    <button title={category.isActive ? "Deactivate" : "Activate"} onClick={() => void handleStatus(category)}>{category.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                    <button title="Delete category" className="delete-action" onClick={() => void handleDelete(category)}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="categories-pagination">
          <span>Page {page} of {totalPages}</span>
          <div>
            <BaseButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</BaseButton>
            <BaseButton variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</BaseButton>
          </div>
        </div>
      </div>

      {modalOpen && <div className="categories-modal-backdrop" onClick={() => setModalOpen(false)}>
        <div className="categories-modal" onClick={(event) => event.stopPropagation()}>
          <div className="categories-modal-heading"><div><h2>{editing ? "Edit Category" : "Add Category"}</h2><p>Enter the category details below.</p></div><button onClick={() => setModalOpen(false)} aria-label="Close"><X size={20} /></button></div>
          <form onSubmit={handleSubmit}>
            <label className="categories-field-label">Discipline <span>*</span>
              <select required value={form.disciplineId || ""} onChange={(event) => setForm({ ...form, disciplineId: Number(event.target.value), parentId: null })}>
                <option value="" disabled>Select a discipline</option>
                {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
              </select>
            </label>
            <label className="categories-field-label">Parent category
              <select value={form.parentId ?? ""} onChange={(event) => setForm({ ...form, parentId: event.target.value ? Number(event.target.value) : null })}>
                <option value="">No parent (top-level category)</option>
                {parentCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <BaseInput label="Category name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Pipes & Fittings" />
            <BaseInput label="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="e.g. PIP" />
            <BaseInput label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional description" />
            <BaseInput label="Sort order" inputMode="numeric" type="number" min="0" value={String(form.sortOrder)} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
            {error && <div className="categories-error">{error}</div>}
            <div className="categories-modal-actions"><BaseButton type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</BaseButton><BaseButton type="submit" loading={saving}>{editing ? "Save Changes" : "Create Category"}</BaseButton></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
