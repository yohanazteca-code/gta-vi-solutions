"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Discovery = {
  id: string;
  type: "Mystery" | "Collectible";
  title: string;
  description: string | null;
  map_x: number;
  map_z: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};
type LeaderboardSubmission = {
  id: string;
  player_name: string;
  platform: string;
  category: string;
  achievement: string;
  score: string;
  evidence_url: string | null;
  evidence_storage_path: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "needs_evidence";
  created_at: string;
};
const ADMIN_UID = "8f7ed771-e1e3-41c8-b18e-be439c21eb8f";

export default function AdminPage() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
const [leaderboardSubmissions, setLeaderboardSubmissions] =
  useState<LeaderboardSubmission[]>([]);

const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user.id === ADMIN_UID) {
        setIsAdmin(true);
      }

      setSessionLoading(false);
    }

    checkSession();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setIsAdmin(session?.user.id === ADMIN_UID);
      });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Login failed: " + error.message);
      return;
    }

    if (data.user.id !== ADMIN_UID) {
      await supabase.auth.signOut();
      setMessage("This account is not authorized as administrator.");
      return;
    }

    setIsAdmin(true);
    setPassword("");
  }

  async function loadDiscoveries() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("discoveries")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Could not load submissions: " + error.message);
    } else {
      setDiscoveries(data ?? []);
    }

    setLoading(false);
  }

  async function loadLeaderboardSubmissions() {
  setLeaderboardLoading(true);

  const { data, error } = await supabase
    .from("leaderboard_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    setMessage("Could not load leaderboard submissions: " + error.message);
  } else {
    setLeaderboardSubmissions(data ?? []);
  }

  setLeaderboardLoading(false);
}

  async function updateStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id !== ADMIN_UID) {
      setIsAdmin(false);
      setMessage("Administrator authorization required.");
      return;
    }

    const { error } = await supabase
      .from("discoveries")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending");

    if (error) {
      setMessage("Update failed: " + error.message);
      return;
    }

    setMessage(`Discovery ${status}.`);
    await loadDiscoveries();
  }
async function updateLeaderboardStatus(
  id: string,
  status: "approved" | "rejected"
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_UID) {
    setIsAdmin(false);
    setMessage("Administrator authorization required.");
    return;
  }

  const { error } = await supabase
    .from("leaderboard_submissions")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    setMessage("Leaderboard update failed: " + error.message);
    return;
  }

  setMessage(`Leaderboard submission ${status}.`);
  await loadLeaderboardSubmissions();
}
  async function signOut() {
    await supabase.auth.signOut();
    setDiscoveries([]);
    setIsAdmin(false);
    setMessage("");
  }

  useEffect(() => {
  if (isAdmin) {
    loadDiscoveries();
    loadLeaderboardSubmissions();
  }
}, [isAdmin]);

  if (sessionLoading) {
    return <main style={{ background: "#07110c", color: "white", minHeight: "100vh", padding: 32 }}>Checking administrator access...</main>;
  }

  if (!isAdmin) {
    return (
      <main style={{ minHeight: "100vh", background: "#07110c", color: "#e2e8f0", display: "grid", placeItems: "center", padding: 20 }}>
        <form onSubmit={signIn} style={{ width: "100%", maxWidth: 380, padding: 28, background: "#102019", borderRadius: 14 }}>
          <h1 style={{ color: "#86efac" }}>GTA VI Admin Login</h1>
          <p>Sign in with your administrator account.</p>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Administrator email"
            required
            style={{ width: "100%", padding: 12, marginBottom: 12, boxSizing: "border-box" }}
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            style={{ width: "100%", padding: 12, marginBottom: 12, boxSizing: "border-box" }}
          />

          <button type="submit" style={{ width: "100%", padding: 12, background: "#166534", color: "white", border: 0, borderRadius: 8, cursor: "pointer" }}>
            Sign In
          </button>

          {message && <p>{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07110c", color: "#e2e8f0", padding: 32 }}>
      <h1 style={{ color: "#86efac" }}>GTA VI — Admin Dashboard</h1>
      <p>Review player-submitted discoveries.</p>
<section style={{ marginTop: 40 }}>
  <h2 style={{ color: "#86efac", fontSize: 24 }}>
    Leaderboard Submissions
  </h2>

  <p>
    Pending records: {leaderboardSubmissions.length}
  </p>

  <button
    type="button"
    onClick={loadLeaderboardSubmissions}
    style={{
      padding: 10,
      background: "#166534",
      color: "white",
      border: 0,
      borderRadius: 8,
      marginBottom: 20,
    }}
  >
    Refresh Leaderboards
  </button>

  {leaderboardLoading ? (
    <p>Loading leaderboard submissions...</p>
  ) : leaderboardSubmissions.length === 0 ? (
    <p>No pending leaderboard submissions.</p>
  ) : (
    <div style={{ display: "grid", gap: 16 }}>
      {leaderboardSubmissions.map((submission) => (
        <article
          key={submission.id}
          style={{
            padding: 20,
            borderRadius: 12,
            background: "#102019",
            border: "1px solid rgba(100,255,150,0.25)",
          }}
        >
          <h3>{submission.player_name}</h3>
          <p>Platform: {submission.platform}</p>
          <p>Category: {submission.category}</p>
          <p>Achievement: {submission.achievement}</p>
          <p>Score: {submission.score}</p>
          <p>Notes: {submission.notes || "None"}</p>
          <p>
            Submitted: {new Date(submission.created_at).toLocaleString()}
          </p>

          {submission.evidence_url && (
            <p>
              <a
                href={submission.evidence_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#86efac" }}
              >
                View Evidence
              </a>
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => updateLeaderboardStatus(submission.id, "approved")}
              style={{
                padding: 10,
                background: "#166534",
                color: "white",
                border: 0,
                borderRadius: 8,
              }}
            >
              Approve
            </button>

            <button
              type="button"
              onClick={() => updateLeaderboardStatus(submission.id, "rejected")}
              style={{
                padding: 10,
                background: "#991b1b",
                color: "white",
                border: 0,
                borderRadius: 8,
              }}
            >
              Reject
            </button>
          </div>
        </article>
      ))}
    </div>
  )}
</section>
      <button type="button" onClick={loadDiscoveries} style={{ padding: 10, marginRight: 10, background: "#166534", color: "white", border: 0, borderRadius: 8 }}>
        Refresh Submissions
      </button>

      <button type="button" onClick={signOut} style={{ padding: 10, background: "#334155", color: "white", border: 0, borderRadius: 8 }}>
        Sign Out
      </button>

      {message && <p>{message}</p>}

      {loading ? (
        <p>Loading submissions...</p>
      ) : discoveries.length === 0 ? (
        <p>No pending discoveries right now.</p>
      ) : (
        <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
          {discoveries.map((discovery) => (
            <article key={discovery.id} style={{ padding: 20, borderRadius: 12, background: "#102019", border: "1px solid rgba(100,255,150,0.25)" }}>
              <h2>{discovery.title}</h2>
              <p>Category: {discovery.type}</p>
              <p>{discovery.description || "No description"}</p>
              <p>Map position: X {discovery.map_x}, Z {discovery.map_z}</p>
              <p>Submitted: {new Date(discovery.created_at).toLocaleString()}</p>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => updateStatus(discovery.id, "approved")} style={{ padding: 10, background: "#166534", color: "white", border: 0, borderRadius: 8 }}>
                  Approve
                </button>
                <button type="button" onClick={() => updateStatus(discovery.id, "rejected")} style={{ padding: 10, background: "#991b1b", color: "white", border: 0, borderRadius: 8 }}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}