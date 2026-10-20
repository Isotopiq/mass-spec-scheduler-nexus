import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, Download, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOptimizedBooking } from '../../contexts/OptimizedBookingContext';

export const BulkImportExport: React.FC = () => {
  const [importType, setImportType] = useState('users');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { session, refreshUsers } = useAuth();
  const { refreshData } = useOptimizedBooking();
  const token = session?.access_token;
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      document.body.appendChild(a);
      a.click();
      a.remove();
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-start overflow-hidden"
                >
                  <Upload className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{file ? file.name : 'Choose File'}</span>
                </Button>
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    aria-label="Clear selected file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>
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
