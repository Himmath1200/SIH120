import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { AXIS, TOOLTIP } from "./ui";

export interface Series { key: string; name: string; color: string; dashed?: boolean; yAxis?: "left" | "right" }

export function LineChartBox({ data, xKey, xLabel, series, height = 260, logY = false, yUnit, refX }: {
  data: object[]; xKey: string; xLabel?: string; series: Series[]; height?: number; logY?: boolean; yUnit?: string; refX?: number;
}) {
  const hasRight = series.some((s) => s.yAxis === "right");
  return (
    <div style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: hasRight ? 8 : 16, left: -8, bottom: xLabel ? 16 : 0 }}>
          <CartesianGrid stroke="#22314f" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} label={xLabel ? { value: xLabel, position: "insideBottom", offset: -8, fill: "#64748b", fontSize: 11 } : undefined} />
          <YAxis yAxisId="left" {...AXIS} scale={logY ? "log" : "auto"} domain={logY ? ["auto", "auto"] : undefined} unit={yUnit} allowDataOverflow />
          {hasRight && <YAxis yAxisId="right" orientation="right" {...AXIS} />}
          <Tooltip {...TOOLTIP} />
          {series.length > 1 && <Legend verticalAlign="top" height={26} wrapperStyle={{ fontSize: 12 }} />}
          {refX !== undefined && <ReferenceLine x={refX} yAxisId="left" stroke="#64748b" strokeDasharray="4 4" />}
          {series.map((s) => (
            <Line key={s.key} yAxisId={s.yAxis ?? "left"} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
              strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "6 4" : undefined} isAnimationActive animationDuration={1100} animationEasing="ease-out" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
