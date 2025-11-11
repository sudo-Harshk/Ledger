import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from './ui';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline';
  loading?: boolean;
}

const overlayClass = "fixed inset-0 bg-black/40 z-40";
const dialogWrapperClass = "fixed inset-0 z-50 flex items-center justify-center p-4";

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  loading = false
}) => {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <>
      <div className={overlayClass} onClick={handleCancel} />
      <div className={dialogWrapperClass}>
        <Card className="w-full max-w-md bg-card-elevated shadow-lg border border-palette-golden/30">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="whitespace-pre-line">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                variant={confirmVariant}
                onClick={handleConfirm}
                disabled={loading}
                className={
                  confirmVariant === 'destructive'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : ''
                }
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

