import { useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, Search, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import BaseButton from "../../components/ui/BaseButton";
import BaseInput from "../../components/ui/BaseInput";
import unitService from "../../services/unit.service";
import type { Unit, UnitFormData } from "../../types/unit";
import "./Units.css";

const PAGE_SIZE = 10;
const EMPTY_FORM: UnitFormData = {
  name: "",
  symbol: "",
  description: "",
  dimension: "",
};

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState<UnitFormData>(EMPTY_FORM);

  async function loadUnits() {
    setLoading(true);
    setError("");
    try {
      const result = await unitService.list({
        page,
        limit: PAGE_SIZE,
        ...(search ? { search } : {}),
      });
      setUnits(result.data);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (err) {
      setError(unitService.errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUnits();
  }, [page, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditing(unit);
    setForm({
      name: unit.name,
      symbol: unit.symbol,
      description: unit.description ?? "",
      dimension: unit.dimension ?? "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const data: UnitFormData = {
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      description: form.description.trim(),
      dimension: form.dimension.trim(),
    };

    try {
      if (editing) {
        await unitService.update(editing.id, data);
        setNotice("Unit updated successfully.");
      } else {
        await unitService.create(data);
        setNotice("Unit created successfully.");
        setPage(1);
      }
      setModalOpen(false);
      await loadUnits();
    } catch (err) {
      setError(unitService.errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(unit: Unit) {
    setError("");
    setNotice("");
    try {
      await unitService.updateStatus(unit.id, !unit.isActive);
      setNotice(`Unit ${unit.isActive ? "deactivated" : "activated"} successfully.`);
      await loadUnits();
    } catch (err) {
      setError(unitService.errorMessage(err));
    }
  }

  async function handleDelete(unit: Unit) {
    if (!window.confirm(`Delete the unit "${unit.name}" (${unit.symbol})?`)) return;
    setError("");
    setNotice("");
    try {
      await unitService.delete(unit.id);
      setNotice("Unit deleted successfully.");
      if (units.length === 1 && page > 1) setPage(page - 1);
      else await loadUnits();
    } catch (err) {
      setError(unitService.errorMessage(err));
    }
  }

  return (
    <main className="units-page">
      <div className="units-heading">
        <div>
          <p className="units-eyebrow">BOQ FOUNDATION</p>
          <h1>Units of Measurement</h1>
          <p className="units-subtitle">Manage the measurement units used by catalogue items and estimates.</p>
        </div>
        <BaseButton onClick={openCreate} leftIcon={<Plus size={16} />}>Add Unit</BaseButton>
      </div>

      {notice && <div className="units-notice" role="status">{notice}</div>}
      {error && <div className="units-error" role="alert">{error}</div>}

      <div className="units-toolbar">
        <div className="units-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search by unit name or symbol..."
            aria-label="Search units"
          />
        </div>
      </div>

      <section className="units-card">
        <div className="units-card-heading">
          <div><h2>Measurement Units</h2><p>{total} unit{total === 1 ? "" : "s"} in your catalogue</p></div>
        </div>
        <div className="units-table-wrap">
          <table className="units-table">
            <thead><tr><th>Unit</th><th>Symbol</th><th>Dimension</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="units-empty">Loading units...</td></tr>
              ) : units.length === 0 ? (
                <tr><td colSpan={6} className="units-empty">No units found. Add your first unit to get started.</td></tr>
              ) : units.map((unit) => (
                <tr key={unit.id}>
                  <td><strong>{unit.name}</strong></td>
                  <td><span className="units-symbol">{unit.symbol}</span></td>
                  <td>{unit.dimension || "—"}</td>
                  <td>{unit.description || "—"}</td>
                  <td><span className={`units-status ${unit.isActive ? "is-active" : "is-inactive"}`}>{unit.isActive ? "Active" : "Inactive"}</span></td>
                  <td><div className="units-actions">
                    <button type="button" title="Edit unit" aria-label={`Edit ${unit.name}`} onClick={() => openEdit(unit)}><Edit3 size={16} /></button>
                    <button type="button" title={unit.isActive ? "Deactivate unit" : "Activate unit"} aria-label={unit.isActive ? `Deactivate ${unit.name}` : `Activate ${unit.name}`} onClick={() => void handleStatus(unit)}>{unit.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
                    <button type="button" className="delete-action" title="Delete unit" aria-label={`Delete ${unit.name}`} onClick={() => void handleDelete(unit)}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="units-pagination">
          <span>Page {page} of {totalPages}</span>
          <div>
            <BaseButton variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</BaseButton>
            <BaseButton variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>Next</BaseButton>
          </div>
        </div>
      </section>

      {modalOpen && <div className="units-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="units-modal" role="dialog" aria-modal="true" aria-labelledby="units-modal-title">
          <div className="units-modal-heading"><div><h2 id="units-modal-title">{editing ? "Edit Unit" : "Create Unit"}</h2><p>Enter the measurement unit details below.</p></div><button type="button" aria-label="Close dialog" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
          <form onSubmit={(event) => void handleSubmit(event)}>
            <BaseInput label="Unit name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Kilogram" required />
            <BaseInput label="Symbol" value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} placeholder="e.g. kg" required />
            <BaseInput label="Dimension" value={form.dimension} onChange={(event) => setForm({ ...form, dimension: event.target.value })} placeholder="e.g. mass, length, area, volume" />
            <label className="units-field-label">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} placeholder="Optional description" /></label>
            <div className="units-modal-actions"><BaseButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</BaseButton><BaseButton type="submit" loading={saving}>{editing ? "Save Changes" : "Create Unit"}</BaseButton></div>
          </form>
        </section>
      </div>}
    </main>
  );
}
