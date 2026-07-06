'use client';
import { useEffect } from 'react';

// Sends a heartbeat every 60 s while the tab is open.
// The bogga admin panel considers a user "online" if last_seen_at < 2 min ago.
export default function HeartbeatPing() {
  useEffect(() => {
    const ping = () => fetch('/api/bogga/heartbeat', { method: 'POST' }).catch(() => {});
    ping(); // immediate ping on mount
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
