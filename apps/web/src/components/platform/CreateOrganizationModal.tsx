import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Organization, OrganizationFormValues } from "../../types/organization";

type CreateOrganizationModalProps = {
  onClose: () => void;
  onCreate: (organization: Organization) => void;
  existingOrganizations: Organization[];
};

const emptyForm: OrganizationFormValues = {
  name: "",
  slug: "",
  adminName: "",
  email: "",
};

export default function CreateOrganizationModal({
  onClose,
  onCreate,
  existingOrganizations,
}: CreateOrganizationModalProps) {
  const [form, setForm] = useState<OrganizationFormValues>(emptyForm);
  const [error, setError] = useState("");

  function updateField(field: keyof OrganizationFormValues, value: string) {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === "name") {
        updated.slug = value.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return updated;
    });
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase();
    const email = form.email.trim().toLowerCase();

    if (!name || !slug || !form.adminName.trim() || !email) {
      setError("Please complete all required fields.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Use lowercase letters, numbers and hyphens for the slug.");
      return;
    }
    if (existingOrganizations.some((item) =>
      item.slug === slug || item.email.toLowerCase() === email
    )) {
      setError("This slug or administrator email already exists in the demo.");
      return;
    }

    const organization: Organization = {
      id: Math.max(0, ...existingOrganizations.map((item) => item.id)) + 1,
      name,
      slug,
      admin: form.adminName.trim(),
      email,
      projects: 0,
      status: "Pending",
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
      }),
    };
    onCreate(organization);
  }

  return (
    <div
      className="app-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="create-organization-title">
        <div className="app-modal-heading">
          <div>
            <span className="app-eyebrow">PLATFORM MANAGEMENT</span>
            <h2 id="create-organization-title">Create organization</h2>
            <p>Register a company and its initial administrator.</p>
          </div>
          <button className="app-icon-button" aria-label="Close form" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="app-form-error" role="alert">{error}</div>}

        <form className="app-create-form" onSubmit={submit}>
          <div className="app-form-section-title">ORGANIZATION DETAILS</div>
          <div className="app-field">
            <label htmlFor="organization-name">Organization name <span>*</span></label>
            <input
              id="organization-name"
              required
              maxLength={120}
              placeholder="e.g. Apex Engineering"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>
          <div className="app-field">
            <label htmlFor="organization-slug">Organization slug <span>*</span></label>
            <input
              id="organization-slug"
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="apex-engineering"
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
            />
            <small>Unique URL-friendly identifier using lowercase letters, numbers and hyphens.</small>
          </div>

          <div className="app-form-section-title">INITIAL ORGANIZATION ADMIN</div>
          <div className="app-field">
            <label htmlFor="organization-admin">Administrator name <span>*</span></label>
            <input
              id="organization-admin"
              required
              maxLength={120}
              placeholder="Full name"
              value={form.adminName}
              onChange={(event) => updateField("adminName", event.target.value)}
            />
          </div>
          <div className="app-field">
            <label htmlFor="organization-email">Administrator email <span>*</span></label>
            <input
              id="organization-email"
              type="email"
              required
              maxLength={254}
              placeholder="admin@company.com"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <small>The backend will later create or invite this administrator.</small>
          </div>

          <div className="app-modal-actions">
            <button type="button" className="app-secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="app-primary-button"><Plus size={16} /> Add to demo</button>
          </div>
        </form>
      </section>
    </div>
  );
}
