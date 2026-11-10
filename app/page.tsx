
"use client";

import { useMemo, useState } from "react";
import "./globals.css";
import SpatialScene from "./spatial/SpatialScene";

const discoveries = [
  {
    id: 1,
    category: "Mysteries",
    title: "The Strange Swamp Signal",
    location: "Leonida Wetlands",
    description: "A community investigation into an unexplained signal.",
    status: "Unconfirmed",
    icon: "◉",
  },
  {
    id: 2,
    category: "Collectibles",
    title: "Coastal Point of Interest",
    location: "Southern Coast",
    description: "A sample location entry for the future discovery map.",
    status: "Community tip",
    icon: "◇",
  },
  {
    id: 3,
    category: "Missions",
    title: "Mission Walkthrough Hub",
    location: "Vice City",
    description: "Organize mission objectives, tips, and walkthroughs.",
    status: "Guide",
    icon: "▤",
  },
  {
    id: 4,
    category: "Vehicles",
    title: "Rare Vehicle Tracker",
    location: "Vice City",
    description: "A place to collect player-reported vehicle sightings.",
    status: "Community tip",
    icon: "▰",
  },
];

const categories = [
  "All Discoveries",
  "Mysteries",
  "Collectibles",
  "Missions",
  "Vehicles",
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Discoveries");
  const [selected, setSelected] = useState<number | null>(discoveries[0]?.id ?? null);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return discoveries.filter((item) => {
      const matchesCategory =
        category === "All Discoveries" || item.category === category;

      const matchesSearch =
        `${item.title} ${item.location} ${item.description} ${item.category}`
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const selectedDiscovery =
    filtered.find((item) => item.id === selected) ??
    discoveries.find((item) => item.id === selected) ??
    filtered[0] ??
    null;

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="GTA IV Solutions home">
          <span className="brand-symbol">G<span>IV</span></span>
          <span className="brand-name">
            GTA(IV).<strong>Solutions</strong>
            <small>THE COMMUNITY DISCOVERY PROJECT</small>
          </span>
        </a>

        <nav className="top-links">
          <a href="#explore">Explore</a>
          <a href="#guides">Wiki & Guides</a>
          <a href="#community">Community</a>
        </nav>

        <a className="submit-top" href="#community">+ Submit a find</a>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot" /> THE PLAYER-POWERED GUIDE</div>
          <h1>THE WORLD IS<br />FULL OF <span>SECRETS.</span></h1>
          <p className="hero-copy">
            Find what others miss. Solve what others can’t.
            Explore Leonida together.
          </p>

          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search secrets, missions, locations..."
              aria-label="Search discoveries"
            />
            <span className="search-hint">SEARCH</span>
          </div>

          <div className="hero-meta">
            <span>COMMUNITY KNOWLEDGE</span>
            <span className="meta-divider">/</span>
            <span>PLAYER DISCOVERIES</span>
            <span className="meta-divider">/</span>
            <span>YOUR NEXT LEAD</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Stylized fictional map illustration">
          <div className="art-grid" />
          <div className="radar-ring ring-one" />
          <div className="radar-ring ring-two" />
          <div className="radar-ring ring-three" />
          <div className="map-land land-one" />
          <div className="map-land land-two" />
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          <div className="map-road road-three" />
          <div className="map-label label-one">VICE CITY</div>
          <div className="map-label label-two">LEONIDA</div>
          <div className="map-pin pin-one"><span>01</span></div>
          <div className="map-pin pin-two"><span>02</span></div>
          <div className="map-pin pin-three"><span>03</span></div>
          <div className="coordinate">26°07' N — EXPLORATION MODE</div>
          <div className="art-caption">UNMAPPED DOESN'T MEAN UNDISCOVERED.</div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Community statistics">
        <div><strong>01</strong><span>COMMUNITY FIRST</span></div>
        <div><strong>∞</strong><span>THINGS TO DISCOVER</span></div>
        <div><strong>YOU</strong><span>ARE PART OF THE MAP</span></div>
        <div className="status-indicator"><span className="live-dot" /> DISCOVERY NETWORK ONLINE</div>
      </section>

      <section className="explore-section" id="explore">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR NEXT ADVENTURE STARTS HERE</div>
            <h2>EXPLORE THE <span>UNKNOWN.</span></h2>
          </div>
          <p>Every lead has a story.<br />Every player can help.</p>
        </div>

        <div className="category-row">
          {categories.map((item) => (
            <button
              key={item}
              className={`category-button ${category === item ? "active" : ""}`}
              onClick={() => setCategory(item)}
            >
              {item === "All Discoveries" ? "✳" : "↗"} {item}
            </button>
          ))}
        </div>

        <div className="content-grid">
          <div className="discovery-list">
            <div className="list-heading">
              <span>COMMUNITY INTEL</span>
              <span>{filtered.length.toString().padStart(2, "0")} RESULTS</span>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <span>⌕</span>
                <h3>NO LEADS FOUND</h3>
                <p>Try another search or category.</p>
                <button onClick={() => { setSearch(""); setCategory("All Discoveries"); }}>
                  Clear filters
                </button>
              </div>
            ) : filtered.map((item) => (
              <button
                key={item.id}
                className={`discovery-card ${selected === item.id ? "selected" : ""}`}
                onClick={() => setSelected(item.id)}
              >
                <span className="card-icon">{item.icon}</span>
                <span className="card-body">
                  <span className="card-category">{item.category.toUpperCase()}</span>
                  <strong>{item.title}</strong>
                  <span className="card-location">⌖ {item.location}</span>
                </span>
                <span className="card-arrow">↗</span>
              </button>
            ))}
          </div>

          <div className="map-panel">
            <div className="map-panel-top">
              <div>
                <span className="eyebrow">FIELD OVERVIEW</span>
                <h3>DISCOVERY ZONE</h3>
              </div>
              <span className="map-status">PREVIEW</span>
            </div>

            <div className="mini-map">
              <div className="mini-grid" />
              <div className="mini-land mini-land-one" />
              <div className="mini-land mini-land-two" />
              <div className="mini-water" />
              <div className="mini-road mini-road-one" />
              <div className="mini-road mini-road-two" />
              {discoveries.map((item, index) => (
                <button
                  key={item.id}
                  className={`mini-pin mini-pin-${index + 1} ${selected === item.id ? "pin-active" : ""}`}
                  onClick={() => setSelected(item.id)}
                  aria-label={`Select ${item.title}`}
                  title={item.title}
                >
                  {String(item.id).padStart(2, "0")}
                </button>
              ))}
              <div className="mini-map-label">LEONIDA / CONCEPT MAP</div>
            </div>

            <div className="map-legend">
              <span><i className="legend-dot" /> Community tips</span>
              <span><i className="legend-dot legend-green" /> Selected lead</span>
            </div>

            <div className="selected-info">
              <span className="eyebrow">SELECTED INTEL</span>
              {selectedDiscovery ? (
                <>
                  <h4>{selectedDiscovery.title}</h4>
                  <p>{selectedDiscovery.description}</p>
                  <div className="selected-bottom">
                    <span>⌖ {selectedDiscovery.location}</span>
                    <span className="status-tag">{selectedDiscovery.status}</span>
                  </div>
                </>
              ) : (
                <>
                  <h4>Pick a discovery.</h4>
                  <p>Select a lead from the list or click a marker to inspect its details.</p>
                </>
              )}
            </div>
            <div className="map-disclaimer">
              CONCEPT PREVIEW · NOT AN ACCURATE IN-GAME MAP
            </div>
          </div>
        </div>
      </section>

      <section className="contribute-section" id="community">
        <div className="contribute-mark">+</div>
        <div>
          <div className="eyebrow">THE NEXT DISCOVERY COULD BE YOURS</div>
          <h2>YOU FIND IT.<br /><span>WE MAP IT.</span></h2>
          <p>Submit your lead, share your evidence, and help the community explore. Approved discoveries will join the public guide.</p>
        </div>
        <a className="contribute-button" href="mailto:hello@gtaiv.solutions?subject=Community%20Discovery%20Submission">
          HOW TO CONTRIBUTE <span>↗</span>
        </a>
        <small className="contribute-note">DEMO LINK · SUBMISSION FORMS COMING SOON</small>
      </section>

      <section className="guide-footer" id="guides">
        <div>
          <div className="eyebrow">BUILT BY PLAYERS, FOR PLAYERS</div>
          <h2>GOOD GAMES ARE PLAYED.<br />GREAT ONES ARE <span>EXPLORED.</span></h2>
        </div>
        <p>Independent fan project. Not affiliated with or endorsed by Rockstar Games. Sample entries are illustrative and are not verified game discoveries.</p>
      </section>

 <SpatialScene />

      <footer className="footer">
        <a className="footer-brand" href="#">GTA(IV).SOLUTIONS</a>
        <span>COMMUNITY DISCOVERY NETWORK</span>
        <span>BUILT TO EXPLORE. © 2026</span>
      </footer>
    </main>
  );
}
