'use client';
import { useEffect } from 'react';
import { createClient } from '../lib/supabase';

// Sends a heartbeat every 60 s while the tab is open — logged-in users only.
// The bogga admin panel considers a user "online" if last_seen_at < 2 min ago.
// Mounted globally in the root layout, so we gate on an active session here
// instead of restarting the interval on every route change.
export default function HeartbeatPing() {
  useEffect(() => {
    let id;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const ping = () => fetch('/api/bogga/heartbeat', { method: 'POST' }).catch(() => {});
      ping(); // immediate ping once we know the user is logged in
      id = setInterval(ping, 60_000);
    });

    return () => clearInterval(id);
  }, []);

  return null;
}
