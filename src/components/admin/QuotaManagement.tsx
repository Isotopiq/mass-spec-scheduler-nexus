import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Instrument {
  id: string;
  name: string;
}

interface Quota {
  id: string;
  period_id: string;
  user_id: string | null;
  instrument_id: string | null;
  max_hours: number | null;
  max_bookings: number | null;
  period_name?: string;
  user_name?: string;
  instrument_name?: string;
}

export const QuotaManagement: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(false);

  const [newPeriod, setNewPeriod] = useState({ name: '', start: '', end: '' });
  const [newQuota, setNewQuota] = useState({
    period_id: '',
    user_id: '',
    instrument_id: '',
    max_hours: '',
    max_bookings: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: u }, { data: i }, { data: q }] = await Promise.all([
        supabase.from('usage_quota_periods').select('*').order('start_date', { ascending: false }),
        supabase.from('profiles').select('id, name, email'),
        supabase.from('instruments').select('id, name'),
        supabase.from('usage_quotas').select('*')
      ]);

      const periodMap = new Map((p || []).map((x: Period) => [x.id, x.name]));
      const userMap = new Map((u || []).map((x: User) => [x.id, x.name || x.email]));
      const instrumentMap = new Map((i || []).map((x: Instrument) => [x.id, x.name]));

      const normalizedQuotas: Quota[] = (q || []).map((row: any) => ({
        id: row.id,
        period_id: row.period_id,
        user_id: row.user_id,
        instrument_id: row.instrument_id,
        max_hours: row.max_hours,
        max_bookings: row.max_bookings,
        period_name: periodMap.get(row.period_id) || row.period_id,
        user_name: row.user_id ? userMap.get(row.user_id) : 'All users',
        instrument_name: row.instrument_id ? instrumentMap.get(row.instrument_id) : 'All instruments'
      }));

      setPeriods(p || []);
      setUsers(u || []);
      setInstruments(i || []);
      setQuotas(normalizedQuotas);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('usage_quota_periods').insert({
        name: newPeriod.name,
        start_date: new Date(newPeriod.start).toISOString(),
        end_date: new Date(newPeriod.end).toISOString()
      });
      toast.success('Period created');
      setNewPeriod({ name: '', start: '', end: '' });
      loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const createQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('usage_quotas').insert({
        period_id: newQuota.period_id,
        user_id: newQuota.user_id || null,
        instrument_id: newQuota.instrument_id || null,
        max_hours: newQuota.max_hours ? parseFloat(newQuota.max_hours) : null,
        max_bookings: newQuota.max_bookings ? parseInt(newQuota.max_bookings, 10) : null
      });
      toast.success('Quota created');
      setNewQuota({ period_id: '', user_id: '', instrument_id: '', max_hours: '', max_bookings: '' });
      loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteQuota = async (id: string) => {
    try {
      await supabase.from('usage_quotas').delete().eq('id', id);
      toast.success('Quota deleted');
      loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Quota Period</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={createPeriod} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Name</Label>
              <Input value={newPeriod.name} onChange={e => setNewPeriod(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={newPeriod.start} onChange={e => setNewPeriod(p => ({ ...p, start: e.target.value }))} required />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={newPeriod.end} onChange={e => setNewPeriod(p => ({ ...p, end: e.target.value }))} required />
            </div>
            <Button type="submit" disabled={loading}>Create Period</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Create Quota</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={createQuota} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <Label>Period</Label>
              <Select value={newQuota.period_id} onValueChange={v => setNewQuota(q => ({ ...q, period_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>User</Label>
              <Select value={newQuota.user_id} onValueChange={v => setNewQuota(q => ({ ...q, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Instrument</Label>
              <Select value={newQuota.instrument_id} onValueChange={v => setNewQuota(q => ({ ...q, instrument_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All instruments" /></SelectTrigger>
                <SelectContent>
                  {instruments.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Hours</Label>
              <Input type="number" step="0.5" value={newQuota.max_hours} onChange={e => setNewQuota(q => ({ ...q, max_hours: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <Label>Max Bookings</Label>
              <Input type="number" value={newQuota.max_bookings} onChange={e => setNewQuota(q => ({ ...q, max_bookings: e.target.value }))} placeholder="Optional" />
            </div>
            <Button type="submit" disabled={loading || !newQuota.period_id}>Create Quota</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Quotas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {quotas.length === 0 && <p className="text-sm text-muted-foreground">No quotas defined.</p>}
            {quotas.map(q => (
              <div key={q.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <p className="font-medium">{q.period_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.user_name || 'All users'} · {q.instrument_name || 'All instruments'}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {q.max_hours !== null && <Badge variant="outline">Max {q.max_hours}h</Badge>}
                    {q.max_bookings !== null && <Badge variant="outline">Max {q.max_bookings} bookings</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deleteQuota(q.id)}>Delete</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
