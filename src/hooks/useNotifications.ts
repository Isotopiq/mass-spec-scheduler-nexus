import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

const DEFAULT_PAGE_SIZE = 10;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const [listRes, countRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to),
        supabase.from('notifications').select('count'),
      ]);
      if (listRes.error) throw listRes.error;
      if (countRes.error) throw countRes.error;
      const list = listRes.data || [];
      setNotifications(list);
      const count = (countRes.data?.[0]?.count as number) || 0;
      setTotalCount(count);
      // unread count for the badge (all pages)
      const { data: unreadData } = await supabase
        .from('notifications')
        .select('count')
        .eq('read', false);
      setUnreadCount((unreadData?.[0]?.count as number) || 0);
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const markRead = useCallback(async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!currentUserId) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', currentUserId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  }, [currentUserId]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications(prev => {
        const removed = prev.find(n => n.id === id);
        const next = prev.filter(n => n.id !== id);
        if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
        return next;
      });
      setTotalCount(prev => Math.max(0, prev - 1));
      // refresh if this was the last item on the page and not the first page
      setPage(prev => {
        if (prev > 1 && notifications.length === 1) return prev - 1;
        return prev;
      });
    } catch (e) { console.error(e); }
  }, [notifications.length]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return {
    notifications,
    unreadCount,
    loading,
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages,
    markRead,
    markAllRead,
    deleteNotification,
    refresh: load,
  };
}
