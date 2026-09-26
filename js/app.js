// 页面：DOM 渲染、色板、纹样块、统计/预览/断线提示、保存与导入导出。
const colors = ["#f7e7c4","#a6322d","#1f5f78","#d6a437","#355b38","#713d7b","#1e1b18","#e98c52"];
const STORAGE_KEY = "zfl31Pattern";
const grid = document.querySelector("#grid");
const palette = document.querySelector("#palette");
const stats = document.querySelector("#stats");
const preview = document.querySelector("#preview");
const risk = document.querySelector("#risk");
const symmetrySelect = document.querySelector("#symmetry");
const importFile = document.querySelector("#importFile");

const state = CanvasState.create(18, 14);
let active = 1, block = "dot", dragging = false, lastCell = null;
let cellEls = [];

function init() {
  symmetrySelect.innerHTML = Symmetry.MODES.map(m => '<option value="'+m.value+'">'+m.label+'</option>').join("");
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { saved = null; }
  if (saved && CanvasState.deserialize(state, saved)) sanitizeCells();
  syncInputs();
  renderPalette();
  renderAll();
}

function sanitizeCells() {
  state.cells = state.cells.map(v => Number.isInteger(v) && v >= 0 && v < colors.length ? v : 0);
}

function syncInputs() {
  document.querySelector("#cols").value = state.cols;
  document.querySelector("#rows").value = state.rows;
  symmetrySelect.value = state.symmetry;
}

function renderAll() { renderGrid(); renderStats(); }

function renderPalette() {
  palette.innerHTML = colors.map((c, i) => '<button class="swatch '+(i===active?'active':'')+'" data-color="'+i+'" style="background:'+c+'"></button>').join("");
  palette.querySelectorAll("[data-color]").forEach(el => el.onclick = () => { active = Number(el.dataset.color); renderPalette(); });
}

function renderGrid() {
  grid.style.gridTemplateColumns = "repeat("+state.cols+", 1fr)";
  grid.innerHTML = state.cells.map((v, i) => '<div class="cell" data-i="'+i+'" style="background:'+colors[v]+'"></div>').join("");
  cellEls = Array.from(grid.querySelectorAll(".cell"));
}

// 落笔：纹样块展开成目标格，再按对称方式镜像，只更新受影响的格子。
function paintAt(i) {
  const targets = Symmetry.expand(blockTargets(i), state.cols, state.rows, state.symmetry);
  CanvasState.applyCells(state, targets, active);
  targets.forEach(t => { cellEls[t].style.background = colors[active]; });
  renderStats();
}

function blockTargets(i) {
  const x = i % state.cols, y = Math.floor(i / state.cols);
  if (block === "cross") return [i, at(x-1,y), at(x+1,y), at(x,y-1), at(x,y+1)].filter(v => v !== null);
  if (block === "diamond") return [at(x,y-1), at(x-1,y), i, at(x+1,y), at(x,y+1)].filter(v => v !== null);
  return [i];
}
function at(x, y) { return x < 0 || x >= state.cols || y < 0 || y >= state.rows ? null : y * state.cols + x; }

// 两点之间逐格插值，拖动快也不漏格。
function paintLineTo(i) {
  if (lastCell === null) { lastCell = i; paintAt(i); return; }
  if (i === lastCell) return;
  const cols = state.cols;
  let x = lastCell % cols, y = Math.floor(lastCell / cols);
  const x1 = i % cols, y1 = Math.floor(i / cols);
  const dx = Math.abs(x1 - x), dy = Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
  let err = dx - dy;
  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    paintAt(y * cols + x);
  }
  lastCell = i;
}

grid.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;
  e.preventDefault();
  dragging = true;
  grid.setPointerCapture(e.pointerId);
  CanvasState.beginStroke(state);
  lastCell = Number(cell.dataset.i);
  paintAt(lastCell);
});
grid.addEventListener("pointermove", e => {
  if (!dragging) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el && el.closest ? el.closest(".cell") : null;
  if (!cell || !grid.contains(cell)) return;
  paintLineTo(Number(cell.dataset.i));
});
function endDrag() {
  if (!dragging) return;
  dragging = false;
  lastCell = null;
  CanvasState.endStroke(state);
}
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

function renderStats() {
  const counts = colors.map((_, i) => state.cells.filter(v => v === i).length);
  stats.innerHTML = counts.map((n, i) => '<div class="stat"><span><span style="display:inline-block;width:14px;height:14px;background:'+colors[i]+'"></span> 色线'+i+'</span><b>'+n+'</b></div>').join("");
  preview.innerHTML = Array.from({length: 36}, (_, i) => {
    const x = i % 6, y = Math.floor(i / 6);
    const v = x < state.cols && y < state.rows ? state.cells[y * state.cols + x] : 0;
    return '<div class="mini" style="background:'+(colors[v] || colors[0])+'"></div>';
  }).join("");
  const riskRows = [];
  for (let y = 0; y < state.rows; y++) {
    let switches = 0;
    for (let x = 1; x < state.cols; x++) if (state.cells[y*state.cols+x] !== state.cells[y*state.cols+x-1]) switches++;
    if (switches > state.cols * .62) riskRows.push(y + 1);
  }
  risk.innerHTML = riskRows.length ? '<p class="warning">第'+riskRows.join("、")+'行换色过密，可能断线。</p>' : '<p>暂无明显断线风险。</p>';
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, Number.isFinite(v) ? Math.round(v) : min));
function readDims() {
  return {
    cols: clamp(Number(document.querySelector("#cols").value), 6, 36),
    rows: clamp(Number(document.querySelector("#rows").value), 6, 32),
  };
}

// 切换对称方式：已画内容保留，后续笔迹按新中轴计算。
symmetrySelect.onchange = () => { state.symmetry = symmetrySelect.value; };
document.querySelectorAll("[data-block]").forEach(btn => btn.onclick = () => {
  block = btn.dataset.block;
  document.querySelectorAll("[data-block]").forEach(b => b.classList.toggle("active", b === btn));
});
document.querySelector("#resizeBtn").onclick = () => {
  const d = readDims();
  CanvasState.resize(state, d.cols, d.rows);
  syncInputs(); renderAll();
};
document.querySelector("#newBtn").onclick = () => {
  const d = readDims();
  const symmetry = state.symmetry;
  Object.assign(state, CanvasState.create(d.cols, d.rows));
  state.symmetry = symmetry;
  syncInputs(); renderAll();
};
document.querySelector("#undoBtn").onclick = () => { if (CanvasState.undo(state)) { syncInputs(); renderAll(); } };
document.querySelector("#redoBtn").onclick = () => { if (CanvasState.redo(state)) { syncInputs(); renderAll(); } };
document.querySelector("#saveBtn").onclick = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(CanvasState.serialize(state)));
document.querySelector("#exportBtn").onclick = () => {
  const data = Object.assign(CanvasState.serialize(state), { usage: colors.map((color, i) => ({ color, count: state.cells.filter(v => v === i).length })) });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "brocade-pattern.json"; a.click(); URL.revokeObjectURL(a.href);
};
document.querySelector("#importBtn").onclick = () => importFile.click();
importFile.onchange = () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!CanvasState.deserialize(state, data)) throw new Error("invalid");
      sanitizeCells();
      syncInputs(); renderAll();
    } catch (err) { alert("导入失败：JSON 格式不正确。"); }
    importFile.value = "";
  };
  reader.readAsText(file);
};
init();
