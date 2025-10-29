import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { linkGoogleAccount, linkGitHubAccount } from '../../lib';
import { useState } from 'react';

interface AccountSettingsCardProps {
  show: boolean;
  isGoogleLinked: boolean;
  isGitHubLinked?: boolean;
}

export default function AccountSettingsCard({ 
  show, 
  isGoogleLinked, 
  isGitHubLinked = false
}: AccountSettingsCardProps) {
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  if (!show) return null;

  const handleLinkGoogle = async () => {
    if (isGoogleLinked) return;
    
    setLinkingProvider('google');
    try {
      await linkGoogleAccount();
    } catch (error) {
      console.error('Error linking Google account:', error);
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleLinkGitHub = async () => {
    if (isGitHubLinked) return;
    
    setLinkingProvider('github');
    try {
      await linkGitHubAccount();
    } catch (error) {
      console.error('Error linking GitHub account:', error);
    } finally {
      setLinkingProvider(null);
    }
  };

  const hasUnlinkedProviders = !isGoogleLinked || !isGitHubLinked;

  if (!hasUnlinkedProviders) return null;

  return (
    <Card className="mb-8 bg-card-elevated shadow-lg border border-palette-golden/30">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Link additional authentication methods for easier login and account recovery.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isGoogleLinked && (
          <Button 
            variant="outline" 
            onClick={handleLinkGoogle} 
            className="w-full sm:w-auto"
            disabled={linkingProvider === 'google'}
          >
            {linkingProvider === 'google' ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Linking...
              </>
            ) : (
              <>
                <img
                  src="https://img.icons8.com/color/48/google-logo.png"
                  alt="Google"
                  width={16}
                  height={16}
                  className="mr-2"
                />
                Link Google Account
              </>
            )}
          </Button>
        )}
        
        {!isGitHubLinked && (
          <Button 
            variant="outline" 
            onClick={handleLinkGitHub} 
            className="w-full sm:w-auto"
            disabled={linkingProvider === 'github'}
          >
            {linkingProvider === 'github' ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Linking...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Link GitHub Account
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
