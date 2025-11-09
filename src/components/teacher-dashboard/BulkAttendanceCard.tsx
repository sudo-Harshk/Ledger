import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label } from '@/components/ui';
import type { StudentAccount } from '@/types';

interface BulkAttendanceCardProps {
  showBulkAttendance: boolean;
  setShowBulkAttendance: (show: boolean) => void;
  bulkStartDate: string;
  bulkEndDate: string;
  setBulkStartDate: (date: string) => void;
  setBulkEndDate: (date: string) => void;
  bulkAttendanceLoading: boolean;
  defaultAttendanceStatus: 'present' | 'absent';
  setDefaultAttendanceStatus: (status: 'present' | 'absent') => void;
  selectedStudents: string[];
  toggleStudentSelection: (studentId: string) => void;
  selectAllStudents: () => void;
  revenuePreview: { days: number; dailyRate: number; total: number };
  addBulkAttendance: () => Promise<void>;
  getCellClasses: (day: number | null, currentMonth: Date) => string;
  handleCalendarDayClick: (day: number | null, currentMonth: Date) => void;
  students: StudentAccount[];
  currentMonth: Date;
  daysInMonth: (number | null)[];
  changeMonth: (direction: 'prev' | 'next') => void;
}

export default function BulkAttendanceCard({ 
  showBulkAttendance, 
  setShowBulkAttendance,
  bulkStartDate,
  bulkEndDate,
  setBulkStartDate,
  setBulkEndDate,
  bulkAttendanceLoading,
  defaultAttendanceStatus,
  setDefaultAttendanceStatus,
  selectedStudents,
  toggleStudentSelection,
  selectAllStudents,
  revenuePreview,
  addBulkAttendance,
  getCellClasses,
  handleCalendarDayClick,
  students,
  currentMonth,
  daysInMonth,
  changeMonth
}: BulkAttendanceCardProps) {
  
  const PLATFORM_START = new Date(import.meta.env.VITE_PLATFORM_START || '2025-08-01');
  
  if (!showBulkAttendance) return null;
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Add Bulk Approved Attendance</CardTitle>
        <CardDescription>Enter a date range to add approved attendance for all students.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Student Selection */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-800">
              Select Students to Track ({selectedStudents.length}/{students.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllStudents}
              className="text-xs"
            >
              Select All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
            {students.map((student) => (
              <label 
                key={student.id}
                className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => toggleStudentSelection(student.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-800">{student.displayName}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Month navigation for selection calendar */}
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Select Date Range</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => changeMonth('prev')}>←</Button>
            <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => changeMonth('next')}>→</Button>
          </div>
        </div>
        {/* Calendar Legend */}
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-green-800">Present Attendance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span className="text-red-700">Absent Attendance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-blue-800">Selected Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span className="text-blue-800">Date Range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border rounded"></div>
            <span className="text-gray-600">No Attendance</span>
          </div>
        </div>
        {/* Selection Calendar - hidden on mobile, visible on sm+ */}
        <div className="hidden sm:block mb-4">
          <div className="overflow-x-auto">
            <div className="min-w-[560px] grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-muted-foreground">{day}</div>
              ))}
              {currentMonth < PLATFORM_START ? (
                <div className="text-center text-red-600 font-semibold py-8 col-span-7">
                  Started using platform from August 2025
                </div>
              ) : (
                daysInMonth.map((day: number | null, idx: number) => (
                  <div
                    key={idx}
                    className={`relative p-2 text-center border rounded-md min-h-[40px] flex items-center justify-center ${(!bulkStartDate || !bulkEndDate) ? 'cursor-pointer' : ''} ${getCellClasses(day, currentMonth)}`}
                    onClick={() => handleCalendarDayClick(day, currentMonth)}
                  >
                    {day && <span className="font-medium select-none">{day}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Alternative content for mobile */}
        <div className="sm:hidden mb-4">
          <Card>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Bulk attendance calendar is available on larger screens.
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Attendance Status Selector */}
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <Label className="text-sm font-medium mb-3 block">Mark Selected Range as:</Label>
          <div className="flex gap-0 items-center rounded-lg overflow-hidden border w-fit bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setDefaultAttendanceStatus('present')}
              className={`px-4 py-2 font-medium focus:outline-none border-r border-gray-200 transition duration-150 ease-in-out ${defaultAttendanceStatus === 'present' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 hover:bg-blue-50'}`}
              aria-pressed={defaultAttendanceStatus === 'present'}
            >
              Present
            </button>
            <button
              type="button"
              onClick={() => setDefaultAttendanceStatus('absent')}
              className={`px-4 py-2 font-medium focus:outline-none border-r border-gray-200 transition duration-150 ease-in-out ${defaultAttendanceStatus === 'absent' ? 'bg-red-600 text-white' : 'bg-white text-gray-800 hover:bg-red-50'}`}
              aria-pressed={defaultAttendanceStatus === 'absent'}
            >
              Absent
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Tip: After selecting a date range, click on individual days to toggle their status
          </p>
        </div>
        {/* Quick Date Presets */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Quick Presets:</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                setBulkStartDate(weekAgo.toISOString().slice(0, 10));
                setBulkEndDate(today.toISOString().slice(0, 10));
              }}
              className="text-xs"
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setBulkStartDate(monthStart.toISOString().slice(0, 10));
                setBulkEndDate(monthEnd.toISOString().slice(0, 10));
              }}
              className="text-xs"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setBulkStartDate(today.toISOString().slice(0, 10));
                setBulkEndDate(today.toISOString().slice(0, 10));
              }}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkStartDate('');
                setBulkEndDate('');
              }}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="bulkStartDate">Start Date</Label>
            <Input
              id="bulkStartDate"
              type="date"
              value={bulkStartDate}
              onChange={(e) => setBulkStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bulkEndDate">End Date</Label>
            <Input
              id="bulkEndDate"
              type="date"
              value={bulkEndDate}
              onChange={(e) => setBulkEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        {/* Preview Section */}
        {bulkStartDate && bulkEndDate && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Preview:</h4>
            <p className="text-sm text-blue-700">
              Will mark <strong>{selectedStudents.length}</strong> selected students as <strong>{defaultAttendanceStatus === 'present' ? 'Present' : 'Absent'}</strong>{' '}
              {bulkStartDate === bulkEndDate ? (
                <>for <strong>{bulkStartDate}</strong></>
              ) : (
                <>from <strong>{bulkStartDate}</strong> to <strong>{bulkEndDate}</strong></>
              )}
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Total records: <strong>{selectedStudents.length * ((bulkStartDate === bulkEndDate) ? 1 : Math.ceil((new Date(bulkEndDate).getTime() - new Date(bulkStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)}</strong>
            </p>
            {/* Revenue Preview */}
            {defaultAttendanceStatus === 'present' && revenuePreview.days > 0 && revenuePreview.dailyRate > 0 && (
              <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded">
                <div className="font-semibold text-blue-900 mb-1">Estimated Revenue for this period:</div>
                <div className="text-blue-800 text-sm">
                  {revenuePreview.days} days × ₹{(revenuePreview.dailyRate).toFixed(2)}/day = <span className="font-bold">₹{(revenuePreview.total).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            onClick={addBulkAttendance}
            disabled={bulkAttendanceLoading || !bulkStartDate || !bulkEndDate || selectedStudents.length === 0}
          >
            {bulkAttendanceLoading ? 'Applying...' : 'Apply Attendance'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowBulkAttendance(false);
              setBulkStartDate('');
              setBulkEndDate('');
              setDefaultAttendanceStatus('present');
            }}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
