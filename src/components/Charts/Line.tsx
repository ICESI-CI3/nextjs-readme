'use client';

type ChartDatum = {
  label: string;
  value: number;
};

type LineChartProps = {
  data: ChartDatum[];
  height?: number;
};

const LineChart = ({ data, height = 120 }: LineChartProps) => {
  if (!data?.length) {
    return <p className="text-sm text-slate-400">No data available.</p>;
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;

  const points = data
    .map((item, index) => {
      const x = index * stepX;
      const y = 100 - (item.value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height }}
        className="overflow-visible text-blue-500"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {data.map((item, index) => {
          const x = index * stepX;
          const y = 100 - (item.value / maxValue) * 100;
          return <circle key={item.label} cx={x} cy={y} r={2.5} fill="currentColor" />;
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 sm:grid-cols-6">
        {data.map((item) => (
          <div key={item.label} className="text-center">
            <div className="font-medium text-slate-700">{item.value}</div>
            <div>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineChart;
