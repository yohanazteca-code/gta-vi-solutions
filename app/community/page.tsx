"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Category =
  | "All"
  | "Discord"
  | "YouTube"
  | "Streamer"
  | "Crew";

type Listing = {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  description: string;
  tags: string[];
  url: string;
  featured?: boolean;
};

const INITIAL_LISTINGS: Listing[] = [
  {
    id: 1,
    name: "GTA Community Hub",
    category: "Discord",
    description:
      "A sample listing for a community focused on meeting players and discussing GTA.",
    tags: ["Community", "Discussion"],
    url: "https://discord.com/",
    featured: true,
  },
  {
    id: 2,
    name: "GTA Discovery Channel",
    category: "YouTube",
    description:
      "A sample creator listing for guides, discoveries, secrets, and gameplay videos.",
    tags: ["Guides", "Discoveries"],
    url: "https://www.youtube.com/",
    featured: true,
  },
  {
    id: 3,
    name: "Live Gameplay Network",
    category: "Streamer",
    description:
      "A sample listing for streamers sharing gameplay and community events.",
    tags: ["Live", "Gameplay"],
    url: "https://www.twitch.tv/",
  },
  {
    id: 4,
    name: "Looking for a Crew",
    category: "Crew",
    description:
      "A sample listing for players looking to connect and organize gaming sessions.",
    tags: ["Players", "Teamwork"],
    url: "https://www.reddit.com/",
  },
];

const CATEGORIES: Category[] = [
  "All",
  "Discord",
  "YouTube",
  "Streamer",
  "Crew",
];

const CATEGORY_ICONS: Record<Exclude<Category, "All">, string> = {
  Discord: "◈",
  YouTube: "▶",
  Streamer: "●",
  Crew: "⌘",
};

