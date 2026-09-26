import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Trash } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    unreadCount,
    page,
    setPage,
    totalPages,
    totalCount,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <Button onClick={markAllRead} variant="outline" disabled={unreadCount === 0}>
          Mark all read
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
        </CardHeader>
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
              <div className="flex items-center gap-2 mt-2">
                {!n.read && <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark read</Button>}
                {n.link && (
                  <Link to={n.link}>
                    <Button size="sm" variant="link">View</Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive ml-auto"
                  onClick={() => handleDelete(n.id)}
                  aria-label="Delete notification"
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
