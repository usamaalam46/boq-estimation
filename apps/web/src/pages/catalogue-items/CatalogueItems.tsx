import { useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, Search, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import BaseButton from "../../components/ui/BaseButton";
import BaseInput from "../../components/ui/BaseInput";
import catalogueItemService from "../../services/catalogue-item.service";
import disciplineService from "../../services/discipline.service";
import categoryService from "../../services/category.service";
import unitService from "../../services/unit.service";
import type { CatalogueItem, CatalogueItemFormData } from "../../types/catalogue-item";
import type { Discipline } from "../../types/discipline";
import type { Category } from "../../types/category";
import type { Unit } from "../../types/unit";
import "./CatalogueItems.css";

const PAGE_SIZE = 10;
const EMPTY_FORM: CatalogueItemFormData = {
  scope: "platform",
  disciplineId: 0,
  categoryId: 0,
  unitId: 0,
  code: "",
  name: "",
  description: "",
  specification: null,
  defaultWastagePercent: null,
};

export default function CatalogueItems() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [form, setForm] = useState<CatalogueItemFormData>(EMPTY_FORM);
  const [specificationText, setSpecificationText] = useState("");

  async function loadOptions() {
    try {
      const [disciplineResult, categoryResult, unitResult] = await Promise.all([
        disciplineService.list({ page: 1, limit: 100 }),
        categoryService.list({ page: 1, limit: 100 }),
        unitService.list({ page: 1, limit: 100 }),
      ]);
      setDisciplines(disciplineResult.data.filter((item) => item.isActive));
      setCategories(categoryResult.data.filter((item) => item.isActive));
      setUnits(unitResult.data.filter((item) => item.isActive));
    } catch (err) {
      setError(catalogueItemService.errorMessage(err));
    }
  }

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const result = await catalogueItemService.list({
        page,
        limit: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(disciplineFilter ? { disciplineId: Number(disciplineFilter) } : {}),
      });
      setItems(result.data);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (err) {
      setError(catalogueItemService.errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOptions(); }, []);
  useEffect(() => { void loadItems(); }, [page, search, disciplineFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      disciplineId: disciplines[0]?.id ?? 0,
      categoryId: categories[0]?.id ?? 0,
      unitId: units[0]?.id ?? 0,
    });
    setSpecificationText("");
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(item: CatalogueItem) {
    setEditing(item);
    setForm({
      scope: "platform",
      disciplineId: item.disciplineId,
      categoryId: item.categoryId,
      unitId: item.unitId,
      code: item.code ?? "",
      name: item.name,
      description: item.description ?? "",
      specification: item.specification,
      defaultWastagePercent: item.defaultWastagePercent == null ? null : Number(item.defaultWastagePercent),
    });
    setSpecificationText(item.specification ? JSON.stringify(item.specification, null, 2) : "");
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.disciplineId || !form.categoryId || !form.unitId) {
      setError("Please select a discipline, category, and unit.");
      return;
    }

    let specification: Record<string, unknown> | null = null;
    if (specificationText.trim()) {
      try {
        const parsed: unknown = JSON.parse(specificationText);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setError("Specification must be a JSON object, for example: { \"material\": \"Steel\" }.");
          return;
        }
        specification = parsed as Record<string, unknown>;
      } catch {
        setError("Specification must contain valid JSON.");
        return;
      }
    }

    const data: CatalogueItemFormData = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      specification,
    };

    setSaving(true);
    try {
      if (editing) {
        await catalogueItemService.update(editing.id, data);
        setNotice("Catalogue item updated successfully.");
      } else {
        await catalogueItemService.create(data);
        setNotice("Catalogue item created successfully.");
        setPage(1);
      }
      setModalOpen(false);
      await loadItems();
    } catch (err) {
      setError(catalogueItemService.errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(item: CatalogueItem) {
    setError("");
    setNotice("");
    try {
      await catalogueItemService.updateStatus(item.id, !item.isActive);
      setNotice(`Catalogue item ${item.isActive ? "deactivated" : "activated"}.`);
      await loadItems();
    } catch (err) {
      setError(catalogueItemService.errorMessage(err));
    }
  }

  async function handleDelete(item: CatalogueItem) {
    if (!window.confirm(`Delete catalogue item "${item.name}"?`)) return;
    setError("");
    setNotice("");
    try {
      await catalogueItemService.delete(item.id);
      setNotice("Catalogue item deleted successfully.");
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await loadItems();
    } catch (err) {
      setError(catalogueItemService.errorMessage(err));
    }
  }

  const formCategories = categories.filter((category) => category.disciplineId === form.disciplineId);

  return (
    <main className="catalogue-items-page">
      <div className="catalogue-items-heading">
        <div>
          <p className="catalogue-items-eyebrow">ENGINEERING FOUNDATION</p>
          <h1>Global BOQ Catalogue</h1>
          <p className="catalogue-items-subtitle">Manage reusable materials, equipment, specifications, and wastage defaults.</p>
        </div>
        <BaseButton onClick={openCreate} leftIcon={<Plus size={16} />}>Add Catalogue Item</BaseButton>
      </div>

      {notice && <div className="catalogue-items-notice" role="status">{notice}</div>}
      {error && <div className="catalogue-items-error" role="alert">{error}</div>}

      <div className="catalogue-items-toolbar">
        <div className="catalogue-items-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search item name or code..." aria-label="Search catalogue items" /></div>
        <select value={disciplineFilter} onChange={(event) => { setDisciplineFilter(event.target.value); setPage(1); }} aria-label="Filter by discipline">
          <option value="">All disciplines</option>
          {disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}
        </select>
      </div>

      <section className="catalogue-items-card">
        <div className="catalogue-items-card-heading"><div><h2>Catalogue Items</h2><p>{total} item{total === 1 ? "" : "s"} in the global catalogue</p></div></div>
        <div className="catalogue-items-table-wrap">
          <table className="catalogue-items-table">
            <thead><tr><th>Item</th><th>Code</th><th>Discipline</th><th>Category</th><th>Unit</th><th>Wastage</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="catalogue-items-empty">Loading catalogue items...</td></tr> : items.length === 0 ? <tr><td colSpan={8} className="catalogue-items-empty">No catalogue items found.</td></tr> : items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</td>
                  <td>{item.code || "—"}</td>
                  <td>{item.discipline?.name ?? disciplines.find((value) => value.id === item.disciplineId)?.name ?? "—"}</td>
                  <td>{item.category?.name ?? categories.find((value) => value.id === item.categoryId)?.name ?? "—"}</td>
                  <td>{item.unit ? `${item.unit.name} (${item.unit.symbol})` : units.find((value) => value.id === item.unitId)?.symbol ?? "—"}</td>
                  <td>{item.defaultWastagePercent == null ? "—" : `${item.defaultWastagePercent}%`}</td>
                  <td><span className={`catalogue-items-status ${item.isActive ? "is-active" : "is-inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                  <td><div className="catalogue-items-actions">
                    <button type="button" title="Edit item" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}><Edit3 size={16} /></button>
                    <button type="button" title={item.isActive ? "Deactivate item" : "Activate item"} aria-label={item.isActive ? `Deactivate ${item.name}` : `Activate ${item.name}`} onClick={() => void handleStatus(item)}>{item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                    <button type="button" className="delete-action" title="Delete item" aria-label={`Delete ${item.name}`} onClick={() => void handleDelete(item)}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="catalogue-items-pagination"><span>Page {page} of {totalPages}</span><div><BaseButton variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</BaseButton><BaseButton variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>Next</BaseButton></div></div>
      </section>

      {modalOpen && <div className="catalogue-items-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="catalogue-items-modal" role="dialog" aria-modal="true" aria-labelledby="catalogue-items-modal-title">
          <div className="catalogue-items-modal-heading"><div><h2 id="catalogue-items-modal-title">{editing ? "Edit Catalogue Item" : "Create Catalogue Item"}</h2><p>Enter the item details below.</p></div><button type="button" aria-label="Close dialog" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
          <form onSubmit={(event) => void handleSubmit(event)}>
            <label className="catalogue-items-field-label">Discipline<select required value={form.disciplineId || ""} onChange={(event) => { const disciplineId = Number(event.target.value); const firstCategory = categories.find((category) => category.disciplineId === disciplineId); setForm({ ...form, disciplineId, categoryId: firstCategory?.id ?? 0 }); }}><option value="">Select discipline</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label>
            <label className="catalogue-items-field-label">Category<select required value={form.categoryId || ""} onChange={(event) => setForm({ ...form, categoryId: Number(event.target.value) })}><option value="">Select category</option>{formCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="catalogue-items-field-label">Unit<select required value={form.unitId || ""} onChange={(event) => setForm({ ...form, unitId: Number(event.target.value) })}><option value="">Select unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></label>
            <BaseInput label="Item name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Carbon Steel Pipe DN50" required />
            <BaseInput label="Code (optional)" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="e.g. ME-PIP-001" />
            <BaseInput label="Default wastage (%)" type="number" value={form.defaultWastagePercent ?? ""} onChange={(event) => setForm({ ...form, defaultWastagePercent: event.target.value === "" ? null : Number(event.target.value) })} min="0" max="100" step="0.01" />
            <label className="catalogue-items-field-label">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Optional description" /></label>
            <label className="catalogue-items-field-label">Specification (optional JSON)<textarea value={specificationText} onChange={(event) => setSpecificationText(event.target.value)} rows={4} placeholder={'{\n  "materialGrade": "ASTM A106 Grade B",\n  "nominalDiameter": "DN50"\n}'} /></label>
            <p className="catalogue-items-help">Leave the specification empty if you do not need extra technical details.</p>
            <div className="catalogue-items-modal-actions"><BaseButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</BaseButton><BaseButton type="submit" loading={saving}>{editing ? "Save Changes" : "Create Item"}</BaseButton></div>
          </form>
        </section>
      </div>}
    </main>
  );
}
