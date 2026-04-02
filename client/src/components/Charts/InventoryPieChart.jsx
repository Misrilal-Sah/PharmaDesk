import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';

const COLORS = [
  '#15803D', '#0369A1', '#D97706', '#DC2626',
  '#7C3AED', '#0891B2', '#059669', '#9333EA'
];

export default function InventoryPieChart({ data = [], height = 300 }) {
  const formatCurrency = (value) => `₹${value.toLocaleString()}`;
  
  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No inventory data available</p>
      </div>
    );
  }

  const renderCustomLabel = ({ name, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for small slices
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="45%"
          cy="55%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={75}
          innerRadius={45}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-md)'
          }}
          formatter={(value, name) => [formatCurrency(value), 'Stock Value']}
        />
        <Legend 
          layout="vertical" 
          align="right" 
          verticalAlign="middle"
          wrapperStyle={{ paddingLeft: '20px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
