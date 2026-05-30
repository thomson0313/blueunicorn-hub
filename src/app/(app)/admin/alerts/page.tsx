"use client";

import { useEffect, useState } from "react";
import type { AlertItem } from "@/lib/types";

function defaultLocalDateTime(): string {
  // Pre-fill with "now + 1 minute" in the format expected by datetime-local.
  const d = new Date(Date.now() + 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultLocalDateTime());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/alerts");
    const data = await res.json();
    setAlerts(data.alerts || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        // Convert local datetime to an ISO string the server can parse.
        scheduledAt: new Date(scheduledAt).toISOString(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create alert");
      return;
    }
    setTitle("");
    setContent("");
    setScheduledAt(defaultLocalDateTime());
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) setAlerts((prev) => prev.filter((a) => a._id !== id));
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-500">
          Schedule an alert and every member will be notified at the time you set.
        </p>
      </div>

      <form onSubmit={createAlert} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">New alert</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Alert title"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          placeholder="What do members need to know?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Deliver at</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-4 py-2 transition">
          Schedule alert
        </button>
      </form>

      <div>
        <h2 className="font-semibold text-slate-800 mb-3">Scheduled & sent</h2>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : alerts.length === 0 ? (
          <p className="text-slate-500">No alerts yet.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a._id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        a.status === "delivered"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {a.status === "delivered" ? "Delivered" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(a.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => remove(a._id)}
                  className="text-sm text-slate-400 hover:text-red-600 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
