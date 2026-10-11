"use client";
import { useCallback, useEffect, useState } from "react";

export function useAdminFetch() {
  const [busy, setBusy] = useState(false);
  const call = useCallback(async (url: string, options: RequestInit = {}) => {
    setBusy(true);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Request failed.");
      return json;
    } finally {
      setBusy(false);
    }
  }, []);
  return { call, busy };
}

export async function adminFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed.");
  return json as T;
}

export function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-mist-500 px-3 py-2.5 whitespace-nowrap">{children}</th>;
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-mist-300 align-middle ${className}`}>{children}</td>;
}
