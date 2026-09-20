import { svg } from "./dom.js";

export function sparkline(values) {
  if (!values || values.length === 0) return null;
  const width = 100;
  const height = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const point = (value, index) => {
    const x = values.length > 1 ? index * step : width / 2;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return [x, y];
  };
  const coordinates = values.map(point);
  const at = (index) => coordinates[Math.min(coordinates.length - 1, Math.max(0, index))];
  const clamp = (y) => Math.min(height - 3, Math.max(3, y));
  let line = `M${coordinates[0][0].toFixed(2)} ${coordinates[0][1].toFixed(2)}`;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [x0, y0] = at(index - 1);
    const [x1, y1] = at(index);
    const [x2, y2] = at(index + 1);
    const [x3, y3] = at(index + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = clamp(y1 + (y2 - y0) / 6);
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = clamp(y2 - (y3 - y1) / 6);
    line += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return svg(
    "svg",
    { class: "spark", viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "none", "aria-hidden": "true" },
    [
      svg("path", { class: "area", d: area }),
      svg("path", { d: line, "vector-effect": "non-scaling-stroke" })
    ]
  );
}
