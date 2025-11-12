import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label } from '@/components/ui';
import { useState } from 'react';
import { useStudents, useAuth } from '@/hooks';
import { ConfirmationDialog } from '@/components';
import logger from '@/lib/logger';

export default function StudentManagementCard() {
  const { user } = useAuth();
  const { students, loadingStudents, createUserLoading, refetchStudents, createStudentAccount, toggleStudentActiveStatus, deleteStudentAccount } = useStudents();
  
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentMonthlyFee, setNewStudentMonthlyFee] = useState(0);
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);
  
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    type: 'discontinue' | 'reactivate' | 'delete' | null;
    studentId: string | null;
    studentName: string | null;
    studentUsername?: string | null;
    currentStatus?: boolean | undefined;
  }>({
    open: false,
    type: null,
    studentId: null,
    studentName: null,
    studentUsername: null,
    currentStatus: undefined
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateStudent = async () => {
    if (!user?.uid) return;
    
    const success = await createStudentAccount(
      newStudentUsername,
      newStudentName,
      newStudentEmail,
      newStudentPassword,
      newStudentMonthlyFee,
      user.uid
    );
    
    if (success) {
      setNewStudentUsername('');
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentPassword('');
      setNewStudentMonthlyFee(0);
      setShowCreateUser(false);
    }
  };
  return (
    <Card className="bg-card-elevated shadow-lg border border-palette-golden/30">
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
                <Label htmlFor="studentEmail">Email</Label>
                <Input
                  id="studentEmail"
                  type="email"
                  value={newStudentEmail || ''}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="Enter student's email (e.g., student@gmail.com)"
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
        {loadingStudents ? (
          <div className="min-h-[160px] animate-pulse" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Existing Students ({students.filter(s => showInactiveStudents || s.isActive !== false).length})
                {students.some(s => s.isActive === false) && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({students.filter(s => s.isActive === false).length} inactive)
                  </span>
                )}
              </h4>
              {students.some(s => s.isActive === false) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInactiveStudents(!showInactiveStudents)}
                  className="text-xs"
                >
                  {showInactiveStudents ? 'Hide Inactive' : 'Show Inactive'}
                </Button>
              )}
            </div>
            {students.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No students found</p>
            ) : (
              students
                .filter(student => showInactiveStudents || student.isActive !== false)
                .map((student) => {
                  const isActive = student.isActive !== false;
                  return (
                    <div 
                      key={student.id} 
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        !isActive ? 'bg-gray-50 opacity-75' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{student.displayName}</p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {isActive ? 'Active' : 'Discontinued'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          @{student.username} • {student.email} • ₹{student.monthlyFee}/month
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {(() => {
                            const d = student.createdAt;
                            if (!d) return '';
                            if (typeof d === 'object' && !(d instanceof Date) && d !== null && 'toDate' in d && typeof d.toDate === 'function') {
                              return (d as { toDate: () => Date }).toDate().toLocaleDateString();
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (isActive) {
                              setConfirmationDialog({
                                open: true,
                                type: 'discontinue',
                                studentId: student.id,
                                studentName: student.displayName,
                                currentStatus: student.isActive
                              });
                            } else {
                              setConfirmationDialog({
                                open: true,
                                type: 'reactivate',
                                studentId: student.id,
                                studentName: student.displayName,
                                currentStatus: student.isActive
                              });
                            }
                          }}
                          className={
                            isActive
                              ? "text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-colors duration-200"
                              : "text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors duration-200"
                          }
                        >
                          {isActive ? 'Mark Discontinued' : 'Reactivate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmationDialog({
                              open: true,
                              type: 'delete',
                              studentId: student.id,
                              studentName: student.displayName,
                              studentUsername: student.username
                            });
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-colors duration-200"
                          title="Permanently delete student account and all records"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </CardContent>
      
      <ConfirmationDialog
        open={confirmationDialog.open && confirmationDialog.type === 'discontinue'}
        onClose={() => {
          if (!isProcessing) {
            setConfirmationDialog({ ...confirmationDialog, open: false });
          }
        }}
        onConfirm={async () => {
          if (confirmationDialog.studentId && confirmationDialog.studentName && confirmationDialog.currentStatus !== undefined) {
            setIsProcessing(true);
            try {
              await toggleStudentActiveStatus(confirmationDialog.studentId, confirmationDialog.studentName, confirmationDialog.currentStatus);
              setConfirmationDialog({ ...confirmationDialog, open: false });
            } catch (error) {
              logger.error('Error toggling student status:', error);
            } finally {
              setIsProcessing(false);
            }
          }
        }}
        title="Mark Student as Discontinued"
        description={`Are you sure you want to mark ${confirmationDialog.studentName || 'this student'} as discontinued?\n\nThis will:\n• Stop analytics and fee calculations for this student\n• Preserve all attendance records and history\n• The student account and data will remain intact\n• You can reactivate them later if needed`}
        confirmText="Mark Discontinued"
        cancelText="Cancel"
        confirmVariant="default"
        loading={isProcessing}
      />
      
      <ConfirmationDialog
        open={confirmationDialog.open && confirmationDialog.type === 'reactivate'}
        onClose={() => {
          if (!isProcessing) {
            setConfirmationDialog({ ...confirmationDialog, open: false });
          }
        }}
        onConfirm={async () => {
          if (confirmationDialog.studentId && confirmationDialog.studentName && confirmationDialog.currentStatus !== undefined) {
            setIsProcessing(true);
            try {
              await toggleStudentActiveStatus(confirmationDialog.studentId, confirmationDialog.studentName, confirmationDialog.currentStatus);
              setConfirmationDialog({ ...confirmationDialog, open: false });
            } catch (error) {
              logger.error('Error toggling student status:', error);
            } finally {
              setIsProcessing(false);
            }
          }
        }}
        title="Reactivate Student"
        description={`Reactivate ${confirmationDialog.studentName || 'this student'}?\n\nThis will:\n• Resume analytics and fee calculations\n• Include them in bulk attendance operations\n• All historical data will be preserved and accessible\n• Analytics will continue from where they left off`}
        confirmText="Reactivate"
        cancelText="Cancel"
        confirmVariant="default"
        loading={isProcessing}
      />
      
      <ConfirmationDialog
        open={confirmationDialog.open && confirmationDialog.type === 'delete'}
        onClose={() => {
          if (!isProcessing) {
            setConfirmationDialog({ ...confirmationDialog, open: false });
          }
        }}
        onConfirm={async () => {
          if (confirmationDialog.studentId && confirmationDialog.studentUsername) {
            setIsProcessing(true);
            try {
              await deleteStudentAccount(confirmationDialog.studentId, confirmationDialog.studentUsername);
              setConfirmationDialog({ ...confirmationDialog, open: false });
            } catch (error) {
              logger.error('Error deleting student:', error);
            } finally {
              setIsProcessing(false);
            }
          }
        }}
        title="Delete Student Account"
        description={confirmationDialog.studentUsername ? `Are you sure you want to delete student account for ${confirmationDialog.studentUsername}?\n\nThis will:\n• Delete their login credentials\n• Remove all attendance records\n• Delete their fee information\n• This action cannot be undone!` : 'Are you sure you want to delete this student account? This action cannot be undone!'}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        loading={isProcessing}
      />
    </Card>
  );
}