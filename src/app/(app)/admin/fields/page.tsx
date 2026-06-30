"use client";

import { useEffect, useState } from "react";
import { PanelLoader } from "@/components/PanelLoader";

type Field = { _id: string; name: string };
type GameToggle = { id: string; title: string; tagline: string; emoji: string; enabled: boolean };

export default function AdminAddonsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [games, setGames] = useState<GameToggle[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [fieldsRes, gamesRes] = await Promise.all([
      fetch("/api/admin/fields"),
      fetch("/api/admin/playground/games"),
    ]);
    const fieldsData = await fieldsRes.json();
    setFields(fieldsData.fields || []);
    if (gamesRes.ok) {
      const gamesData = await gamesRes.json();
      setGames(gamesData.games || []);
    }
    setLoading(false);
  }

  async function toggleGame(id: string, enabled: boolean) {
    setGames((prev) => prev.map((g) => (g.id === id ? { ...g, enabled } : g)));
    const res = await fetch("/api/admin/playground/games", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    if (!res.ok) {
      // Revert on failure.
      setGames((prev) => prev.map((g) => (g.id === id ? { ...g, enabled: !enabled } : g)));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addField(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add field");
      return;
    }
    setName("");
    load();
  }

  async function removeField(id: string) {
    if (!confirm("Delete this field? It cannot be removed if members are using it.")) return;
    setError("");
    const res = await fetch(`/api/admin/fields?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not delete field");
      return;
    }
    load();
  }

  if (loading) return <PanelLoader variant="list" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add-ons</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage optional modules for your hub. More add-ons will appear here over time.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fields</h2>
          <p className="text-sm text-slate-500 mt-1">
            Categories shown on signup (e.g. AI club, Scandicommerce). Add or remove options below.
          </p>
        </div>

        <form onSubmit={addField} className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="New field name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg px-4 py-2 shrink-0 cursor-pointer"
          >
            Add field
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="rounded-xl border border-slate-100 divide-y divide-slate-100">
          {fields.length === 0 ? (
            <li className="p-4 text-slate-500 text-sm">No fields yet.</li>
          ) : (
            fields.map((f) => (
              <li key={f._id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-slate-800">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeField(f._id)}
                  className="text-sm text-red-600 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Playground games</h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose which games appear on the members&apos; Playground page. Disabled games are hidden from members.
          </p>
        </div>

        <ul className="rounded-xl border border-slate-100 divide-y divide-slate-100">
          {games.length === 0 ? (
            <li className="p-4 text-slate-500 text-sm">No games available.</li>
          ) : (
            games.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl leading-none shrink-0" aria-hidden>
                    {g.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{g.title}</p>
                    <p className="text-xs text-slate-500 truncate">{g.tagline}</p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <span className={`text-xs font-medium ${g.enabled ? "text-brand-700" : "text-slate-400"}`}>
                    {g.enabled ? "Visible" : "Hidden"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={g.enabled}
                    onClick={() => toggleGame(g.id, !g.enabled)}
                    className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                      g.enabled ? "bg-brand-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        g.enabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </label>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
