import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueData[];
  loading: boolean;
}

export default function MonthlyRevenueChart({ data, loading }: MonthlyRevenueChartProps) {
  if (loading) {
    return (
      <Card className="bg-card-elevated shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-palette-dark-red flex items-center gap-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Monthly Revenue
          </CardTitle>
          <CardDescription>Loading revenue data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-palette-golden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <Card className="bg-card-elevated shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-palette-dark-red flex items-center gap-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Monthly Revenue
          </CardTitle>
          <CardDescription>No revenue data found for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full flex items-center justify-center text-palette-dark-teal">
            No data to display.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatMonth = (monthStr: string) => {
    try {
      // Handle YYYY-MM format by appending -01
      const dateStr = monthStr.includes('T') ? monthStr : `${monthStr}-01`;
      const date = new Date(dateStr);
      
      // Validate date is valid
      if (isNaN(date.getTime())) {
        // Fallback: try to parse as YYYY-MM
        const parts = monthStr.split('-');
        if (parts.length >= 2) {
          const year = parts[0];
          const month = parts[1];
          return `${new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' })} ${year.slice(-2)}`;
        }
        return monthStr; // Return original if all parsing fails
      }
      
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch (error) {
      // Fallback to showing the month string if parsing fails
      return monthStr;
    }
  };

  const chartData = data
    .filter(item => item && item.month && typeof item.revenue === 'number' && !isNaN(item.revenue))
    .map(item => ({
      ...item,
      month: formatMonth(item.month),
      revenue: Math.round(item.revenue || 0)
    }));

  return (
    <Card className="bg-card-elevated shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-palette-dark-red flex items-center gap-2">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Monthly Revenue
        </CardTitle>
        <CardDescription>Revenue trends over the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full min-h-[320px] min-w-[300px]" style={{ minHeight: '320px', minWidth: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#dc2626" 
                strokeWidth={3}
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-palette-golden/30">
          <div className="text-center">
            <div className="text-lg font-bold text-palette-dark-red">
              {data.length > 0 ? (
                (() => {
                  const validData = data.filter(item => typeof item.revenue === 'number' && !isNaN(item.revenue));
                  const avg = validData.length > 0 
                    ? validData.reduce((sum, item) => sum + (item.revenue || 0), 0) / validData.length 
                    : 0;
                  return `₹${Math.round(avg).toLocaleString()}`;
                })()
              ) : '₹0'}
            </div>
            <div className="text-sm text-palette-dark-teal">Avg Monthly</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-palette-dark-red">
              {data.length > 0 ? (
                (() => {
                  const validData = data.filter(item => typeof item.revenue === 'number' && !isNaN(item.revenue));
                  const total = validData.reduce((sum, item) => sum + (item.revenue || 0), 0);
                  return `₹${Math.round(total).toLocaleString()}`;
                })()
              ) : '₹0'}
            </div>
            <div className="text-sm text-palette-dark-teal">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-palette-dark-red">
              {data.length > 1 ? (
                (() => {
                  const last = data[data.length - 1]?.revenue;
                  const prev = data[data.length - 2]?.revenue;
                  if (typeof last === 'number' && typeof prev === 'number' && !isNaN(last) && !isNaN(prev)) {
                    return last > prev ? '↗' : '↘';
                  }
                  return '—';
                })()
              ) : '—'}
            </div>
            <div className="text-sm text-palette-dark-teal">Trend</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
