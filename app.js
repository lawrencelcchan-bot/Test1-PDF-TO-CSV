import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";

const STORAGE_KEY = "pdf-to-csv-editor-state-v1";
const MAX_PREVIEW_ROWS = 200;
const DEFAULT_CHAR_WIDTH = 90;

const pdfInput = document.getElementById("pdfInput");
const downloadBtn = document.getElementById("downloadBtn");
const statusEl = document.getElementById("status");
const resultTable = document.getElementById("resultTable");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const editorPanel = document.getElementById("editorPanel");
const splitMode = document.getElementById("splitMode");
const manualControls = document.getElementById("manualControls");
const addDividerBtn = document.getElementById("addDividerBtn");
const removeDividerBtn = document.getElementById("removeDividerBtn");
const resetBreaksBtn = document.getElementById("resetBreaksBtn");
const breakPositionsInput = document.getElementById("breakPositionsInput");
const breakReadout = document.getElementById("breakReadout");
const previewText = document.getElementById("previewText");
const dividerLayer = document.getElementById("dividerLayer");

let rawLines = [];
let manualBreaks = [];
let autoBreaks = [];
let headers = [];
let draggingDividerIndex = null;

const persisted = loadState();
if (persisted.mode) {
  splitMode.value = persisted.mode;
}
if (persisted.breaks) {
  manualBreaks = sanitizeBreaks(persisted.breaks);
}
if (persisted.headers) {
  headers = [...persisted.headers];
}

pdfInput.addEventListener("change", onFileSelected);
splitMode.addEventListener("change", () => {
  updateEditorVisibility();
  rerender();
  saveState();
});

breakPositionsInput.addEventListener("change", () => {
  manualBreaks = parseBreaksInput(breakPositionsInput.value);
  rerender();
  saveState();
});

addDividerBtn.addEventListener("click", () => {
  const width = getPreviewWidth();
  const source = getActiveBreaks();
  const next = source.length ? Math.round((source[source.length - 1] + width) / 2) : Math.round(width / 2);
  manualBreaks = sanitizeBreaks([...manualBreaks, next]);
  splitMode.value = "manual";
  updateEditorVisibility();
  rerender();
  saveState();
});

removeDividerBtn.addEventListener("click", () => {
  manualBreaks = manualBreaks.slice(0, -1);
  splitMode.value = "manual";
  updateEditorVisibility();
  rerender();
  saveState();
});

resetBreaksBtn.addEventListener("click", () => {
  manualBreaks = [...autoBreaks];
  breakPositionsInput.value = manualBreaks.join(", ");
  rerender();
  saveState();
});

downloadBtn.addEventListener("click", () => {
  const previewRows = getPreviewRows();
  if (!previewRows.length) return;

  const tableData = [getHeaders(previewRows[0].length), ...previewRows];
  const csv = tableToCsv(tableData);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "extracted-table.csv";
  link.click();
  URL.revokeObjectURL(url);
});

window.addEventListener("resize", () => {
  if (!rawLines.length || splitMode.value !== "manual") return;
  drawDividers(getActiveBreaks());
});

updateEditorVisibility();

async function onFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  statusEl.textContent = "Reading PDF...";
  downloadBtn.disabled = true;
  resultTable.hidden = true;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const lines = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      lines.push(...extractPageLines(textContent.items));
    }

    rawLines = lines.filter((line) => line.trim().length > 0);

    if (!rawLines.length) {
      statusEl.textContent = "No text lines found in this PDF.";
      return;
    }

    autoBreaks = inferAutoBreaks(rawLines);
    if (!manualBreaks.length) {
      manualBreaks = [...autoBreaks];
    }

    editorPanel.hidden = false;
    statusEl.textContent = `Extracted ${rawLines.length} line(s). Showing first ${Math.min(rawLines.length, MAX_PREVIEW_ROWS)}.`;

    rerender();
    downloadBtn.disabled = false;
    saveState();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Failed to parse PDF. Please try another file.";
  }
}

function extractPageLines(items) {
  const lineMap = new Map();
  const estimatedCharWidths = [];

  for (const item of items) {
    const text = (item.str || "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const yBucket = Math.round(y / 3) * 3;
    const width = Number.isFinite(item.width) ? item.width : text.length * 6;
    const charWidth = width / Math.max(1, text.length);

    if (Number.isFinite(charWidth) && charWidth > 0) {
      estimatedCharWidths.push(charWidth);
    }

    if (!lineMap.has(yBucket)) {
      lineMap.set(yBucket, []);
    }

    lineMap.get(yBucket).push({ x, text, width });
  }

  const yKeys = [...lineMap.keys()].sort((a, b) => b - a);
  const avgCharWidth =
    estimatedCharWidths.length > 0
      ? estimatedCharWidths.reduce((sum, value) => sum + value, 0) / estimatedCharWidths.length
      : 6;

  return yKeys.map((y) => {
    const tokens = lineMap.get(y).sort((a, b) => a.x - b.x);
    return stitchTokensWithSpacing(tokens, avgCharWidth);
  });
}

function stitchTokensWithSpacing(tokens, avgCharWidth) {
  if (!tokens.length) return "";

  let line = "";
  const baseX = tokens[0].x;
  let currentCharIndex = 0;

  for (const token of tokens) {
    const tokenStart = Math.max(0, Math.round((token.x - baseX) / Math.max(avgCharWidth, 1)));
    const spacesNeeded = Math.max(1, tokenStart - currentCharIndex);

    if (line.length === 0) {
      line += token.text;
    } else {
      line += " ".repeat(spacesNeeded) + token.text;
    }

    currentCharIndex = line.length;
  }

  return line.replace(/\s+$/g, "");
}

function inferAutoBreaks(lines) {
  const sample = lines.slice(0, MAX_PREVIEW_ROWS);
  const gapVotes = new Map();

  for (const line of sample) {
    const pattern = /\s{2,}/g;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const pos = match.index;
      gapVotes.set(pos, (gapVotes.get(pos) ?? 0) + 1);
    }
  }

  const minVotes = Math.max(2, Math.floor(sample.length * 0.08));
  const breaks = [...gapVotes.entries()]
    .filter(([, count]) => count >= minVotes)
    .map(([pos]) => pos)
    .sort((a, b) => a - b)
    .filter((pos, i, arr) => i === 0 || pos - arr[i - 1] >= 3);

  return sanitizeBreaks(breaks.slice(0, 10));
}

