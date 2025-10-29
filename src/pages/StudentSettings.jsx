import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { debouncedToast } from '../lib/debouncedToast';
import { linkGitHubAccount } from '../lib/linkGitHubAccount';
import { FaGithub } from 'react-icons/fa';

export default function StudentSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <div>Loading...</div>; // Or a spinner component
  }

  // This is the logic that makes the button "disappear"
  const isGitHubLinked = user.providerData.some(
    (provider) => provider.providerId === 'github.com'
  );

  const handleLinkGitHub = async () => {
    setLoading(true);
    try {
      await linkGitHubAccount();
      // Ensure providerData refreshes so the button disappears on this screen
      if (user?.reload) {
        await user.reload();
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
            // This is shown if the account is ALREADY linked
            <div className="flex items-center gap-3 p-4 bg-card-base rounded-md border border-palette-golden/30">
              <FaGithub className="h-6 w-6 text-palette-dark-teal" />
              <span className="font-medium text-palette-dark-red">
                Your GitHub account is linked.
              </span>
            </div>
          ) : (
            // This is shown if the account is NOT linked
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


