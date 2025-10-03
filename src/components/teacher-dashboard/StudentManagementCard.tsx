import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label } from '@/components/ui';
import { useState } from 'react';
import { useStudents, useAuth } from '@/hooks';

export default function StudentManagementCard() {
  const { user } = useAuth();
  const { students, loadingStudents, createUserLoading, refetchStudents, createStudentAccount, deleteStudentAccount } = useStudents();
  
  // Local state for create student form
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentMonthlyFee, setNewStudentMonthlyFee] = useState(0);

  const handleCreateStudent = async () => {
    if (!user?.uid) return;
    
    const success = await createStudentAccount(
      newStudentUsername,
      newStudentName,
      newStudentPassword,
      newStudentMonthlyFee,
      user.uid
    );
    
    if (success) {
      // Reset form
      setNewStudentUsername('');
      setNewStudentName('');
      setNewStudentPassword('');
      setNewStudentMonthlyFee(0);
      setShowCreateUser(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Student Management</CardTitle>
            <CardDescription>Create and manage student accounts</CardDescription>
          </div>
          <Button 
            onClick={() => setShowCreateUser(!showCreateUser)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {showCreateUser ? 'Cancel' : 'Create New Student'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchStudents()}
            disabled={loadingStudents}
            className="ml-2"
          >
            {loadingStudents ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showCreateUser && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-4">Create New Student Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studentName">Student Name</Label>
                <Input
                  id="studentName"
                  type="text"
                  value={newStudentName || ''}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Enter student's full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="studentUsername">Username</Label>
                <Input
                  id="studentUsername"
                  type="text"
                  value={newStudentUsername || ''}
                  onChange={(e) => setNewStudentUsername(e.target.value)}
                  placeholder="Enter student's username"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="studentPassword">Password</Label>
                <Input
                  id="studentPassword"
                  type="password"
                  value={newStudentPassword || ''}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="studentMonthlyFee">Monthly Fee (₹)</Label>
                <Input
                  id="studentMonthlyFee"
                  type="number"
                  value={newStudentMonthlyFee || 0}
                  onChange={(e) => setNewStudentMonthlyFee(Number(e.target.value))}
                  placeholder="Enter monthly fee"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={handleCreateStudent}
                disabled={createUserLoading}
                className="w-full sm:w-auto"
              >
                {createUserLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        )}
        {/* Students List */}
        {loadingStudents ? (
          <div className="min-h-[160px] animate-pulse" />
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium">Existing Students ({students.length})</h4>
            {students.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No students found</p>
            ) : (
              students.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{student.displayName}</p>
                    <p className="text-sm text-gray-600">
                      @{student.username} • ₹{student.monthlyFee}/month
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {(() => {
                        const d = student.createdAt;
                        if (!d) return '';
                        if (typeof d === 'object' && !(d instanceof Date) && typeof (d as any).toDate === 'function') {
                          return (d as any).toDate().toLocaleDateString();
                        } else if (typeof d === 'string' || typeof d === 'number') {
                          return new Date(d).toLocaleDateString();
                        } else if (d instanceof Date) {
                          return d.toLocaleDateString();
                        } else {
                          return '';
                        }
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Active
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStudentAccount(student.id, student.username)}
                      className="text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-colors duration-200"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
