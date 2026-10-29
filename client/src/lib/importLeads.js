import { parseCSV } from './utils.js';

// Reads a CSV (first row = column names) and sends every row to the server, which matches the columns.
export async function importLeadsFile(D, file) {
  const rows = parseCSV(await file.text());
  if (rows.length < 2) return D.toast('That file has no rows to import.');
  const head = rows[0].map((h) => h.trim());
  const items = rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
  const res = await D.importLeads(items);
  if (res) D.toast(`Imported ${res.imported} lead${res.imported === 1 ? '' : 's'}${res.skipped ? ` · ${res.skipped} already existed` : ''}`);
}
