"use client";
import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip, Filler);

export type ChartType = 'line' | 'bar';

export interface ChartSeries {
  label: string;
  data: number[];
  color?: string;
  fill?: boolean;
}

export default function ChartCard({
  title,
  labels,
  series,
  type = 'line',
}: {
  title: string;
  labels: string[];
  series: ChartSeries[];
  type?: ChartType;
}) {
  const data = useMemo(() => ({
    labels,
    datasets: series.map(s => ({
      label: s.label,
      data: s.data,
      borderColor: s.color || 'rgb(99, 102, 241)',
      backgroundColor: (s.color || 'rgb(99, 102, 241)') + '33',
      tension: 0.3,
      fill: s.fill ?? false,
      pointRadius: 2,
    })),
  }), [labels, series]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true }, tooltip: { mode: 'index', intersect: false } },
    interaction: { mode: 'index', intersect: false },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  } as const), []);

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
      <div className="font-semibold mb-2">{title}</div>
      <div style={{ height: 280 }}>
        {type === 'line' ? (
          <Line data={data} options={options} />
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  );
}

