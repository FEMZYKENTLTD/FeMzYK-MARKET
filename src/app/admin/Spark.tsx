export default function Spark({ data, labels }: { data: number[]; labels: string[] }) {
  if (!data.length) return <p className="text-sm text-mist-500">No data yet — chart appears after your first sales.</p>;
  const max = Math.max(...data, 1);
  const w = 560;
  const h = 140;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 16) - 4] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Revenue over time">
        <defs>
          <linearGradient id="gold-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A24B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C9A24B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#gold-fade)" />
        <path d={path} fill="none" stroke="#D9B96A" strokeWidth="2" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#D9B96A" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-mist-500 mt-1">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}
