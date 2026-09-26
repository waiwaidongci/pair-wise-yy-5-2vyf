// 对称规则：按对称方式把落笔点镜像到其它象限，越界忽略，中轴重复位置只算一次。
const Symmetry = (() => {
  const MODES = [
    { value: "none", label: "关闭" },
    { value: "horizontal", label: "左右对称" },
    { value: "vertical", label: "上下对称" },
    { value: "four", label: "四向对称" },
  ];

  // 某一点在给定对称方式下的全部落点（含自身），越界忽略、中轴去重。
  function mirror(x, y, cols, rows, mode) {
    const xs = [x], ys = [y];
    if (mode === "horizontal" || mode === "four") xs.push(cols - 1 - x);
    if (mode === "vertical" || mode === "four") ys.push(rows - 1 - y);
    const seen = new Set(), points = [];
    xs.forEach(px => ys.forEach(py => {
      if (px < 0 || px >= cols || py < 0 || py >= rows) return;
      const index = py * cols + px;
      if (seen.has(index)) return;
      seen.add(index);
      points.push({ x: px, y: py, index });
    }));
    return points;
  }

  // 把一组格子索引按对称方式展开成完整落点集合（跨来源也去重）。
  function expand(indices, cols, rows, mode) {
    const seen = new Set(), out = [];
    indices.forEach(i => {
      mirror(i % cols, Math.floor(i / cols), cols, rows, mode).forEach(p => {
        if (seen.has(p.index)) return;
        seen.add(p.index);
        out.push(p.index);
      });
    });
    return out;
  }

  return { MODES, mirror, expand };
})();