export default function CommunityPage() {
  const [listings, setListings] = useState(INITIAL_LISTINGS);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<Exclude<Category, "All">>("Discord");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesCategory =
        activeCategory === "All" ||
        listing.category === activeCategory;

      const searchableText = [
        listing.name,
        listing.description,
        listing.category,
        ...listing.tags,
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchableText.includes(term);
    });
  }, [listings, activeCategory, search]);

  function submitListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url.trim());
    } catch {
      setNotice("Enter a valid URL beginning with https://");
      return;
    }

    if (
      parsedUrl.protocol !== "https:" ||
      !["discord.com", "discord.gg", "youtube.com", "www.youtube.com",
        "youtu.be", "twitch.tv", "www.twitch.tv", "reddit.com",
        "www.reddit.com"].includes(parsedUrl.hostname.toLowerCase())
    ) {
      setNotice(
        "Use an HTTPS link from Discord, YouTube, Twitch, or Reddit."
      );
      return;
    }

    const newListing: Listing = {
      id: Date.now(),
      name: name.trim(),
      category,
      description: description.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 6),
      url: parsedUrl.toString(),
    };

    // Prototype only: this adds the listing locally.
    // Production submissions must be saved as pending on a server.
    setListings((current) => [...current, newListing]);
    setNotice(
      "Prototype listing added locally. It is not yet reviewed or saved permanently."
    );

    setName("");
    setUrl("");
    setDescription("");
    setTags("");
    setShowForm(false);
  }

  return (
    
<main className="relative min-h-screen overflow-hidden bg-[#050907] text-[#d7ffe1]">

  {/* Animated Community Background */}
  <div
    className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
    style={{
      backgroundImage: "url('/gta-gifs/communitypage.gif')",
    }}
  />

  {/* Dark overlay */}
  <div className="pointer-events-none fixed inset-0 z-0 bg-black/70" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8">
        
<Link
  href="/spatial"
  className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#63ff91]/40 bg-black/60 px-5 py-3 font-mono text-xs font-bold tracking-widest text-[#63ff91] backdrop-blur-md transition hover:border-[#63ff91] hover:bg-[#102519]"
>
  <span aria-hidden="true">←</span>
  BACK TO LEONIDA
</Link>


        <header className="border-b border-[#21442c] pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-xs tracking-[0.3em] text-[#63ff91]">
              GTA(VI).SOLUTIONS
            </div>
            <div className="rounded-full border border-[#285338] px-3 py-1 font-mono text-xs text-[#8cae97]">
              COMMUNITY NETWORK // 001
            </div>
          </div>

          <div className="mt-12 max-w-3xl">
            <p className="font-mono text-xs tracking-[0.25em] text-[#63ff91]">
              CONNECT // DISCOVER // EXPLORE
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
              COMMUNITY
              <span className="block text-[#63ff91]">DIRECTORY</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#9bb5a2] sm:text-base">
              Find creators, Discord servers, streamers, and crews.
              Discover your corner of the GTA community.
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { label: "DISCORD SERVERS", value: "COMMUNITY", icon: "◈" },
            { label: "YOUTUBE CHANNELS", value: "CREATORS", icon: "▶" },
            { label: "PLAYER GROUPS", value: "CONNECTIONS", icon: "⌘" },
          ].map((item) => (
            <div
              key={item.label}
              className="border border-[#21442c] bg-[#0a120d] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#8cae97]">
                  {item.label}
                </span>
                <span className="text-xl text-[#63ff91]">{item.icon}</span>
              </div>
              <div className="mt-3 text-lg font-bold">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-xs tracking-widest text-[#63ff91]">
                DATABASE // COMMUNITY LINKS
              </p>
              <h2 className="mt-2 text-2xl font-bold">Explore listings</h2>
            </div>
            <button
              onClick={() => {
                setShowForm((current) => !current);
                setNotice("");
              }}
              className="border border-[#63ff91] bg-[#102519] px-5 py-3 text-sm font-bold text-[#63ff91] transition hover:bg-[#183d26]"
            >
              {showForm ? "CANCEL SUBMISSION" : "+ SUBMIT A COMMUNITY"}
            </button>
          </div>

          {notice && (
            <div
              role="status"
              className="mt-5 border border-[#285338] bg-[#0b170f] p-4 text-sm text-[#b8ffd0]"
            >
              {notice}
            </div>
          )}

          {showForm && (
            <form
              onSubmit={submitListing}
              className="mt-6 border border-[#285338] bg-[#09110c] p-5 sm:p-7"
            >
              <p className="font-mono text-xs tracking-widest text-[#63ff91]">
                NEW ENTRY // SUBMISSION FORM
              </p>
              <h3 className="mt-2 text-xl font-bold">
                Submit a community
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#9bb5a2]">
                Share a community or creator with other players. In this
                prototype, submissions appear locally and are not reviewed
                by an administrator yet.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Listing name
                  <input
                    required
                    maxLength={70}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Community or channel name"
                    className="mt-2 w-full border border-[#285338] bg-[#050907] px-3 py-3 outline-none focus:border-[#63ff91]"
                  />
                </label>

                <label className="text-sm">
                  Category
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as Exclude<Category, "All">
                      )
                    }
                    className="mt-2 w-full border border-[#285338] bg-[#050907] px-3 py-3 outline-none focus:border-[#63ff91]"
                  >
                    <option value="Discord">Discord server</option>
                    <option value="YouTube">YouTube channel</option>
                    <option value="Streamer">Streamer</option>
                    <option value="Crew">Player crew / group</option>
                  </select>
                </label>

                <label className="text-sm sm:col-span-2">
                  Official link
                  <input
                    required
                    type="url"
                    maxLength={300}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full border border-[#285338] bg-[#050907] px-3 py-3 outline-none focus:border-[#63ff91]"
                  />
                </label>

                <label className="text-sm sm:col-span-2">
                  Description
                  <textarea
                    required
                    maxLength={400}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What can players find here?"
                    className="mt-2 w-full resize-y border border-[#285338] bg-[#050907] px-3 py-3 outline-none focus:border-[#63ff91]"
                  />
                </label>

                <label className="text-sm sm:col-span-2">
                  Tags (comma separated)
                  <input
                    maxLength={150}
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Mysteries, Guides, Roleplay"
                    className="mt-2 w-full border border-[#285338] bg-[#050907] px-3 py-3 outline-none focus:border-[#63ff91]"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-5 bg-[#63ff91] px-5 py-3 font-bold text-[#061009] transition hover:bg-[#a0ffba]"
              >
                ADD PROTOTYPE LISTING
              </button>
            </form>
          )}

          <div className="mt-6">
            <label htmlFor="community-search" className="sr-only">
              Search community listings
            </label>
            <input
              id="community-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search names, tags, and descriptions..."
              className="w-full border border-[#285338] bg-[#09110c] px-4 py-4 text-sm outline-none placeholder:text-[#68816f] focus:border-[#63ff91]"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => setActiveCategory(item)}
                aria-pressed={activeCategory === item}
                className={`border px-4 py-2 text-xs font-bold transition ${
                  activeCategory === item
                    ? "border-[#63ff91] bg-[#163522] text-[#63ff91]"
                    : "border-[#21442c] text-[#9bb5a2] hover:border-[#63ff91]"
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-b border-[#21442c] pb-3 font-mono text-xs text-[#8cae97]">
            <span>RESULTS: {filteredListings.length}</span>
            <span>STATUS: DIRECTORY ONLINE</span>
          </div>

          {filteredListings.length === 0 ? (
            <div className="mt-6 border border-dashed border-[#285338] p-10 text-center">
              <div className="text-2xl text-[#63ff91]">⌕</div>
              <h3 className="mt-3 font-bold">No matching listings</h3>
              <p className="mt-2 text-sm text-[#9bb5a2]">
                Try another search or choose a different category.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {filteredListings.map((listing) => (
                <article
                  key={listing.id}
                  className="flex flex-col border border-[#21442c] bg-[#09110c] p-5 transition hover:border-[#4ca96b]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-[#63ff91]">
                        {CATEGORY_ICONS[listing.category]}{" "}
                        {listing.category.toUpperCase()}
                      </p>
                      <h3 className="mt-2 text-lg font-bold">
                        {listing.name}
                      </h3>
                    </div>
                    {listing.featured && (
                      <span className="border border-[#285338] px-2 py-1 font-mono text-[10px] text-[#63ff91]">
                        FEATURED
                      </span>
                    )}
                  </div>

                  <p className="mt-3 flex-1 text-sm leading-6 text-[#9bb5a2]">
                    {listing.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {listing.tags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-[#21442c] px-2 py-1 text-xs text-[#a8c6b0]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-between border border-[#285338] px-4 py-3 text-sm font-bold text-[#63ff91] transition hover:bg-[#102519]"
                  >
                    VISIT COMMUNITY <span aria-hidden="true">↗</span>
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-16 border-t border-[#21442c] pt-5">
          <div className="flex flex-col justify-between gap-2 font-mono text-[10px] text-[#68816f] sm:flex-row">
            <span>GTA(VI).SOLUTIONS // COMMUNITY NETWORK</span>
            <span>PLAYER-POWERED DISCOVERY</span>
          </div>
          <p className="mt-4 max-w-3xl text-xs leading-5 text-[#68816f]">
            This directory is an independent community project and is not
            affiliated with Rockstar Games. Sample entries are placeholders
            and are not verified endorsements.
          </p>
        </footer>
      </div>
    </main>
  );
}