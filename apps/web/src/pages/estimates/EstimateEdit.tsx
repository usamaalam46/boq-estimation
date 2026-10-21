
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import "./EstimateBuilder.css";
import "./Addons.css";
import "./EstimateEdit.css";

type BoqItem = {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  wastagePercent: number;
  unitId?: number;
  catalogueItemId?: number | null;
  remarks?: string | null;
};

type BoqSection = {
  id: string;
  name: string;
  items: BoqItem[];
};

type EstimateStatus = "draft" | "in_review" | "approved" | "archived";

 type Project = {
  id: number;
  name: string;
  code?: string | null;
};

const newItem = (): BoqItem => ({
  id: crypto.randomUUID(),
  code: "",
  description: "",
  unit: "pcs",
  quantity: 1,
  rate: 0,
  wastagePercent: 0,
});

const newSection = (name = "New section"): BoqSection => ({
  id: crypto.randomUUID(),
  name,
  items: [newItem()],
});

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export default function EstimateEdit() {
  const navigate = useNavigate();
  const { estimateId: estimateIdParam } = useParams<{ estimateId: string }>();
  const estimateId = estimateIdParam ? Number(estimateIdParam) : null;
  const isEditMode = Number.isSafeInteger(estimateId) && Number(estimateId) > 0;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [status, setStatus] = useState<EstimateStatus>("draft");
  const [contingencyPercent, setContingencyPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [sections, setSections] = useState<BoqSection[]>([
    newSection("General works"),
  ]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingEstimate, setLoadingEstimate] = useState(Boolean(estimateIdParam));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const response = await api.get("/projects", { params: { page: 1, pageSize: 100 } });
        const result = response.data;
        const list = Array.isArray(result) ? result
          : Array.isArray(result?.data?.items) ? result.data.items
          : Array.isArray(result?.data) ? result.data
          : Array.isArray(result?.items) ? result.items
          : null;
        if (!list) throw new Error("Unexpected projects response.");
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) {
          setProjects([]);
          setError("Unable to load projects. Please check your projects API and access permissions.");
        }
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    }
    void loadProjects();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!estimateId || !isEditMode) {
      setLoadingEstimate(false);
      setError("A valid estimate ID is required to edit an estimate.");
      return;
    }

    let cancelled = false;
    async function loadEstimate() {
      setLoadingEstimate(true);
      setError("");
      try {
        const response = await api.get(`/estimates/${estimateId}`);
        const root = response.data?.data ?? response.data;
        if (!root || !Array.isArray(root.sections)) {
          throw new Error("The estimate response does not include its sections.");
        }
        if (cancelled) return;
        setProjectId(String(root.projectId ?? root.project?.id ?? ""));
        setName(root.name ?? "");
        setReference(root.reference ?? "");
        setDescription(root.description ?? "");
        setCurrency(root.currency ?? "PKR");
        setStatus((root.status ?? "draft") as EstimateStatus);
        setContingencyPercent(Number(root.contingencyPercent ?? 0));
        setTaxPercent(Number(root.taxPercent ?? 0));
        setSections(root.sections.map((section: any, sectionIndex: number) => ({
          id: `saved-section-${section.id ?? sectionIndex}`,
          name: section.name ?? `Section ${sectionIndex + 1}`,
          items: (section.items ?? []).map((item: any, itemIndex: number) => ({
            id: `saved-item-${item.id ?? `${sectionIndex}-${itemIndex}`}`,
            code: item.itemCode ?? item.code ?? "",
            description: item.description ?? "",
            unit: item.unitSymbol ?? item.unit?.symbol ?? "pcs",
            quantity: Number(item.quantity ?? 0),
            rate: Number(item.rate ?? 0),
            wastagePercent: Number(item.wastagePercent ?? 0),
            unitId: item.unitId ?? item.unit?.id,
            catalogueItemId: item.catalogueItemId ?? null,
            remarks: item.remarks ?? null,
          })),
        })));
      } catch (err: unknown) {
        const responseMessage =
          typeof err === "object" && err !== null && "response" in err &&
          typeof err.response === "object" && err.response !== null && "data" in err.response &&
          typeof err.response.data === "object" && err.response.data !== null &&
          "message" in err.response.data && typeof err.response.data.message === "string"
            ? err.response.data.message
            : err instanceof Error ? err.message : "Unable to load this estimate.";
        if (!cancelled) setError(responseMessage);
      } finally {
        if (!cancelled) setLoadingEstimate(false);
      }
    }
    void loadEstimate();
    return () => { cancelled = true; };
  }, [estimateId, isEditMode]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let wastageTotal = 0;

    for (const section of sections) {
      for (const item of section.items) {
        const base = Math.max(0, item.quantity) * Math.max(0, item.rate);
        subtotal += base;
        wastageTotal += base * Math.max(0, item.wastagePercent) / 100;
      }
    }

    const beforeContingency = subtotal + wastageTotal;
    const contingencyAmount =
      beforeContingency * Math.max(0, contingencyPercent) / 100;
    const taxAmount =
      (beforeContingency + contingencyAmount) *
      Math.max(0, taxPercent) / 100;

    return {
      subtotal,
      wastageTotal,
      contingencyAmount,
      taxAmount,
      grandTotal: beforeContingency + contingencyAmount + taxAmount,
    };
  }, [sections, contingencyPercent, taxPercent]);

  function updateSection(
    sectionId: string,
    updates: Partial<BoqSection>,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section,
      ),
    );
  }

  function updateItem(
    sectionId: string,
    itemId: string,
    updates: Partial<BoqItem>,
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item,
              ),
            }
          : section,
      ),
    );
  }

  function addItem(sectionId: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, newItem()] }
          : section,
      ),
    );
  }

  function duplicateItem(sectionId: string, itemId: string) {
    setSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const source = section.items.find((item) => item.id === itemId);
      if (!source) return section;
      const copy = { ...source, id: crypto.randomUUID() };
      const index = section.items.findIndex((item) => item.id === itemId);
      const items = [...section.items];
      items.splice(index + 1, 0, copy);
      return { ...section, items };
    }));
  }

  function duplicateSection(sectionId: string) {
    setSections((current) => {
      const source = current.find((section) => section.id === sectionId);
      if (!source) return current;
      const copy = { ...source, id: crypto.randomUUID(), name: `${source.name} (Copy)`, items: source.items.map((item) => ({ ...item, id: crypto.randomUUID() })) };
      const index = current.findIndex((section) => section.id === sectionId);
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function removeItem(sectionId: string, itemId: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.filter((item) => item.id !== itemId),
            }
          : section,
      ),
    );
  }

  function removeSection(sectionId: string) {
    setSections((current) =>
      current.filter((section) => section.id !== sectionId),
    );
  }

  async function saveDraft() {
    setError("");
    setSuccess("");

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter an estimate name.");
      return;
    }

    const hasEmptyDescription = sections.some((section) =>
      section.items.some((item) => !item.description.trim()),
    );

    if (hasEmptyDescription) {
      setError("Please enter a description for every BOQ item.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        projectId: Number(projectId),
        name: name.trim(),
        reference: reference.trim() || null,
        description: description.trim() || null,
        currency,
        status,
        contingencyPercent,
        taxPercent,
        ...totals,
        sections: sections.map((section, sectionIndex) => ({
          name: section.name.trim() || `Section ${sectionIndex + 1}`,
          sortOrder: sectionIndex,
          items: section.items.map((item, itemIndex) => ({
            itemCode: item.code.trim() || null,
            description: item.description.trim(),
            unitSymbol: item.unit.trim() || "pcs",
            ...(item.unitId ? { unitId: item.unitId } : {}),
            ...(item.catalogueItemId ? { catalogueItemId: item.catalogueItemId } : {}),
            remarks: item.remarks ?? null,
            quantity: item.quantity,
            rate: item.rate,
            wastagePercent: item.wastagePercent,
            amount:
              item.quantity *
              item.rate *
              (1 + item.wastagePercent / 100),
            sortOrder: itemIndex,
          })),
        })),
      };

      if (isEditMode && estimateId) {
        await api.put(`/estimates/${estimateId}`, payload);
        setSuccess("Estimate changes saved successfully.");
        window.setTimeout(() => navigate("/estimates"), 700);
      } else {
        await api.post("/estimates", payload);
        setSuccess("Draft saved successfully.");
      }
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : isEditMode
            ? "Unable to update the estimate. Please try again."
            : "Unable to save the draft. Please try again.";

      setError(responseMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="estimate-builder estimate-edit-page">
      <header className="eb-heading">
        <div>
          <div className="eb-eyebrow">ESTIMATES / EDIT</div>
          <h1>Edit estimate</h1>
          <p>Update the estimate details and BOQ line items. Update estimate details, BOQ items, and status.</p>
        </div>

        <div className="eb-heading-actions">
          <button
            className="eb-button eb-button-secondary"
            type="button"
            onClick={() => navigate("/estimates")}
          >
            Cancel
          </button>
          <button
            className="eb-button eb-button-primary"
            type="button"
            onClick={() => void saveDraft()}
            disabled={saving || loadingEstimate}
          >
            {saving ? (isEditMode ? "Saving..." : "Saving...") : (isEditMode ? "Save Changes" : "Save Draft")}
          </button>
        </div>
      </header>

      {loadingEstimate && <div className="eb-alert">Loading estimate details...</div>}
      {error && <div className="eb-alert eb-alert-error">{error}</div>}
      {success && <div className="eb-alert eb-alert-success">{success}</div>}

      <section className="eb-panel">
        <div className="eb-panel-heading">
          <div>
            <h2>Estimate information</h2>
            <p>Enter the project and document details.</p>
          </div>
          <span className={`eb-draft-badge eb-status-${status}`}>{status.replace("_", " ")} · Editing</span>
        </div>

        <div className="eb-form-grid">
          <label className="eb-field eb-field-wide">
            Estimate name <span>*</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mechanical Works — Phase 1"
            />
          </label>

          <label className="eb-field">
            Project <span>*</span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={loadingProjects}
            >
              <option value="">
                {loadingProjects ? "Loading projects..." : "Select a project"}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}{project.code ? ` (${project.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="eb-field">
            Reference
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. BOQ-MECH-001"
            />
          </label>

          <label className="eb-field">
            Currency
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="SAR">SAR — Saudi Riyal</option>
            </select>
          </label>

          <label className="eb-field">
            Estimate status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as EstimateStatus)}
            >
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="eb-field eb-field-wide">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Describe the scope of work..."
            />
          </label>
        </div>
      </section>

      <section className="eb-panel eb-boq-panel">
        <div className="eb-panel-heading">
          <div>
            <h2>Bill of quantities</h2>
            <p>Add work sections and enter quantities, rates, and wastage.</p>
          </div>
          <button
            className="eb-button eb-button-secondary"
            type="button"
            onClick={() =>
              setSections((current) => [
                ...current,
                newSection(`Section ${current.length + 1}`),
              ])
            }
          >
            + Add section
          </button>
        </div>

        {sections.map((section, sectionIndex) => {
          const sectionTotal = section.items.reduce(
            (sum, item) =>
              sum +
              item.quantity *
                item.rate *
                (1 + item.wastagePercent / 100),
            0,
          );

          return (
            <div className="eb-section" key={section.id}>
              <div className="eb-section-heading">
                <div className="eb-section-title">
                  <span className="eb-section-number">
                    {String(sectionIndex + 1).padStart(2, "0")}
                  </span>
                  <input
                    aria-label="Section name"
                    value={section.name}
                    onChange={(event) =>
                      updateSection(section.id, { name: event.target.value })
                    }
                  />
                </div>

                <div className="eb-section-actions">
                  <span>{money(sectionTotal, currency)}</span>
                  <button
                    type="button"
                    className="eb-text-button"
                    onClick={() => duplicateSection(section.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="eb-text-button eb-danger-text"
                    onClick={() => removeSection(section.id)}
                  >
                    Remove section
                  </button>
                </div>
              </div>

              <div className="eb-table-wrap">
                <table className="eb-table">
                  <thead>
                    <tr>
                      <th>Item code</th>
                      <th>Description</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Rate</th>
                      <th>Wastage %</th>
                      <th className="eb-right">Amount</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, itemIndex) => {
                      const amount =
                        item.quantity *
                        item.rate *
                        (1 + item.wastagePercent / 100);

                      return (
                        <tr key={item.id}>
                          <td>
                            <input
                              value={item.code}
                              onChange={(event) =>
                                updateItem(section.id, item.id, {
                                  code: event.target.value,
                                })
                              }
                              placeholder="Code"
                              aria-label={`Item ${itemIndex + 1} code`}
                            />
                          </td>
                          <td>
                            <input
                              value={item.description}
                              onChange={(event) =>
                                updateItem(section.id, item.id, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="Describe work or material"
                              aria-label={`Item ${itemIndex + 1} description`}
                              required
                            />
                          </td>
                          <td>
                            <input
                              value={item.unit}
                              onChange={(event) =>
                                updateItem(section.id, item.id, {
                                  unit: event.target.value,
                                })
                              }
                              aria-label={`Item ${itemIndex + 1} unit`}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(section.id, item.id, {
                                  quantity: Math.max(0, Number(event.target.value)),
                                })
                              }
                              aria-label={`Item ${itemIndex + 1} quantity`}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(event) =>
                                updateItem(section.id, item.id, {
                                  rate: Math.max(0, Number(event.target.value)),
                                })
                              }
                              aria-label={`Item ${itemIndex + 1} rate`}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.wastagePercent}
                              onChange={(event) =>
                                updateItem(section.id, item.id, {
                                  wastagePercent: Math.min(
                                    100,
                                    Math.max(0, Number(event.target.value)),
                                  ),
                                })
                              }
                              aria-label={`Item ${itemIndex + 1} wastage`}
                            />
                          </td>
                          <td className="eb-right eb-amount">
                            {money(amount, currency)}
                          </td>
                          <td>
                            <div className="eb-row-actions">
                            <button
                              type="button"
                              className="eb-copy-row"
                              aria-label="Duplicate item"
                              title="Duplicate item"
                              onClick={() => duplicateItem(section.id, item.id)}
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className="eb-remove-row"
                              aria-label="Remove item"
                              title="Remove item"
                              onClick={() => removeItem(section.id, item.id)}
                            >
                              ×
                            </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="eb-add-row"
                onClick={() => addItem(section.id)}
              >
                + Add BOQ item
              </button>
            </div>
          );
        })}

        {sections.length === 0 && (
          <div className="eb-empty">
            <strong>No BOQ sections yet</strong>
            <p>Add a section to start entering work items.</p>
          </div>
        )}
      </section>

      <div className="eb-bottom-grid">
        <section className="eb-panel eb-cost-panel">
          <h2>Additional costs</h2>
          <p>Set optional percentages for the estimate.</p>

          <label className="eb-field">
            Contingency (%)
            <input
              type="number"
              min="0"
              max="100"
              value={contingencyPercent}
              onChange={(event) =>
                setContingencyPercent(
                  Math.min(100, Math.max(0, Number(event.target.value))),
                )
              }
            />
          </label>

          <label className="eb-field">
            Tax (%)
            <input
              type="number"
              min="0"
              max="100"
              value={taxPercent}
              onChange={(event) =>
                setTaxPercent(
                  Math.min(100, Math.max(0, Number(event.target.value))),
                )
              }
            />
          </label>
        </section>

        <section className="eb-panel eb-summary-panel">
          <h2>Cost summary</h2>
          <div className="eb-summary-row">
            <span>Subtotal</span>
            <strong>{money(totals.subtotal, currency)}</strong>
          </div>
          <div className="eb-summary-row">
            <span>Wastage</span>
            <strong>{money(totals.wastageTotal, currency)}</strong>
          </div>
          <div className="eb-summary-row">
            <span>Contingency ({contingencyPercent}%)</span>
            <strong>{money(totals.contingencyAmount, currency)}</strong>
          </div>
          <div className="eb-summary-row">
            <span>Tax ({taxPercent}%)</span>
            <strong>{money(totals.taxAmount, currency)}</strong>
          </div>
          <div className="eb-summary-total">
            <span>Grand total</span>
            <strong>{money(totals.grandTotal, currency)}</strong>
          </div>
        </section>
      </div>

      <footer className="eb-footer">
        <span>Changes are not saved until you save the draft.</span>
        <div className="eb-heading-actions">
          <button
            type="button"
            className="eb-button eb-button-secondary"
            onClick={() => navigate("/estimates")}
          >
            Cancel
          </button>
          <button
            type="button"
            className="eb-button eb-button-primary"
            onClick={() => void saveDraft()}
            disabled={saving}
          >
            {saving ? (isEditMode ? "Saving..." : "Saving...") : (isEditMode ? "Save Changes" : "Save Draft")}
          </button>
        </div>
      </footer>
    </div>
  );
}
