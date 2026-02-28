import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatINR, formatMonth } from '../utils/format';

interface BillTrendChartProps {
    data: { month: string; total_bill: number; composite_score: number }[];
    height?: number;
}

export default function BillTrendChart({ data, height = 220 }: BillTrendChartProps) {
    const formatted = data.map(d => ({ ...d, monthLabel: formatMonth(d.month) }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => {
                        if (name === 'total_bill') return [formatINR(value), 'Bill'];
                        return [`${value}/100`, 'Score'];
                    }}
                    labelFormatter={(label: string) => label}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => v === 'total_bill' ? 'Bill Amount' : 'Score'} />
                <Bar yAxisId="left" dataKey="total_bill" fill="var(--surface-2)" stroke="var(--border)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" dataKey="composite_score" stroke="var(--positive)" strokeWidth={2} dot={{ r: 3, fill: 'var(--positive)' }} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
