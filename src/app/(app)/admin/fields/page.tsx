"use client";

import { useEffect, useState } from "react";
import { PanelLoader } from "@/components/PanelLoader";

type Field = { _id: string; name: string };

export default function AdminAddonsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/fields");
    const data = await res.json();
    setFields(data.fields || []);
    setLoading(false);
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

      <section className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-700">More add-ons</h2>
        <p className="text-sm text-slate-500 mt-2">Additional modules will be available here in a future update.</p>
      </section>
    </div>
  );
}
