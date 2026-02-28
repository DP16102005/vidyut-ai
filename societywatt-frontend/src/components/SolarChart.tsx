import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SolarSummary } from '../types';

interface SolarChartProps {
    chartData: SolarSummary['chart_data'];
}

export default function SolarChart({ chartData }: SolarChartProps) {
    const data = chartData.map(d => ({
        ...d,
        dateLabel: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    }));

    return (
        <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="generation" name="Generated" stroke="var(--positive)" fill="var(--positive-bg)" fillOpacity={0.6} />
                <Area type="monotone" dataKey="self_consumed" name="Self-consumed" stroke="var(--info)" fill="var(--info-bg)" fillOpacity={0.4} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
