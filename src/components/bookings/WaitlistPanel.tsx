import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useWaitlist } from '../../hooks/useWaitlist';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface WaitlistPanelProps {
  admin?: boolean;
}

const statusVariant: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800',
  filled: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800'
};

export const WaitlistPanel: React.FC<WaitlistPanelProps> = ({ admin }) => {
  const { user } = useAuth();
  const { entries, isLoading, cancelEntry, fetchEntries } = useWaitlist();
  const [filter, setFilter] = React.useState('all');

  const filtered = React.useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.status === filter);
  }, [entries, filter]);

  const filters = ['all', 'waiting', 'filled', 'cancelled', 'expired'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          {admin ? 'Waitlist Management' : 'My Waitlist'}
          <div className="flex gap-1 flex-wrap">
            {filters.map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No waitlist entries found.</p>
        )}
        <div className="space-y-3">
          {filtered.map(entry => (
            <div key={entry.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{entry.instrumentName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(entry.startTime), 'PP p')} - {format(new Date(entry.endTime), 'p')}
                  </p>
                  {admin && (
                    <p className="text-sm text-muted-foreground">
                      {entry.userName} ({entry.userEmail})
                    </p>
                  )}
                  {entry.purpose && <p className="text-sm mt-1">{entry.purpose}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={statusVariant[entry.status] || ''}>{entry.status}</Badge>
                  {entry.status === 'waiting' && (admin || entry.userId === user?.id) && (
                    <Button size="sm" variant="outline" onClick={() => cancelEntry(entry.id).then(() => fetchEntries(filter === 'all' ? undefined : filter))}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              {entry.status === 'filled' && entry.filledStart && entry.filledEnd && (
                <p className="text-sm text-green-700 mt-2">
                  Auto-booked: {format(new Date(entry.filledStart), 'PP p')} - {format(new Date(entry.filledEnd), 'p')}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
