import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { Link as LinkIcon } from 'lucide-react';
import { linkGoogleAccount } from '../../lib/linkGoogleAccount';

export default function AccountSettingsCard({ show, userRole, isGoogleLinked }: { show: boolean, userRole: string, isGoogleLinked: boolean }) {
  if (!show || userRole !== 'teacher' || isGoogleLinked) return null;
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Link your Google account for easier login and account recovery.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={linkGoogleAccount} className="w-full sm:w-auto">
          <LinkIcon className="mr-2 h-4 w-4" />
          Link Google Account
        </Button>
      </CardContent>
    </Card>
  );
}
