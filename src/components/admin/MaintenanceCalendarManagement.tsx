import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';

interface Maintenance {
  id: string;
  instrument_id: string;
  instrument_name?: string;
  start_time: string;
  end_time: string;
  type: string;
  description?: string;
  status: string;
}

interface Instrument {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

export const MaintenanceCalendarManagement: React.FC = () => {
  const [items, setItems] = useState<Maintenance[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    instrument_id: '',
    start: '',
    end: '',
    type: 'maintenance',
    description: '',
    status: 'scheduled'
  });

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: m }, { data: i }] = await Promise.all([
        supabase.from('instrument_maintenance').select('*').order('start_time', { ascending: false }),
        supabase.from('instruments').select('id, name')
      ]);
      const imap = new Map((i || []).map((x: Instrument) => [x.id, x.name]));
      setItems((m || []).map((x: any) => ({ ...x, instrument_name: imap.get(x.instrument_id) })));
      setInstruments(i || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('instrument_maintenance').insert({
        instrument_id: form.instrument_id,
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        type: form.type,
        description: form.description,
        status: form.status
      });
      toast.success('Maintenance scheduled');
      setForm({ instrument_id: '', start: '', end: '', type: 'maintenance', description: '', status: 'scheduled' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await supabase.from('instrument_maintenance').update({ status }).eq('id', id);
      toast.success('Status updated');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteItem = async (id: string) => {
    try {
      await supabase.from('instrument_maintenance').delete().eq('id', id);
      toast.success('Maintenance deleted');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Schedule Maintenance</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <Label>Instrument</Label>
              <Select value={form.instrument_id} onValueChange={v => setForm(f => ({ ...f, instrument_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select instrument" /></SelectTrigger>
                <SelectContent>
                  {instruments.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} required />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details" />
            </div>
            <div className="md:col-span-6">
              <Button type="submit" disabled={loading || !form.instrument_id}>Schedule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Maintenance Calendar</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.length === 0 && <p className="text-sm text-muted-foreground">No maintenance events scheduled.</p>}
            {items.map(item => (
              <div key={item.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.instrument_name} · {item.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(item.start_time), 'PP p')} - {format(new Date(item.end_time), 'p')}
                  </p>
                  {item.description && <p className="text-sm mt-1">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[item.status] || ''}>{item.status}</Badge>
                  <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
