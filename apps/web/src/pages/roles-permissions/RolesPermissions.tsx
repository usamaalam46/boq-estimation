import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, RefreshCw, Save } from "lucide-react";
import api from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import "./RolesPermissions.css";

type Scope = "platform" | "organization";

type Permission = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  scope: Scope;
};

type Role = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  scope: Scope;
  isSystem: boolean;
  memberCount?: number;
  permissions: Permission[];
};

type Organization = {
  id: number;
  name: string;
  slug?: string;
};

function toCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getError(error: unknown) {
  const e = error as { response?: { data?: { message?: string } } };
  return (
    e?.response?.data?.message ??
    (error instanceof Error ? error.message : "Request failed.")
  );
}

function getArray<T>(response: any): T[] {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.organizations))
    return response.data.organizations;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export default function RolesPermissions() {
  const user = useAuthStore((s) => s.user);
  const hasOrganizationPermission = useAuthStore(
    (s) => s.hasOrganizationPermission
  );
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  const memberships = user?.memberships ?? [];
  const [scope, setScope] = useState<Scope>(
    isSuperAdmin ? "platform" : "organization"
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<number | "">(
    memberships.find((membership) => hasOrganizationPermission(membership.organization.id, "organization.roles.manage"))?.organization.id ?? ""
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    []
  );
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const canManagePlatform = isSuperAdmin;
  const canManageSelectedOrganization =
    isSuperAdmin ||
    (typeof organizationId === "number" &&
      hasOrganizationPermission(organizationId, "organization.roles.manage"));

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const availableOrganizations = useMemo(() => {
    // Organization users can only select organizations where they have a membership.
    if (!isSuperAdmin) {
      return memberships
        .filter((membership) =>
          hasOrganizationPermission(
            membership.organization.id,
            "organization.roles.manage"
          )
        )
        .map((membership) => membership.organization);
    }
    return organizations;
  }, [isSuperAdmin, memberships, organizations, hasOrganizationPermission]);

  const grouped = useMemo(
    () =>
      permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
        const split = permission.code.split(".");
        const moduleName = split.slice(0, -1).join(".");
        (groups[moduleName] ??= []).push(permission);
        return groups;
      }, {}),
    [permissions]
  );

  // Super Admin needs the organization list for the organization-scope dropdown.
  useEffect(() => {
    if (!isSuperAdmin) return;

    let cancelled = false;
    api
      .get("/organization")
      .then((response) => {
        if (!cancelled) {
          const rows = getArray<Organization>(response);
          setOrganizations(rows);

          setOrganizationId((current) => {
            if (
              typeof current === "number" &&
              rows.some((org) => org.id === current)
            ) {
              return current;
            }
            return rows[0]?.id ?? "";
          });
        }
      })
      .catch((error) => {
        if (!cancelled)
          setNotice(`Unable to load organizations: ${getError(error)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  // If the signed-in user has no membership selected, choose their first organization.
  useEffect(() => {
    if (isSuperAdmin || typeof organizationId === "number") return;
    setOrganizationId(memberships.find((membership) => hasOrganizationPermission(membership.organization.id, "organization.roles.manage"))?.organization.id ?? "");
  }, [isSuperAdmin, organizationId, memberships, hasOrganizationPermission]);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice("");

    try {
      let roleUrl: string;
      let permissionUrl: string;

      if (scope === "platform") {
        if (!canManagePlatform) {
          throw new Error("Only a Super Admin can manage platform roles.");
        }
        roleUrl = "/roles-premission/platform";
        permissionUrl = "/roles-premission/platform/permissions";
      } else {
        const id = Number(organizationId);
        if (!Number.isSafeInteger(id) || id <= 0) {
          throw new Error("Select a valid organization.");
        }
        if (
          !isSuperAdmin &&
          !hasOrganizationPermission(id, "organization.roles.manage")
        ) {
          throw new Error("You cannot manage roles for this organization.");
        }
        roleUrl = `/roles-premission/organizations/${id}`;
        permissionUrl = `/roles-premission/organizations/${id}/permissions`;
      }

      const [roleResponse, permissionResponse] = await Promise.all([
        api.get(roleUrl),
        api.get(permissionUrl),
      ]);

      const nextRoles = getArray<Role>(roleResponse);
      const nextPermissions = getArray<Permission>(permissionResponse);

      setRoles(nextRoles);
      setPermissions(nextPermissions);

      // Select the first role after loading. This also keeps the load effect stable.
      const nextRole = nextRoles[0] ?? null;

      setSelectedRoleId(nextRole?.id ?? null);
      setSelectedPermissionIds(
        nextRole?.permissions.map((permission) => permission.id) ?? []
      );
    } catch (error) {
      setRoles([]);
      setPermissions([]);
      setSelectedRoleId(null);
      setSelectedPermissionIds([]);
      setNotice(getError(error));
    } finally {
      setLoading(false);
    }
  }, [
    scope,
    organizationId,
    canManagePlatform,
    isSuperAdmin,
    hasOrganizationPermission,
  ]);

  useEffect(() => {
    if (scope === "platform" && canManagePlatform) {
      void load();
      return;
    }

    if (
      scope === "organization" &&
      typeof organizationId === "number" &&
      canManageSelectedOrganization
    ) {
      void load();
      return;
    }

    setRoles([]);
    setPermissions([]);
    setSelectedRoleId(null);
    setSelectedPermissionIds([]);
    if (scope === "organization" && organizationId !== "") {
      setNotice(
        "You do not have permission to manage roles for this organization."
      );
    }
  }, [
    scope,
    organizationId,
    canManagePlatform,
    canManageSelectedOrganization,
    load,
  ]);

  function selectRole(role: Role) {
    setSelectedRoleId(role.id);
    setSelectedPermissionIds(
      role.permissions.map((permission) => permission.id)
    );
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    try {
      const payload = {
        name: roleName.trim(),
        code: toCode(roleCode || roleName),
        description: description.trim() || null,
        permissionIds: selectedPermissionIds,
      };

      if (scope === "platform") {
        if (!canManagePlatform)
          throw new Error("Only a Super Admin can create platform roles.");
        await api.post("/roles-premission/platform", payload);
      } else {
        const id = Number(organizationId);
        if (!Number.isSafeInteger(id) || id <= 0)
          throw new Error("Select a valid organization.");
        if (
          !isSuperAdmin &&
          !hasOrganizationPermission(id, "organization.roles.manage")
        ) {
          throw new Error("You cannot create roles for this organization.");
        }
        await api.post(`/roles-premission/organizations/${id}`, payload);
      }

      setRoleName("");
      setRoleCode("");
      setDescription("");
      setNotice("Role created with the selected permissions.");
      await load();
    } catch (error) {
      setNotice(getError(error));
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    if (!selectedRole) return;

    setSaving(true);
    setNotice("");

    try {
      if (scope === "platform") {
        if (!canManagePlatform)
          throw new Error("Only a Super Admin can update platform roles.");
        await api.put(`/roles-premission/platform/${selectedRole.id}/permissions`, {
          permissionIds: selectedPermissionIds,
        });
      } else {
        const id = Number(organizationId);
        if (!Number.isSafeInteger(id) || id <= 0)
          throw new Error("Select a valid organization.");
        if (
          !isSuperAdmin &&
          !hasOrganizationPermission(id, "organization.roles.manage")
        ) {
          throw new Error("You cannot update roles for this organization.");
        }
        await api.put(
          `/roles-premission/organizations/${id}/${selectedRole.id}/permissions`,
          {
            permissionIds: selectedPermissionIds,
          }
        );
      }

      setNotice("Permissions saved.");
      await load();
    } catch (error) {
      setNotice(getError(error));
    } finally {
      setSaving(false);
    }
  }

  const canManageCurrentScope =
    scope === "platform" ? canManagePlatform : canManageSelectedOrganization;

  return (
    <section className="rp-page">
      <header className="rp-heading">
        <div>
          <span>ACCESS CONTROL</span>
          <h1>Roles &amp; Permissions</h1>
          <p>
            Create roles and control which modules and actions they can access.
          </p>
        </div>
        <button
          className="rp-secondary"
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <div className="rp-toolbar">
        {isSuperAdmin && (
          <label>
            Role scope
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as Scope)}
            >
              <option value="platform">Platform</option>
              <option value="organization">Organization</option>
            </select>
          </label>
        )}

        {scope === "organization" && (
          <label>
            Organization
            <select
              value={organizationId}
              onChange={(event) =>
                setOrganizationId(
                  event.target.value ? Number(event.target.value) : ""
                )
              }
              disabled={!isSuperAdmin && availableOrganizations.length <= 1}
            >
              <option value="">Select organization</option>
              {availableOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} (ID: {organization.id})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="rp-scope-note">
          <ShieldCheck size={17} />
          {scope === "platform"
            ? "Platform roles and platform permissions"
            : "Organization roles are restricted to the selected organization"}
        </div>
      </div>

      {notice && (
        <div className="rp-notice" role="status">
          {notice}
        </div>
      )}

      {!canManageCurrentScope && (
        <div className="rp-warning">
          You do not have permission to manage roles in this scope.
        </div>
      )}

      <div className="rp-layout">
        <aside className="rp-card rp-role-panel">
          <h2>
            Roles <span>{roles.length}</span>
          </h2>

          {roles.map((role) => (
            <button
              type="button"
              key={role.id}
              onClick={() => selectRole(role)}
              className={`rp-role ${selectedRoleId === role.id ? "selected" : ""}`}
            >
              <span>
                <strong>{role.name}</strong>
                <small>{role.code}</small>
              </span>
              <em>{role.isSystem ? "System" : "Custom"}</em>
            </button>
          ))}

          {!roles.length && (
            <p className="rp-muted">
              {loading ? "Loading roles..." : "No roles found."}
            </p>
          )}

          <form className="rp-create-form" onSubmit={createRole}>
            <h3>
              <Plus size={16} /> Create custom role
            </h3>

            <label>
              Role name
              <input
                required
                value={roleName}
                onChange={(event) => {
                  setRoleName(event.target.value);
                  if (!roleCode) setRoleCode(toCode(event.target.value));
                }}
                placeholder="Cost Reviewer"
              />
            </label>

            <label>
              Role code
              <input
                required
                value={roleCode}
                onChange={(event) => setRoleCode(event.target.value)}
                placeholder="cost-reviewer"
              />
            </label>

            <label>
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
              />
            </label>

            <p className="rp-muted">
              Select permissions on the right before creating the role.
            </p>

            <button
              className="rp-primary"
              type="submit"
              disabled={
                saving ||
                !canManageCurrentScope ||
                !roleName.trim() ||
                (scope === "organization" && typeof organizationId !== "number")
              }
            >
              Create role
            </button>
          </form>
        </aside>

        <main className="rp-card rp-permission-panel">
          <div className="rp-permission-title">
            <div>
              <h2>{selectedRole?.name ?? "Select a role"}</h2>
              <p>Permissions are grouped by module.</p>
            </div>
            <button
              className="rp-primary"
              type="button"
              onClick={() => void savePermissions()}
              disabled={
                saving ||
                !canManageCurrentScope ||
                !selectedRole 
              }
            >
              <Save size={16} /> Save permissions
            </button>
          </div>

          {selectedRole?.isSystem && (
            <div className="rp-warning">
              You are editing a system role. Changes affect every user assigned
              to this role, so review the permissions carefully before saving.
            </div>
          )}

          {Object.entries(grouped).map(([moduleName, modulePermissions]) => (
            <section className="rp-module" key={moduleName}>
              <h3>
                {moduleName
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (character) => character.toUpperCase())}
              </h3>
              <div className="rp-permissions">
                {modulePermissions.map((permission) => (
                  <label className="rp-permission" key={permission.id}>
                    <input
                      type="checkbox"
                      checked={selectedPermissionIds.includes(permission.id)}
                      disabled={
                        !canManageCurrentScope ||
                        !selectedRole
                      }
                      onChange={(event) =>
                        setSelectedPermissionIds((ids) =>
                          event.target.checked
                            ? [...new Set([...ids, permission.id])]
                            : ids.filter((id) => id !== permission.id)
                        )
                      }
                    />
                    <span>
                      <strong>{permission.code.split(".").at(-1)}</strong>
                      <small>{permission.code}</small>
                      <small>{permission.description || permission.name}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </section>
  );
}
