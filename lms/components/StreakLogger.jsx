'use client';
import { useEffect } from 'react';

// Silently logs today's activity when any library page is visited.
// The API is idempotent — safe to call multiple times.
export default function StreakLogger() {
  useEffect(() => {
    fetch('/api/streak', { method: 'POST' }).catch(() => {});
  }, []);
  return null;
}
