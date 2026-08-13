import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const NotificationsPage: React.FC = () => {
  const { notifications, loading, markRead, markAllRead } = useNotifications();

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <Button onClick={markAllRead} variant="outline" disabled={!notifications.some(n => !n.read)}>
          Mark all read
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`border rounded p-3 ${n.read ? 'opacity-60' : 'bg-muted/20'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), 'PP p')}</p>
                </div>
                {!n.read && <Badge>Unread</Badge>}
              </div>
              <div className="flex gap-2 mt-2">
                {!n.read && <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark read</Button>}
                {n.link && <Link to={n.link}><Button size="sm" variant="link">View</Button></Link>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
