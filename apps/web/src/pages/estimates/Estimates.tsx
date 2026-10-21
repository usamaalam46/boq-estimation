
import { useCallback, useEffect, useState } from "react";
import "./Estimates.css";
import api from "../../api/axios";

type EstimateStatus = "draft" | "in_review" | "approved" | "archived";

interface Estimate {
    id: string;
    name: string;
    reference: string | null;
    status: EstimateStatus;
    currency: string;
    grandTotal: number | string;
    updatedAt: string;
    project: {
        id: string;
        name: string;
        code: string | null;
        organization: {
            id: string;
            name: string;
            slug: string;
        };
    };
    createdBy: {
        id: string;
        name: string;
        email: string;
    };
    _count: {
        sections: number;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface EstimateResponse {
    success: boolean;
    data: Estimate[];
    pagination: Pagination;
    message?: string;
}

const statusLabels: Record<EstimateStatus, string> = {
    draft: "Draft",
    in_review: "In Review",
    approved: "Approved",
    archived: "Archived",
};

function formatMoney(value: number | string, currency: string) {
    const amount = Number(value ?? 0);

    if (!Number.isFinite(amount)) return "—";

    try {
        return new Intl.NumberFormat("en", {
            style: "currency",
            currency: currency || "USD",
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency || ""} ${amount.toLocaleString()}`.trim();
    }
}

function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

export default function Estimates() {
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const loadEstimates = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get<EstimateResponse>("/estimates", {
                params: {
                    page,
                    limit: pagination.limit,
                    ...(search ? { search } : {}),
                    ...(status ? { status } : {}),
                },
            });

            const result = response.data;

            setEstimates(result.data ?? []);
            setPagination(
                result.pagination ?? {
                    page,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                }
            );
        } catch (err: unknown) {
            const message =
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
                    : "Unable to load estimates. Please try again.";

            setError(message);
            setEstimates([]);
        } finally {
            setLoading(false);
        }
    }, [page, pagination.limit, search, status]);

    useEffect(() => {
        void loadEstimates();
    }, [loadEstimates]);

    const firstRecord =
        pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const lastRecord = Math.min(
        pagination.page * pagination.limit,
        pagination.total
    );

    return (
        <div className="estimates-page">
            <div className="estimates-heading">
                <div>
                    <div className="estimates-eyebrow">PLATFORM MANAGEMENT</div>
                    <h1>Estimates</h1>
                    <p>View BOQ estimates created across all organizations.</p>
                </div>

                <button
                    type="button"
                    className="estimates-refresh"
                    onClick={() => void loadEstimates()}
                    disabled={loading}
                >
                    <span aria-hidden="true">↻</span>
                    Refresh
                </button>
            </div>

            <div className="estimates-stats">
                <div className="estimates-stat-card">
                    <span className="estimates-stat-icon">▤</span>
                    <div>
                        <span className="estimates-stat-label">Total estimates</span>
                        <strong>{pagination.total.toLocaleString()}</strong>
                    </div>
                </div>

                <div className="estimates-stat-card">
                    <span className="estimates-stat-icon estimates-icon-blue">◷</span>
                    <div>
                        <span className="estimates-stat-label">Current page</span>
                        <strong>
                            {pagination.totalPages === 0
                                ? "0"
                                : `${pagination.page} / ${pagination.totalPages}`}
                        </strong>
                    </div>
                </div>
            </div>

            <section className="estimates-panel">
                <div className="estimates-panel-heading">
                    <div>
                        <h2>All estimates</h2>
                        <p>Search and review estimates without modifying them.</p>
                    </div>
                    <span className="estimates-count">
                        {pagination.total.toLocaleString()} records
                    </span>
                </div>

                <div className="estimates-toolbar">
                    <div className="estimates-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search estimates, projects, organizations..."
                            aria-label="Search estimates"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter by status"
                        className="estimates-status-filter"
                    >
                        <option value="">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="in_review">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {error && (
                    <div className="estimates-error" role="alert">
                        <span>{error}</span>
                        <button type="button" onClick={() => void loadEstimates()}>
                            Try again
                        </button>
                    </div>
                )}

                <div className="estimates-table-wrap">
                    <table className="estimates-table">
                        <thead>
                            <tr>
                                <th>Estimate</th>
                                <th>Organization</th>
                                <th>Project</th>
                                <th>Prepared by</th>
                                <th>Status</th>
                                <th className="estimates-amount-cell">Grand total</th>
                                <th>Last updated</th>
                                <th className="estimates-actions-heading">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="estimates-state">
                                        <span className="estimates-spinner" />
                                        Loading estimates...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="estimates-state">
                                        Estimates could not be loaded.
                                    </td>
                                </tr>
                            ) : estimates.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="estimates-state">
                                        <span className="estimates-empty-icon">▤</span>
                                        <strong>No estimates found</strong>
                                        <span>
                                            Try another search term or change the status filter.
                                        </span>
                                    </td>
                                </tr>
                            ) : (
                                estimates.map((estimate) => (
                                    <tr key={estimate.id}>
                                        <td>
                                            <div className="estimates-name">
                                                <span className="estimates-document-icon">▤</span>
                                                <div>
                                                    <strong>{estimate.name}</strong>
                                                    <span>
                                                        {estimate.reference || "No reference"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="estimates-organization">
                                                {estimate.project?.organization?.name || "—"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="estimates-project">
                                                <span>{estimate.project?.name || "—"}</span>
                                                {estimate.project?.code && (
                                                    <small>{estimate.project.code}</small>
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="estimates-creator">
                                                <span className="estimates-avatar">
                                                    {(estimate.createdBy?.name || "?")
                                                        .trim()
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                                <span>{estimate.createdBy?.name || "—"}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className={`estimate-status estimate-status-${estimate.status}`}
                                            >
                                                <span className="estimate-status-dot" />
                                                {statusLabels[estimate.status] || estimate.status}
                                            </span>
                                        </td>

                                        <td className="estimates-amount-cell">
                                            <strong>
                                                {formatMoney(estimate.grandTotal, estimate.currency)}
                                            </strong>
                                        </td>

                                        <td>
                                            <span className="estimates-date">
                                                {formatDate(estimate.updatedAt)}
                                            </span>
                                        </td>
                                        <td className="estimates-actions-cell">
                                            <button
                                                type="button"
                                                className="estimates-edit-button"
                                                onClick={() => {
                                                    window.location.href = `/estimates/${estimate.id}/edit`;
                                                }}
                                                aria-label={`Edit estimate ${estimate.name}`}
                                            >
                                                <span aria-hidden="true">✎</span>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="estimates-pagination">
                    <span>
                        Showing <strong>{firstRecord}–{lastRecord}</strong> of{" "}
                        <strong>{pagination.total}</strong> estimates
                    </span>

                    <div className="estimates-pagination-actions">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={loading || page <= 1}
                        >
                            Previous
                        </button>

                        <span className="estimates-page-number">{page}</span>

                        <button
                            type="button"
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(pagination.totalPages, current + 1)
                                )
                            }
                            disabled={
                                loading ||
                                pagination.totalPages === 0 ||
                                page >= pagination.totalPages
                            }
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
