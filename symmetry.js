/* 对称规则：由格子坐标计算镜像落点，越界忽略、中轴重复只算一次 */
const Symmetry = (() => {
  const MODES = ["off", "horizontal", "vertical", "quad"];
  const LABELS = { off: "关闭", horizontal: "左右对称", vertical: "上下对称", quad: "四向对称" };

  /* 单点镜像：返回含原点在内的全部对称坐标（中轴上的点会映到自身） */
  function mirrorPoint(x, y, cols, rows, mode) {
    const pts = [[x, y]];
    if (mode === "horizontal" || mode === "quad") pts.push([cols - 1 - x, y]);
    if (mode === "vertical" || mode === "quad") pts.push([x, rows - 1 - y]);
    if (mode === "quad") pts.push([cols - 1 - x, rows - 1 - y]);
    return pts;
  }

  /* 一组坐标点 -> 镜像展开后去重、去越界的下标列表 */
  function resolve(points, cols, rows, mode) {
    const seen = new Set();
    const out = [];
    points.forEach(([x, y]) => {
      mirrorPoint(x, y, cols, rows, mode).forEach(([mx, my]) => {
        if (mx < 0 || mx >= cols || my < 0 || my >= rows) return;
        const i = my * cols + mx;
        if (seen.has(i)) return;
        seen.add(i);
        out.push(i);
      });
    });
    return out;
  }

  return { MODES, LABELS, resolve };
})();
