'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ModerationTest() {
  const { eventId } = useParams();
  const [subs, setSubs] = useState([]);

  // Fetch all submissions for this event (any status)
  async function loadSubs() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) console.error('❌ Fetch error:', error);
    else console.log('✅ Loaded submissions:', data);

    setSubs(data || []);
  }

  useEffect(() => {
    if (!eventId) return;
    console.log('🔗 Event ID param:', eventId);
    loadSubs();

    // Listen for all changes on submissions
    const channel = supabase
      .channel('debug_submissions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('🟢 REALTIME EVENT:', payload);
          loadSubs(); // refresh after every change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div style={{ padding: 20, background: '#111', color: '#fff' }}>
      <h2>Moderation Debug Page</h2>
      <p>Event ID: {eventId}</p>
      <hr />
      {subs.length === 0 ? (
        <p>No submissions found for this event.</p>
      ) : (
        <ul>
          {subs.map((s) => (
            <li key={s.id}>
              <strong>{s.id}</strong> — {s.status} — {s.nickname || '(no name)'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

}
