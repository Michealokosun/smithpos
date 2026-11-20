import { FormEvent, useEffect, useState } from "react";
import {
  AuthUser,
  StaffUser,
  changePassword,
  createStaffUser,
  listUsers,
  login,
  logout,
  refreshSession,
} from "./api";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function LoginForm({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      onLogin(await login(email, password));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <p className="eyebrow">Retail POS</p>
      <h1 id="login-title">Sign in</h1>
      <p className="muted">Use the staff account provided by your manager.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Email
          <input
            autoComplete="username"
            autoFocus
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} type="submit">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}

function PasswordChangeForm({ onChanged }: { onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("The new passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="password-title">
      <p className="eyebrow">Account security</p>
      <h1 id="password-title">Change your password</h1>
      <p className="muted">
        Your manager gave you a temporary password. Set a new password to
        continue. Use at least 12 characters.
      </p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Current password
          <input
            autoComplete="current-password"
            required
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={12}
            required
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={12}
            required
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} type="submit">
          {busy ? "Saving..." : "Change password"}
        </button>
      </form>
    </section>
  );
}

function StaffManagement({ user }: { user: AuthUser }) {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "cashier">("cashier");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listUsers()
      .then((users) => {
        if (active) {
          setStaff(users);
          setError("");
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      const created = await createStaffUser({ name, email, password, role });
      setStaff((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setMessage(
        `Created ${created.name}. They must change the temporary password when they sign in.`,
      );
      setName("");
      setEmail("");
      setPassword("");
      setRole("cashier");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="staff-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Access management</p>
          <h2 id="staff-title">Staff accounts</h2>
        </div>
      </div>
      <form className="staff-form" onSubmit={submit}>
        <label>
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            autoComplete="off"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Temporary password
          <input
            autoComplete="new-password"
            minLength={12}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "manager" | "cashier")
            }
          >
            {user.role === "administrator" && (
              <option value="manager">Manager</option>
            )}
            <option value="cashier">Cashier</option>
          </select>
        </label>
        <button disabled={busy} type="submit">
          {busy ? "Creating..." : "Create account"}
        </button>
      </form>
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <h3>Current staff</h3>
      {loading ? (
        <p className="muted">Loading staff...</p>
      ) : (
        <ul className="staff-list">
          {staff.map((member) => (
            <li key={member.id}>
              <span>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </span>
              <span className="role-pill">{member.role}</span>
            </li>
          ))}
          {staff.length === 0 && (
            <li className="muted">No staff accounts yet.</li>
          )}
        </ul>
      )}
    </section>
  );
}

function Dashboard({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      await logout();
    } catch (caught) {
      setError(errorMessage(caught));
      return;
    }
    onLogout();
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Retail POS</p>
          <h1>Welcome, {user.name}</h1>
        </div>
        <button className="button-secondary" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <section className="panel welcome-panel">
        <p className="muted">
          Signed in as <strong>{user.email}</strong>
        </p>
        <span className="role-pill">{user.role}</span>
        <p className="muted">
          Authentication is ready. POS, catalog, and inventory workflows will be
          added in the next project steps.
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>
      {(user.role === "administrator" || user.role === "manager") && (
        <StaffManagement user={user} />
      )}
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((user) => {
        if (active) {
          setView(
            user ? { status: "authenticated", user } : { status: "anonymous" },
          );
        }
      })
      .catch((error: unknown) => {
        if (active) setView({ status: "error", message: errorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, []);

  if (view.status === "loading") {
    return (
      <main className="shell">
        <p role="status">Checking your session...</p>
      </main>
    );
  }
  if (view.status === "error") {
    return (
      <main className="shell">
        <section className="auth-card">
          <h1>Could not connect</h1>
          <p className="notice error" role="alert">
            {view.message}
          </p>
          <button onClick={() => window.location.reload()}>Try again</button>
        </section>
      </main>
    );
  }
  if (view.status === "anonymous") {
    return (
      <main className="shell">
        <LoginForm
          onLogin={(user) => setView({ status: "authenticated", user })}
        />
      </main>
    );
  }
  if (view.user.mustChangePassword) {
    return (
      <main className="shell">
        <PasswordChangeForm
          onChanged={() =>
            setView({
              status: "authenticated",
              user: { ...view.user, mustChangePassword: false },
            })
          }
        />
      </main>
    );
  }
  return (
    <Dashboard
      user={view.user}
      onLogout={() => setView({ status: "anonymous" })}
    />
  );
}
