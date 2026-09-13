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
  const line = coordinates.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
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
