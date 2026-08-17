"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/AdminLayout";
import { toast } from "sonner";
import { Save, RefreshCw, ShieldOff } from "lucide-react";

type PlayerConfig = {
  primaryApi: string;
  marcoApi: string;
  pythonApi: string;
  iframeBaseUrl: string;
  useIframe: boolean;
  providerOrder: string[];
  extraHeaders?: Record<string, string>;
};

const PROVIDERS = ["primary", "marco", "python", "legacy"];

export default function PlayerSessionPage() {
  const [config, setConfig] = useState<PlayerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/player-config", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load");
      setConfig(data.playerConfig);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load player config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/player-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerConfig: config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save");
      setConfig(data.playerConfig);
      toast.success("Player session updated — live for every user now");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const revokeAll = async () => {
    setRevoking(true);
    try {
      const res = await fetch("/api/admin/revoke-sessions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed");
      toast.success("All user sessions revoked");
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke sessions");
    } finally {
      setRevoking(false);
    }
  };

  const update = (patch: Partial<PlayerConfig>) =>
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));

  const moveProvider = (name: string, dir: -1 | 1) => {
    if (!config) return;
    const order = [...config.providerOrder];
    const i = order.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    update({ providerOrder: order });
  };

  return (
    <AdminLayout activePage="player">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Player Session</h1>
            <p className="text-sm text-gray-500">
              Edit every stream backend / iframe URL live — changes apply within 5 seconds,
              no redeploy needed.
            </p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading || !config ? (
          <div className="text-gray-500">Loading…</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <Field
              label="Primary stream API (get-video)"
              value={config.primaryApi}
              onChange={(v) => update({ primaryApi: v })}
              hint="Called as {base}/get-video?batch_id=..&child_id=.."
            />
            <Field
              label="Marco worker API (fallback)"
              value={config.marcoApi}
              onChange={(v) => update({ marcoApi: v })}
              hint="Full URL, called as {url}?batchId=..&childId=.."
            />
            <Field
              label="Python server API (fallback)"
              value={config.pythonApi}
              onChange={(v) => update({ pythonApi: v })}
            />
            <Field
              label="Iframe player base URL"
              value={config.iframeBaseUrl}
              onChange={(v) => update({ iframeBaseUrl: v })}
              hint="Optional. Used when 'Play inside iframe' is enabled."
            />

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={config.useIframe}
                onChange={(e) => update({ useIframe: e.target.checked })}
                className="w-4 h-4"
              />
              Play inside iframe instead of the built-in player
            </label>

            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Provider order</p>
              <div className="space-y-2">
                {config.providerOrder.map((name, idx) => (
                  <div
                    key={`${name}-${idx}`}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">
                      {idx + 1}. {name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveProvider(name, -1)}
                        className="px-2 py-1 text-xs border rounded"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveProvider(name, 1)}
                        className="px-2 py-1 text-xs border rounded"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Known providers: {PROVIDERS.join(", ")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save & push live"}
              </button>
              <button
                onClick={revokeAll}
                disabled={revoking}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg disabled:opacity-60"
              >
                <ShieldOff className="w-4 h-4" />
                {revoking ? "Revoking…" : "Revoke all user sessions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
        placeholder="https://…"
      />
      {hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}
