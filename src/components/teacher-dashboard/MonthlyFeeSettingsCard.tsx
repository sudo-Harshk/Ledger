import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label } from '@/components/ui';
import { useState, useEffect } from 'react';
import { useMonthlyFee, useAuth } from '@/hooks';

export default function MonthlyFeeSettingsCard() {
  const { user } = useAuth();
  const { monthlyFee, loading, isUpdated, updateMonthlyFee } = useMonthlyFee(user?.uid);
  const [inputValue, setInputValue] = useState(monthlyFee);

  // Sync input value with fetched monthly fee
  useEffect(() => {
    setInputValue(monthlyFee);
  }, [monthlyFee]);

  const handleUpdate = () => {
    updateMonthlyFee(inputValue);
  };
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Monthly Fee Settings</CardTitle>
        <CardDescription>Set the monthly fee for all students</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="monthlyFee" className="text-sm font-medium">Monthly Fee (₹)</Label>
            <Input
              id="monthlyFee"
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(Number(e.target.value))}
              placeholder="Enter monthly fee"
              className={`mt-1 transition-all duration-300 ${isUpdated ? 'bg-blue-100 border-blue-400' : ''}`}
            />
          </div>
          <Button 
            onClick={handleUpdate}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Updating...' : 'Update Fee'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
