/* 页面：渲染与交互，把画布状态和对称规则接到 DOM 上 */
(() => {
  const colors = ["#f7e7c4","#a6322d","#1f5f78","#d6a437","#355b38","#713d7b","#1e1b18","#e98c52"];
  const $ = s => document.querySelector(s);
  const grid = $("#grid"), palette = $("#palette"), stats = $("#stats"),
        preview = $("#preview"), risk = $("#risk"), symmetrySelect = $("#symmetry");
  let active = 1, block = "dot", dragging = false, lastCell = null;

  /* 纹样块形状：以落点为中心的相对坐标（可能越界，交给对称规则过滤） */
  function blockPoints(i) {
    const cols = CanvasState.cols();
    const x = i % cols, y = Math.floor(i / cols);
    if (block === "cross") return [[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    if (block === "diamond") return [[x,y-1],[x-1,y],[x,y],[x+1,y],[x,y+1]];
    return [[x,y]];
  }

  /* 快速拖动时指针跳格，用直线插值补齐中间漏掉的格子 */
  function lineCells(from, to) {
    const cols = CanvasState.cols();
    let x0 = from % cols, y0 = Math.floor(from / cols);
    const x1 = to % cols, y1 = Math.floor(to / cols);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    const path = [];
    for (;;) {
      path.push(y0 * cols + x0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return path;
  }

  function paintAt(i) {
    const path = (lastCell !== null && lastCell !== i) ? lineCells(lastCell, i) : [i];
    lastCell = i;
    const points = [];
    path.forEach(ci => points.push(...blockPoints(ci)));
    const targets = Symmetry.resolve(points, CanvasState.cols(), CanvasState.rows(), CanvasState.symmetry());
    CanvasState.paint(targets, active);
    render();
  }

  function render() {
    const cols = CanvasState.cols(), cells = CanvasState.cells();
    palette.innerHTML = colors.map((c, i) => '<button class="swatch '+(i===active?'active':'')+'" data-color="'+i+'" style="background:'+c+'"></button>').join("");
    palette.querySelectorAll("[data-color]").forEach(el => el.onclick = () => { active = Number(el.dataset.color); render(); });
    grid.style.gridTemplateColumns = "repeat("+cols+", 1fr)";
    grid.innerHTML = cells.map((v, i) => '<div class="cell" data-i="'+i+'" style="background:'+colors[v]+'"></div>').join("");
    grid.querySelectorAll(".cell").forEach(el => {
      el.onpointerdown = () => { dragging = true; lastCell = null; CanvasState.beginStroke(); paintAt(Number(el.dataset.i)); };
      el.onpointerenter = () => { if (dragging) paintAt(Number(el.dataset.i)); };
    });
    renderStats();
  }

  function renderStats() {
    const cols = CanvasState.cols(), rows = CanvasState.rows(), cells = CanvasState.cells();
    const counts = colors.map((_, i) => cells.filter(v => v === i).length);
    stats.innerHTML = counts.map((n, i) => '<div class="stat"><span><span style="display:inline-block;width:14px;height:14px;background:'+colors[i]+'"></span> 色线'+i+'</span><b>'+n+'</b></div>').join("");
    preview.innerHTML = Array.from({length: 36}, (_, i) => '<div class="mini" style="background:'+(colors[cells[(i % 6) + Math.floor(i / 6) * cols]] || colors[0])+'"></div>').join("");
    const riskRows = [];
    for (let y = 0; y < rows; y++) {
      let switches = 0;
      for (let x = 1; x < cols; x++) if (cells[y*cols+x] !== cells[y*cols+x-1]) switches++;
      if (switches > cols * .62) riskRows.push(y + 1);
    }
    risk.innerHTML = riskRows.length ? '<p class="warning">第'+riskRows.join("、")+'行换色过密，可能断线。</p>' : '<p>暂无明显断线风险。</p>';
  }

  symmetrySelect.innerHTML = Symmetry.MODES.map(m => '<option value="'+m+'">'+Symmetry.LABELS[m]+'</option>').join("");
  symmetrySelect.onchange = () => CanvasState.setSymmetry(symmetrySelect.value);

  document.querySelectorAll("[data-block]").forEach(btn => btn.onclick = () => block = btn.dataset.block);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v)) || lo));
  document.querySelector("#newBtn").onclick = () => {
    const c = clamp($("#cols").value, 6, 36), r = clamp($("#rows").value, 6, 32);
    $("#cols").value = c; $("#rows").value = r;
    CanvasState.resize(c, r);
    render();
  };
  document.querySelector("#undoBtn").onclick = () => { if (CanvasState.undo()) render(); };
  document.querySelector("#redoBtn").onclick = () => { if (CanvasState.redo()) render(); };
  document.querySelector("#saveBtn").onclick = () => CanvasState.save();
  document.querySelector("#exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(CanvasState.exportData(colors), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "brocade-pattern.json"; a.click(); URL.revokeObjectURL(a.href);
  };
  window.onpointerup = () => { if (!dragging) return; dragging = false; lastCell = null; CanvasState.endStroke(); };

  if (!CanvasState.load()) CanvasState.init(Number($("#cols").value), Number($("#rows").value));
  $("#cols").value = CanvasState.cols();
  $("#rows").value = CanvasState.rows();
  symmetrySelect.value = CanvasState.symmetry();
  render();
})();
