'use client';
import { useEffect, useState } from 'react';
import SharedSchedule from './SharedSchedule';
export default function OfflineShared() {
  const [id, setId] = useState('');
  useEffect(() => {
    setId(location.pathname.match(/^\/s\/([A-Za-z0-9_-]{32})\/?$/)?.[1] || '');
  }, []);
  return id ? (
    <SharedSchedule shareId={id} />
  ) : (
    <main id="main" className="app-shell">
      <h1>Offline</h1>
      <p>Reconnect to open the shared schedule.</p>
    </main>
  );
}
