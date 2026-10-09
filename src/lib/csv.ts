/** Download rows as a CSV file in the browser. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return false;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join(
    "\n",
  );
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
