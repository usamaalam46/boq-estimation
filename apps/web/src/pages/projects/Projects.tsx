import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import projectsService, { type Project } from "../../services/project.service";
import "./Projects.css";

export default function Projects() {
  const [items, setItems] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  async function load() {
    setLoading(true);
    setError("");

    try {
      const r = await projectsService.list({
        search,
        page,
        pageSize: 10,
      });

      setItems(Array.isArray(r.items) ? r.items : []);
      setTotal(r.total ?? 0);
      setPages(Math.max(1, r.totalPages ?? 1));
    } catch (e) {
      setError(
        isAxiosError<{ message?: string }>(e)
          ? e.response?.data?.message || "Unable to load projects."
          : "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [search, page]);

  function open(project?: Project) {
    setEditing(project ?? null);

    setForm(
      project
        ? {
          name: project.name,
          code: project.code ?? "",
          description: project.description ?? "",
        }
        : { name: "", code: "", description: "" }
    );

    setError("");
    setModal(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const data = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
      };

      if (editing) {
        await projectsService.update(editing.id, data);
      } else {
        await projectsService.create(data);
      }

      setModal(false);
      setNotice(editing ? "Project updated." : "Project created.");

      await load();
    } catch (e) {
      setError(
        isAxiosError<{ message?: string }>(e)
          ? e.response?.data?.message || "Unable to save project."
          : "Unable to save project."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Project) {
    if (
      !confirm(`Delete "${p.name}"? Projects with estimates cannot be deleted.`)
    ) {
      return;
    }

    setError("");

    try {
      await projectsService.remove(p.id);
      setNotice("Project deleted.");

      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await load();
      }
    } catch (e) {
      setError(
        isAxiosError<{ message?: string }>(e)
          ? e.response?.data?.message || "Unable to delete project."
          : "Unable to delete project."
      );
    }
  }

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div>
          <span className="projects-eyebrow">WORKSPACE</span>
          <h1>Projects</h1>
          <p>Organize projects and keep estimates together.</p>
        </div>

        <button className="projects-primary" onClick={() => open()}>
          + New Project
        </button>
      </header>

      {error && (
        <div className="projects-alert error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="projects-alert success" role="status">
          {notice}
        </div>
      )}

      <section className="projects-panel">
        <div className="projects-toolbar">
          <div>
            <h2>All Projects</h2>
            <span>{total} projects</span>
          </div>

          <input
            aria-label="Search projects"
            placeholder="Search name or code…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="projects-empty">Loading…</div>
        ) : !items.length ? (
          <div className="projects-empty">
            <strong>No projects found</strong>
            <p>Create a project to get started.</p>
          </div>
        ) : (
          <div className="projects-table-wrap">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Code</th>
                  <th>Estimates</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description && <small>{p.description}</small>}
                    </td>

                    <td>{p.code || "—"}</td>
                    <td>{p._count?.estimates ?? 0}</td>
                    <td>{new Date(p.updatedAt).toLocaleDateString()}</td>

                    <td className="project-actions">
                      <button onClick={() => open(p)}>Edit</button>
                      <button className="danger" onClick={() => void remove(p)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="projects-pagination">
          <span>
            Page {page} of {pages}
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </button>

            <button
              disabled={page >= pages || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {modal && (
        <div
          className="projects-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <section className="projects-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="projects-eyebrow">PROJECT DETAILS</span>
                <h2>{editing ? "Edit Project" : "Create Project"}</h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setModal(false)}
              >
                ×
              </button>
            </header>

            <form onSubmit={(e) => void submit(e)}>
              <label>
                Project name
                <input
                  required
                  maxLength={160}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label>
                Project code
                <input
                  maxLength={60}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>

              <div className="project-form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>

                <button className="projects-primary" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