function splitLineByBreaks(line, breaks) {
  const safeBreaks = sanitizeBreaks(breaks);
  const chunks = [];
  let start = 0;

  for (const brk of safeBreaks) {
    chunks.push(line.slice(start, brk).trim());
    start = brk;
  }

  chunks.push(line.slice(start).trim());
  return chunks;
}

function getPreviewRows() {
  const activeBreaks = getActiveBreaks();
  return rawLines.slice(0, MAX_PREVIEW_ROWS).map((line) => splitLineByBreaks(line, activeBreaks));
}

function rerender() {
  if (!rawLines.length) return;

  const activeBreaks = getActiveBreaks();
  breakPositionsInput.value = activeBreaks.join(", ");
  breakReadout.textContent = `Breaks: [${activeBreaks.join(", ")}]`;

  previewText.textContent = buildPreviewText(rawLines.slice(0, 8));
  drawDividers(activeBreaks);

  const previewRows = getPreviewRows();
  if (!previewRows.length) return;

  normalizeHeaders(previewRows[0].length);
  renderTable(previewRows);
}

function renderTable(rows) {
  resultTable.hidden = false;
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  const headerRow = document.createElement("tr");
  getHeaders(rows[0].length).forEach((headerText, index) => {
    const th = document.createElement("th");
    const input = document.createElement("input");
    input.className = "header-input";
    input.value = headerText;
    input.addEventListener("input", (event) => {
      headers[index] = event.target.value;
      saveState();
    });
    th.appendChild(input);
    headerRow.appendChild(th);
  });
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

function getHeaders(columnCount) {
  normalizeHeaders(columnCount);
  return headers.slice(0, columnCount);
}

function normalizeHeaders(columnCount) {
  while (headers.length < columnCount) {
    headers.push(`Column ${headers.length + 1}`);
  }
  if (headers.length > columnCount) {
    headers = headers.slice(0, columnCount);
  }
}

function buildPreviewText(lines) {
  const width = getPreviewWidth();
  return lines.map((line) => line.slice(0, width).padEnd(width, " ")).join("\n");
}

function drawDividers(breaks) {
  dividerLayer.innerHTML = "";
  const width = getPreviewWidth();

  if (!width || splitMode.value !== "manual") return;

  breaks.forEach((pos, index) => {
    const divider = document.createElement("div");
    divider.className = "divider";
    divider.style.left = `${(pos / width) * 100}%`;
    divider.dataset.index = String(index);
    divider.title = `Break ${pos}`;

    divider.addEventListener("pointerdown", (event) => {
      draggingDividerIndex = Number(event.currentTarget.dataset.index);
      event.currentTarget.setPointerCapture(event.pointerId);
    });

    divider.addEventListener("pointermove", (event) => {
      if (draggingDividerIndex === null) return;
      const rect = dividerLayer.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const nextPos = Math.round(ratio * width);
      manualBreaks[draggingDividerIndex] = nextPos;
      manualBreaks = sanitizeBreaks(manualBreaks);
      breakPositionsInput.value = manualBreaks.join(", ");
      breakReadout.textContent = `Breaks: [${manualBreaks.join(", ")}]`;
      drawDividers(manualBreaks);
      renderTable(getPreviewRows());
    });

    divider.addEventListener("pointerup", () => {
      draggingDividerIndex = null;
      saveState();
    });

    dividerLayer.appendChild(divider);
  });
}

function parseBreaksInput(value) {
  return sanitizeBreaks(
    value
      .split(",")
      .map((chunk) => Number.parseInt(chunk.trim(), 10))
      .filter((num) => Number.isFinite(num))
  );
}

function sanitizeBreaks(breaks) {
  const width = getPreviewWidth();
  return [...new Set(breaks.map((n) => Math.max(1, Math.min(width - 1, Math.round(n)))))]
    .sort((a, b) => a - b)
    .filter((n, i, arr) => i === 0 || n !== arr[i - 1]);
}

function getPreviewWidth() {
  const maxLineLen = rawLines.length
    ? Math.max(...rawLines.slice(0, MAX_PREVIEW_ROWS).map((line) => line.length))
    : DEFAULT_CHAR_WIDTH;
  return Math.max(30, Math.min(180, maxLineLen));
}

function getActiveBreaks() {
  return splitMode.value === "manual" ? sanitizeBreaks(manualBreaks) : sanitizeBreaks(autoBreaks);
}

function updateEditorVisibility() {
  manualControls.hidden = splitMode.value !== "manual";
}

function tableToCsv(rows) {
  return rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function saveState() {
  const payload = {
    mode: splitMode.value,
    breaks: manualBreaks,
    headers,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      breaks: Array.isArray(parsed.breaks) ? parsed.breaks : [],
      headers: Array.isArray(parsed.headers) ? parsed.headers.map((h) => String(h)) : [],
    };
  } catch {
    return {};
  }
}
