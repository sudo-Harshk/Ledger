import React, { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { FaGithub } from 'react-icons/fa';
import { linkGitHubAccount } from '@/lib/linkGitHubAccount';

type Props = {
  open: boolean;
  onClose: () => void;
  isGitHubLinked: boolean;
  onAfterLink?: () => Promise<void> | void;
};

const overlayClass = "fixed inset-0 bg-black/40 z-40";
const dialogWrapperClass = "fixed inset-0 z-50 flex items-center justify-center p-4";

const StudentLinkedAccountsModal: React.FC<Props> = ({ open, onClose, isGitHubLinked, onAfterLink }) => {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleLink = async () => {
    setLoading(true);
    try {
      await linkGitHubAccount();
      if (onAfterLink) {
        await onAfterLink();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={overlayClass} onClick={onClose} />
      <div className={dialogWrapperClass}>
        <Card className="w-full max-w-lg bg-card-elevated shadow-lg border border-palette-golden/30">
          <CardHeader>
            <CardTitle>Linked Accounts</CardTitle>
            <CardDescription>Connect other accounts to sign in to your Ledger account.</CardDescription>
          </CardHeader>
          <CardContent>
            {isGitHubLinked ? (
              <div className="flex items-center justify-between gap-3 p-4 bg-card-base rounded-md border border-palette-golden/30">
                <div className="flex items-center gap-3">
                  <FaGithub className="h-6 w-6 text-palette-dark-teal" />
                  <span className="font-medium text-palette-dark-red">Your GitHub account is linked.</span>
                </div>
                <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-palette-dark-teal">
                  Your GitHub account is not linked. Link it for an alternative way to sign in.
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleLink}
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
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default StudentLinkedAccountsModal;


