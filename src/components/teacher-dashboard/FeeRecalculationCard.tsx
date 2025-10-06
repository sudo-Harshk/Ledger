import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, RefreshCw, Users, Calculator } from 'lucide-react';
import { useStudentFeeRecalculation } from '@/hooks/useStudentFeeRecalculation';
import { useStudents } from '@/hooks/useStudents';
import toast from 'react-hot-toast';

export const FeeRecalculationCard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { students } = useStudents();
  const { 
    isRecalculating, 
    progress, 
    recalculateAllStudents,
    recalculateSingleStudent 
  } = useStudentFeeRecalculation();

  const handleRecalculateAll = async () => {
    await recalculateAllStudents(selectedMonth);
  };

  const handleRecalculateStudent = async (studentId: string) => {
    await recalculateSingleStudent(studentId, selectedMonth);
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-6 w-6 text-blue-600" />
          Fee Recalculation
        </CardTitle>
        <CardDescription className="text-gray-600">
          Recalculate student fees based on approved attendance records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Selector */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-600" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Target Month:</label>
              <input
                type="month"
                value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Progress Display */}
        {isRecalculating && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-blue-800">Processing students...</span>
              <span className="text-blue-600 font-semibold">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((progress.current / progress.total) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Please wait while fees are being recalculated...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={handleRecalculateAll}
            disabled={isRecalculating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-11"
            size="lg"
          >
            <RefreshCw className={`h-5 w-5 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculating...' : 'Recalculate All Students'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              const monthString = selectedMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              });
              toast.success(`Ready to recalculate fees for ${monthString}`);
            }}
            disabled={isRecalculating}
            className="h-11"
          >
            <Users className="h-5 w-5 mr-2" />
            {students.length} Students
          </Button>
        </div>

        {/* Individual Student Actions */}
        <div className="border-t pt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
              <span>Individual Student Recalculation</span>
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </summary>
            <div className="mt-3 bg-gray-50 p-3 rounded-lg max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {students.map((student) => (
                  <div key={student.id} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                    <span className="text-sm font-medium text-gray-800">{student.displayName}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRecalculateStudent(student.id)}
                      disabled={isRecalculating}
                      className="h-8 w-8 p-0 hover:bg-blue-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">No students found</p>
                )}
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
};
