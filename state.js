/* 画布状态：网格数据、笔画归并、撤销重做与本地持久化 */
const CanvasState = (() => {
  const STORAGE_KEY = "zfl31Pattern";
  const MAX_UNDO = 50;
  let cols = 18, rows = 14;
  let cells = Array(cols * rows).fill(0);
  let symmetry = "off";
  let undoStack = [], redoStack = [];
  let strokeSnapshot = null;

  const snap = () => [...cells];

  function init(c, r) {
    cols = c; rows = r;
    cells = Array(cols * rows).fill(0);
    symmetry = "off";
    undoStack = []; redoStack = []; strokeSnapshot = null;
  }

  /* 调整行列：已画内容保留，越界部分裁掉、新增部分补空白 */
  function resize(newCols, newRows) {
    const next = Array(newCols * newRows).fill(0);
    for (let y = 0; y < Math.min(rows, newRows); y++)
      for (let x = 0; x < Math.min(cols, newCols); x++)
        next[y * newCols + x] = cells[y * cols + x];
    cols = newCols; rows = newRows; cells = next;
    undoStack = []; redoStack = []; strokeSnapshot = null;
  }

  /* 一次拖动合为一笔：落笔留影，抬笔时若有变化才入撤销栈 */
  function beginStroke() { strokeSnapshot = snap(); }
  function paint(indices, color) { indices.forEach(i => { cells[i] = color; }); }
  function endStroke() {
    if (!strokeSnapshot) return;
    if (strokeSnapshot.some((v, i) => v !== cells[i])) {
      undoStack.push(strokeSnapshot);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack = [];
    }
    strokeSnapshot = null;
  }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(snap());
    cells = undoStack.pop();
    return true;
  }
  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(snap());
    cells = redoStack.pop();
    return true;
  }

  function setSymmetry(mode) { if (Symmetry.MODES.includes(mode)) symmetry = mode; }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cols, rows, cells, symmetry }));
  }
  function load() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || !Array.isArray(saved.cells) || saved.cells.length !== saved.cols * saved.rows) return false;
    cols = saved.cols; rows = saved.rows; cells = saved.cells;
    setSymmetry(saved.symmetry);
    return true;
  }
  function exportData(colorList) {
    return {
      cols, rows, cells, symmetry,
      usage: colorList.map((color, i) => ({ color, count: cells.filter(v => v === i).length }))
    };
  }

  return {
    init, resize,
    beginStroke, paint, endStroke,
    undo, redo,
    setSymmetry, save, load, exportData,
    cols: () => cols,
    rows: () => rows,
    cells: () => cells,
    symmetry: () => symmetry
  };
})();
