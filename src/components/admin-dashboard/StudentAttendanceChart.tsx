import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyAttendanceData {
  month: string;
  attendance: number;
  totalStudents: number;
}

interface TrackedStudent {
  id: string;
  name: string;
}

interface StudentAttendanceChartProps {
  data: MonthlyAttendanceData[];
  loading: boolean;
  trackedStudents?: TrackedStudent[];
}

export default function StudentAttendanceChart({ data, loading, trackedStudents = [] }: StudentAttendanceChartProps) {
  if (loading) {
    return (
      <Card className="bg-card-elevated shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-palette-dark-red flex items-center gap-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Student Attendance
          </CardTitle>
          <CardDescription>Loading attendance data...</CardDescription>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Student Attendance
          </CardTitle>
          <CardDescription>No attendance data found for the selected period.</CardDescription>
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
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const chartData = data.map(item => ({
    ...item,
    month: formatMonth(item.month),
    attendance: Math.round(item.attendance)
  }));

  return (
    <Card className="bg-card-elevated shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-palette-dark-red flex items-center gap-2">   
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Student Attendance
        </CardTitle>
          <CardDescription>Monthly attendance record counts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [
                  `${value} record(s)`,
                  'Attendance'
                ]}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Bar
                dataKey="attendance"
                fill="#059669"
                radius={[4, 4, 0, 0]}
                stroke="#047857"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Student Legend */}
        {trackedStudents && trackedStudents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-palette-golden/30">
            <div className="flex items-center gap-2 flex-wrap">
              <svg className="h-4 w-4 text-palette-dark-teal flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xs font-semibold text-palette-dark-teal whitespace-nowrap">Tracking Attendance For:</p>
              <div className="flex flex-wrap gap-2">
                {trackedStudents.map((student) => (
                  <span
                    key={student.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-palette-golden/20 text-palette-dark-red border border-palette-golden/40"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-palette-golden"></span>
                    {student.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-palette-golden/30">
          <div className="text-center">
            <div className="text-lg font-bold text-palette-dark-red">
              {data.length > 0 ? Math.round(data.reduce((sum, item) => sum + item.attendance, 0) / data.length) : '0'}
            </div>
            <div className="text-sm text-palette-dark-teal">Avg Records/Month</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-palette-dark-red">
              {data.length > 0 ? Math.max(...data.map(item => item.attendance)) : '0'}
            </div>
            <div className="text-sm text-palette-dark-teal">Max Records</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-palette-dark-red">
              {data.length > 0 ? Math.min(...data.map(item => item.attendance)) : '0'}
            </div>
            <div className="text-sm text-palette-dark-teal">Min Records</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
