
import { useMemo } from "react";
import {
    UserRound,
    Mail,
    ShieldCheck,
    Building2,
    CalendarDays,
} from "lucide-react";
import "./Profile.css";

interface StoredUser {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    platform_role?: string;
    organization?: string;
    organizationName?: string;
    createdAt?: string;
}

const TOKEN_KEY = "boq_access_token";

function readStoredUser(): StoredUser | null {
    const possibleKeys = ["boq_user", "user", "auth_user"];

    for (const key of possibleKeys) {
        const storedValue = localStorage.getItem(key);

        if (!storedValue) continue;

        try {
            const parsed = JSON.parse(storedValue);

            // Support both { user: {...} } and direct user objects.
            const user = parsed?.user ?? parsed;

            if (user && typeof user === "object") {
                return user as StoredUser;
            }
        } catch {
            console.warn(`Unable to parse user data from "${key}".`);
        }
    }

    return null;
}

export default function Profile() {
    const user = useMemo(() => readStoredUser(), []);

    const tokenExists = Boolean(localStorage.getItem(TOKEN_KEY));

    const displayName = user?.name?.trim() || "User";
    const initials =
        displayName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "U";

    const role =
        user?.platform_role ||
        user?.role ||
        "Organization User";

    const organization =
        user?.organizationName ||
        user?.organization ||
        "Not available";

    return (
        <div className="profile-page">
            <div className="profile-heading">
                <div>
                    <h1>My Profile</h1>
                    <p>View your account information.</p>
                </div>
            </div>

            <section className="profile-card">
                <div className="profile-banner" />

                <div className="profile-summary">
                    <div className="profile-avatar">{initials}</div>

                    <div className="profile-summary-info">
                        <h2>{displayName}</h2>
                        <p>{user?.email || "Email not available"}</p>
                        <span className="profile-status">
                            {tokenExists ? "Logged in" : "No login token"}
                        </span>
                    </div>
                </div>

                <div className="profile-details">
                    <h3>Account Information</h3>

                    <div className="profile-detail-grid">
                        <div className="profile-detail">
                            <div className="profile-detail-icon">
                                <UserRound size={19} />
                            </div>
                            <div>
                                <span>Full Name</span>
                                <strong>{displayName}</strong>
                            </div>
                        </div>

                        <div className="profile-detail">
                            <div className="profile-detail-icon">
                                <Mail size={19} />
                            </div>
                            <div>
                                <span>Email Address</span>
                                <strong>{user?.email || "Not available"}</strong>
                            </div>
                        </div>

                        <div className="profile-detail">
                            <div className="profile-detail-icon">
                                <ShieldCheck size={19} />
                            </div>
                            <div>
                                <span>Role</span>
                                <strong>{role}</strong>
                            </div>
                        </div>

                        <div className="profile-detail">
                            <div className="profile-detail-icon">
                                <Building2 size={19} />
                            </div>
                            <div>
                                <span>Organization</span>
                                <strong>{organization}</strong>
                            </div>
                        </div>

                        <div className="profile-detail">
                            <div className="profile-detail-icon">
                                <CalendarDays size={19} />
                            </div>
                            
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
