"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";

const categories = [
  "All Activities",
  "Racing & Driving",
  "Combat & Weapons",
  "Police & Survival",
  "Exploration & Discovery",
  "Heists & Criminal Activities",
  "Aircraft & Watercraft",
  "Sports & Outdoor Activities",
  "Challenges & Miscellaneous",
  "Community Competitions",
];

export default function LeaderboardsPage() {
    const [submitting, setSubmitting] = useState(false);
const [message, setMessage] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setSubmitting(true);
  setMessage("");

  const form = event.currentTarget;
  const formData = new FormData(form);

  const { error } = await supabase
    .from("leaderboard_submissions")
    .insert({
      player_name: formData.get("player_name"),
      platform: formData.get("platform"),
      category: formData.get("category"),
      achievement: formData.get("achievement"),
      score: formData.get("score"),
      evidence_url: formData.get("evidence_url"),
      notes: formData.get("notes") || null,
    });

  setSubmitting(false);

  if (error) {
    console.error("SUPABASE ERROR:", error.message, error.details, error.hint);
setMessage(`Submission failed: ${error.message}`);
    return;
  }

  setMessage("Record submitted successfully! Awaiting admin review.");
  form.reset();
}
  const [category, setCategory] = useState("All Activities");
  const [period, setPeriod] = useState("All-Time");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070b] px-6 py-12 text-white">

  {/* Animated GIF background */}
  <div
    className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
    style={{
      backgroundImage: "url('/gta-gifs/leaderboardspage.gif')",
    }}
  />

  {/* Dark overlay */}
  <div className="pointer-events-none fixed inset-0 z-0 bg-black/70" />
      <div className="relative z-10 mx-auto max-w-7xl">

<Link
  href="/spatial"
  className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/60 px-5 py-3 font-mono text-xs font-bold tracking-widest text-cyan-300 backdrop-blur-md transition hover:border-cyan-400 hover:bg-cyan-400/10"
>
  <span aria-hidden="true">←</span>
  BACK TO LEONIDA
</Link>

        <div className="mb-12">
          <p className="mb-3 text-xs font-bold tracking-[0.4em] text-cyan-400">
            GTA(VI).SOLUTIONS
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            PLAYER LEADERBOARDS
          </h1>
          <p className="mt-4 max-w-2xl text-gray-400">
            Compete, prove your achievements, and earn your place among
            Leonida's top players.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {["Daily", "Weekly", "Monthly", "All-Time"].map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`rounded-lg border px-5 py-3 text-sm font-bold transition ${
                period === item
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-xs font-bold tracking-widest text-gray-400">
            ACTIVITY CATEGORY
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full max-w-md rounded-lg border border-white/10 bg-[#101722] px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-xl font-bold">TOP PLAYERS</h2>
          <p className="mt-3 text-sm text-gray-500">
            Rankings will appear here as verified player records are approved.
          </p>
        </section>

        
<section className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-8">
  <h2 className="text-xl font-bold">SUBMIT YOUR RECORD</h2>
  <p className="mt-3 text-sm text-gray-400">
    Submit your achievement and evidence for administrator review.
  </p>

  <form
  onSubmit={handleSubmit}
  className="mt-6 grid gap-5 md:grid-cols-2"
>
    <label className="grid gap-2 text-sm text-gray-300">
  Player Name
  <input
    required
    name="player_name"
    type="text"
    placeholder="Your player name"
    className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
  />
</label>

    <label className="grid gap-2 text-sm text-gray-300">
  Platform
  <select
    required
    name="platform"
    className="rounded-lg border border-white/10 bg-[#101722] px-4 py-3 text-white"
  >
    <option value="">Select platform</option>
    <option value="PlayStation">PlayStation</option>
    <option value="Xbox">Xbox</option>
    <option value="PC">PC</option>
  </select>
</label>

    <label className="grid gap-2 text-sm text-gray-300">
  Activity Category
  <select
    required
    name="category"
    className="rounded-lg border border-white/10 bg-[#101722] px-4 py-3 text-white"
  >
    {categories.slice(1).map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
</label>

    <label className="grid gap-2 text-sm text-gray-300">
  Record or Achievement
  <input
    required
    name="achievement"
    type="text"
    placeholder="Example: Longest drift"
    className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
  />
</label>
    <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
  Score or Completion Time
  <input
    required
    name="score"
    type="text"
    placeholder="Example: 2 minutes 34 seconds"
    className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
  />
</label>

   <label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
  Image or Video Proof
  <input
    name="evidence_file"
    type="file"
    accept="image/*,video/*"
    className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-400/20 file:px-3 file:py-2 file:text-cyan-300"
  />
  <span className="text-xs text-gray-500">
    Direct uploads will have file-size limits.
  </span>
</label>

<label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
  External Video Link (optional)
  <input
    name="evidence_url"
    type="url"
    placeholder="YouTube or other video link"
    className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
  />
</label>

<label className="grid gap-2 text-sm text-gray-300 md:col-span-2">
  Additional Notes
  <textarea
    name="notes"
    rows={3}
    placeholder="Explain your achievement..."
    className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
  />
</label>

<button
  type="submit"
  disabled={submitting}
  className="rounded-lg bg-cyan-400 px-6 py-3 font-black tracking-widest text-black transition hover:bg-pink-400 disabled:opacity-50 md:col-span-2"
>
  {submitting ? "SUBMITTING..." : "SUBMIT FOR REVIEW"}
</button>
  </form>
</section>

      </div>
    </main>
  );
}