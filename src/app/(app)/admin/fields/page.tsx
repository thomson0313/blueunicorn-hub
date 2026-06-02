"use client";

import { useEffect, useState } from "react";

type Field = { _id: string; name: string };

export default function AdminFieldsPage() {
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

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Member fields</h1>
        <p className="text-slate-500 text-sm mt-1">
          Categories shown on signup (e.g. AI club, Scandicommerce). Add new options here anytime.
        </p>
      </div>

      <form onSubmit={addField} className="bg-white rounded-xl border border-slate-200 p-5 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="New field name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg px-4 py-2 shrink-0">
          Add field
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {fields.length === 0 ? (
          <li className="p-4 text-slate-500 text-sm">No fields yet.</li>
        ) : (
          fields.map((f) => (
            <li key={f._id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium text-slate-800">{f.name}</span>
              <button
                type="button"
                onClick={() => removeField(f._id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
