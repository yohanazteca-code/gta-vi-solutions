
export default function MissionsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* Animated GIF background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/gta-gifs/missionspage.gif')",
        }}
      />

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 z-0 bg-black/65" />

      {/* Page content */}
      <div className="relative z-10 px-8 py-12">
        <a
          href="/spatial"
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          ← Back to Leonida
        </a>

        <div className="mx-auto mt-16 max-w-6xl">
          <p className="mb-3 text-sm uppercase tracking-[0.4em] text-purple-400">
            GTA VI • Leonida
          </p>

          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
            MISSIONS
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            Explore story missions, side activities, and challenges
            throughout Leonida.
          </p>

          {/* Mission categories */}
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              "Story Missions",
              "Side Missions",
              "Activities & Challenges",
            ].map((category) => (
              <div
                key={category}
                className="rounded-xl border border-white/20 bg-black/45 p-8 backdrop-blur-sm transition hover:border-purple-400"
              >
                <h2 className="text-xl font-semibold">
                  {category}
                </h2>

                <p className="mt-3 text-sm text-gray-300">
                  Mission information coming soon.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
