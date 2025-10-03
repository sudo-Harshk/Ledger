import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { useTeacherSetup } from '@/hooks';

export default function InitialSetupCard() {
  const { showSetup, loading, enableAdminSetup, setupAdminTeacher } = useTeacherSetup();
  if (!enableAdminSetup || !showSetup) return null;
  return (
    <Card className="mb-8 border-2 border-amber-200 bg-amber-50">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-amber-800">Initial Setup Required</CardTitle>
        <CardDescription className="text-amber-700">
          No teacher account exists. Please create the admin teacher account to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-sm text-amber-700">
            This will create the admin teacher account. You will be asked to enter email and a strong password.
          </p>
          <Button 
            onClick={setupAdminTeacher}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {loading ? 'Creating...' : 'Create Admin Teacher Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
