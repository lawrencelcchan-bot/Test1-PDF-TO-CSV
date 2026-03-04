import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";

const pdfInput = document.getElementById("pdfInput");
const downloadBtn = document.getElementById("downloadBtn");
const statusEl = document.getElementById("status");
const resultTable = document.getElementById("resultTable");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");

let currentRows = [];

pdfInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  statusEl.textContent = "Reading PDF...";
  downloadBtn.disabled = true;
  resultTable.hidden = true;
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const allRows = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageRows = extractRowsFromItems(textContent.items);
      allRows.push(...pageRows);
    }

    currentRows = normalizeRows(allRows);

    if (!currentRows.length) {
      statusEl.textContent = "No table-like text found in this PDF.";
      return;
    }

    renderTable(currentRows);
    statusEl.textContent = `Extracted ${currentRows.length} row(s).`;
    downloadBtn.disabled = false;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Failed to parse PDF. Please try another file.";
  }
});

downloadBtn.addEventListener("click", () => {
  if (!currentRows.length) return;

  const csv = rowsToCsv(currentRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "extracted-table.csv";
  link.click();

  URL.revokeObjectURL(url);
});

function extractRowsFromItems(items) {
  const rowMap = new Map();

  for (const item of items) {
    const text = (item.str || "").trim();
    if (!text) continue;

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const yBucket = Math.round(y / 4) * 4;

    if (!rowMap.has(yBucket)) {
      rowMap.set(yBucket, []);
    }

    rowMap.get(yBucket).push({ x, text });
  }

  const sortedBuckets = [...rowMap.keys()].sort((a, b) => b - a);

  return sortedBuckets
    .map((bucket) => {
      const columns = rowMap.get(bucket).sort((a, b) => a.x - b.x);
      return columns.map((col) => col.text);
    })
    .filter((row) => row.length > 1 || (row[0] && row[0].includes(" ")));
}

function normalizeRows(rows) {
  if (!rows.length) return [];

  const colCount = Math.max(...rows.map((r) => r.length));
  return rows.map((row) => {
    const copy = [...row];
    while (copy.length < colCount) copy.push("");
    return copy;
  });
}

function renderTable(rows) {
  resultTable.hidden = false;
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const columns = rows[0].length;

  const headerRow = document.createElement("tr");
  for (let i = 0; i < columns; i += 1) {
    const th = document.createElement("th");
    th.textContent = `Column ${i + 1}`;
    headerRow.appendChild(th);
  }
  tableHead.appendChild(headerRow);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

function rowsToCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}
