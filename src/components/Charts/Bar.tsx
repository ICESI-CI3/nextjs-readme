'use client';

type ChartDatum = {
  label: string;
  value: number;
};

type BarChartProps = {
  data: ChartDatum[];
  maxValue?: number;
};

const BarChart = ({ data, maxValue }: BarChartProps) => {
  if (!data?.length) {
    return <p className="text-sm text-slate-400">No data available.</p>;
  }

  const limit = maxValue ?? Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percent = Math.round((item.value / limit) * 100);
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${percent}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
