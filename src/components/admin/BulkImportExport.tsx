import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOptimizedBooking } from '../../contexts/OptimizedBookingContext';

export const BulkImportExport: React.FC = () => {
  const [importType, setImportType] = useState('users');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { session, refreshUsers } = useAuth();
  const { refreshData } = useOptimizedBooking();
  const token = session?.access_token;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Select a file first');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/import/${importType}`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Import failed');
      toast.success(`Imported ${json.data.inserted} ${importType}`);
      setFile(null);
      if (importType === 'users') await refreshUsers();
      if (importType === 'instruments') await refreshData();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const exportData = async (type: string) => {
    try {
      const res = await fetch(`/api/admin/export/${type}`, {
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} exported`);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Bulk Import</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleImport} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Import Type</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="instruments">Instruments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Excel / CSV File</Label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
            </div>
            <Button type="submit" disabled={loading || !file}><Upload className="h-4 w-4 mr-2" /> Import</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            For {importType}, columns should include: {importType === 'users' ? 'name, email, role, department' : 'name, description, status, location'}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bulk Export</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => exportData('bookings')}><Download className="h-4 w-4 mr-2" /> Bookings</Button>
            <Button variant="outline" onClick={() => exportData('users')}><Download className="h-4 w-4 mr-2" /> Users</Button>
            <Button variant="outline" onClick={() => exportData('instruments')}><Download className="h-4 w-4 mr-2" /> Instruments</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
