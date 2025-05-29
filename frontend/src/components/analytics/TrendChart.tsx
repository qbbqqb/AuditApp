import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TrendData {
  date: string;
  newFindings: number;
  closedFindings: number;
  overdueFindings: number;
}

interface TrendChartProps {
  data: TrendData[];
  title: string;
  type?: 'line' | 'area';
  height?: number;
  loading?: boolean;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  type = 'line',
  height = 300,
  loading = false
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface p-3 shadow-lg rounded-lg border border-default">
          <p className="text-primary font-medium">{`Date: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-surface p-6 rounded-lg shadow-base border border-default">
        <h3 className="text-lg font-medium text-primary mb-4">{title}</h3>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-64 rounded"></div>
        </div>
      </div>
    );
  }

  const Chart = type === 'area' ? AreaChart : LineChart;

  return (
    <div className="bg-surface p-6 rounded-lg shadow-base border border-default">
      <h3 className="text-lg font-medium text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {type === 'area' ? (
            <>
              <Area
                type="monotone"
                dataKey="newFindings"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="New Findings"
              />
              <Area
                type="monotone"
                dataKey="closedFindings"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Closed Findings"
              />
              <Area
                type="monotone"
                dataKey="overdueFindings"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Overdue Findings"
              />
            </>
          ) : (
            <>
              <Line
                type="monotone"
                dataKey="newFindings"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="New Findings"
              />
              <Line
                type="monotone"
                dataKey="closedFindings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Closed Findings"
              />
              <Line
                type="monotone"
                dataKey="overdueFindings"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Overdue Findings"
              />
            </>
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart; 