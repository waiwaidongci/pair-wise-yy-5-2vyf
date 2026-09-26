// 画布状态：格子数据、行列数、对称方式、笔画合并、撤销重做与尺寸调整。
const CanvasState = (() => {
  const HISTORY_LIMIT = 50;

  function create(cols, rows) {
    return {
      cols, rows,
      cells: Array(cols * rows).fill(0),
      symmetry: "none",
      undoStack: [], redoStack: [],
      strokeSnapshot: null,
    };
  }

  function snapshotOf(state) {
    return { cols: state.cols, rows: state.rows, cells: [...state.cells] };
  }

  function pushHistory(state) {
    state.undoStack.push(snapshotOf(state));
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack = [];
  }

  // 一笔开始：先记下快照，整笔结束才入历史，一次拖动的格子合为一笔。
  function beginStroke(state) {
    if (state.strokeSnapshot) return;
    state.strokeSnapshot = snapshotOf(state);
  }

  function applyCells(state, indices, color) {
    indices.forEach(i => { if (i >= 0 && i < state.cells.length) state.cells[i] = color; });
  }

  function endStroke(state) {
    if (!state.strokeSnapshot) return;
    const before = state.strokeSnapshot;
    state.strokeSnapshot = null;
    const changed = before.cells.some((v, i) => v !== state.cells[i]);
    if (!changed) return;
    state.undoStack.push(before);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack = [];
  }

  function restore(state, snap) {
    state.cols = snap.cols;
    state.rows = snap.rows;
    state.cells = [...snap.cells];
  }

  function undo(state) {
    if (!state.undoStack.length) return false;
    state.redoStack.push(snapshotOf(state));
    restore(state, state.undoStack.pop());
    return true;
  }

  function redo(state) {
    if (!state.redoStack.length) return false;
    state.undoStack.push(snapshotOf(state));
    restore(state, state.redoStack.pop());
    return true;
  }

  // 调整行列数：已画内容保留，超出部分裁掉，新增部分留空，后续笔迹按新中轴计算。
  function resize(state, cols, rows) {
    if (cols === state.cols && rows === state.rows) return;
    pushHistory(state);
    const next = Array(cols * rows).fill(0);
    for (let y = 0; y < Math.min(rows, state.rows); y++)
      for (let x = 0; x < Math.min(cols, state.cols); x++)
        next[y * cols + x] = state.cells[y * state.cols + x];
    state.cols = cols;
    state.rows = rows;
    state.cells = next;
  }

  function serialize(state) {
    return { cols: state.cols, rows: state.rows, cells: [...state.cells], symmetry: state.symmetry };
  }

  function deserialize(state, data) {
    if (!data || !Number.isInteger(data.cols) || !Number.isInteger(data.rows)) return false;
    if (data.cols < 1 || data.rows < 1 || !Array.isArray(data.cells)) return false;
    state.cols = data.cols;
    state.rows = data.rows;
    state.cells = data.cells.slice(0, data.cols * data.rows).map(v => Number.isInteger(v) ? v : 0);
    while (state.cells.length < data.cols * data.rows) state.cells.push(0);
    state.symmetry = Symmetry.MODES.some(m => m.value === data.symmetry) ? data.symmetry : "none";
    state.undoStack = [];
    state.redoStack = [];
    state.strokeSnapshot = null;
    return true;
  }

  return { create, beginStroke, applyCells, endStroke, undo, redo, resize, serialize, deserialize };
})();
