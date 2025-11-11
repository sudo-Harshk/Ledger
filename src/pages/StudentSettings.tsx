import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { debouncedToast } from '../lib/debouncedToast';
import { linkGitHubAccount } from '../lib/linkGitHubAccount';
import { FaGithub } from 'react-icons/fa';
import { auth } from '../firebase';

export default function StudentSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  if (!user) {
    return <div>Loading...</div>; 
  }

  const isGitHubLinked = user.providerData.some(
    (provider) => provider.providerId === 'github.com'
  );

  const handleLinkGitHub = async (): Promise<void> => {
    setLoading(true);
    try {
      await linkGitHubAccount();
      if (auth.currentUser?.reload) {
        await auth.currentUser.reload();
      }
    } catch (error) {
      console.error('Error linking GitHub account:', error);
      debouncedToast('Failed to link account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Card className="bg-card-elevated shadow-lg border border-palette-golden/30">
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>
            Connect other accounts to sign in to your Ledger account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGitHubLinked ? (
            <div className="flex items-center gap-3 p-4 bg-card-base rounded-md border border-palette-golden/30">
              <FaGithub className="h-6 w-6 text-palette-dark-teal" />
              <span className="font-medium text-palette-dark-red">
                Your GitHub account is linked.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-palette-dark-teal">
                Your GitHub account is not linked. Link it for an alternative
                way to sign in.
              </p>
              <Button
                onClick={handleLinkGitHub}
                disabled={loading}
                className="w-full max-w-xs"
                variant="outline"
              >
                {loading ? (
                  'Linking...'
                ) : (
                  <>
                    <FaGithub className="mr-2 h-5 w-5" />
                    Link GitHub Account
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

