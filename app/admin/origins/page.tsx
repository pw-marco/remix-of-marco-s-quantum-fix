"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/AdminLayout";
import { toast } from "sonner";
import { RefreshCw, Ban, CheckCircle2, Trash2 } from "lucide-react";

type OriginRow = {
  origin: string;
  lastPath: string;
  lastIp: string;
  lastUserAgent: string;
  hits: number;
  blocked: boolean;
  lastSeen: string;
};

export default function OriginsPage() {
  const [rows, setRows] = useState<OriginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/origins", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load");
      setRows(data.origins || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load origins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const toggleBlock = async (origin: string, block: boolean) => {
    try {
      const res = await fetch("/api/admin/origins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, block }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      toast.success(block ? `Blocked ${origin}` : `Unblocked ${origin}`);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update origin");
    }
  };

  const clearLogs = async () => {
    try {
      await fetch("/api/admin/origins", { method: "DELETE" });
      toast.success("Origin log cleared");
      load();
    } catch {
      toast.error("Failed to clear log");
    }
  };

  return (
    <AdminLayout activePage="origins">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Origins</h1>
            <p className="text-sm text-gray-500">
              Every external origin that requested this site. Block a proxy / mirror and it
              gets a 403 instantly.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={clearLogs}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-red-600"
              title="Clear log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="block a host manually e.g. proxy.example.com"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
          />
          <button
            onClick={() => {
              if (!manual.trim()) return;
              toggleBlock(manual.trim(), true);
              setManual("");
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Block
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-gray-500">No external origins recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Origin</th>
                    <th className="text-left p-3">Hits</th>
                    <th className="text-left p-3">Last path</th>
                    <th className="text-left p-3">IP</th>
                    <th className="text-left p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.origin} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-gray-900 break-all">{r.origin}</td>
                      <td className="p-3 text-gray-600">{r.hits}</td>
                      <td className="p-3 text-gray-600 break-all">{r.lastPath}</td>
                      <td className="p-3 text-gray-600">{r.lastIp}</td>
                      <td className="p-3">
                        {r.blocked ? (
                          <span className="text-red-600">Blocked</span>
                        ) : (
                          <span className="text-green-600">Allowed</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => toggleBlock(r.origin, !r.blocked)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border ${
                            r.blocked
                              ? "border-green-200 text-green-700"
                              : "border-red-200 text-red-600"
                          }`}
                        >
                          {r.blocked ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" /> Block
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
