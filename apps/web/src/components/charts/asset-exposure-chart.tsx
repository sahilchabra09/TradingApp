"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AssetExposureChartProps {
  data: { asset: string; value: number; percentage: number }[];
}

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
];

export function AssetExposureChart({ data }: AssetExposureChartProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-5 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold">Asset Exposure</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              nameKey="asset"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(17,24,39,0.95)",
                border: "1px solid rgba(75,85,99,0.4)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e5e7eb",
              }}
              formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Exposure"]}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
