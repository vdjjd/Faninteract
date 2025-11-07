'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRealtimeChannel } from '@/providers/SupabaseRealtimeProvider';
import { cn } from '../lib/utils';

interface PrizeWheelModerationModalProps {
  wheelId: string;
  onClose: () => void;
  refreshWheel: () => Promise<void>;
}

export default function PrizeWheelModerationModal({
  wheelId,
  onClose,
  refreshWheel,
}: PrizeWheelModerationModalProps) {

  const channelRef = useRealtimeChannel();

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ✅ Load entries + guest profile info */
  async function loadEntries() {
    setLoading(true);

    const { data } = await supabase
      .from('wheel_entries')
      .select(`
        id,
        status,
        guest_profiles:guest_profile_id (
          id,
          first_name,
          last_name,
          photo_url
        )
      `)
      .eq('wheel_id', wheelId)
      .order('created_at', { ascending: true });

    setEntries(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, [wheelId]);

  /* ✅ Broadcast helper */
  function broadcast(event: string, payload: any) {
    const channel = channelRef?.current;
    if (!channel) return;

    channel.send({
      type: 'broadcast',
      event,
      payload,
    }).catch(() => {});
  }

  /* ✅ Approve / Reject */
  async function updateStatus(entryId: string, status: 'approved' | 'rejected') {
    await supabase
      .from('wheel_entries')
      .update({ status })
      .eq('id', entryId);

    broadcast('wheel_entry_updated', {
      wheel_id: wheelId,
      entry_id: entryId,
      status,
    });

    loadEntries();
    refreshWheel?.();
  }

  /* ✅ Save / exit */
  async function handleSave() {
    setSaving(true);
    await refreshWheel?.();
    setSaving(false);
    onClose();
  }

  return (
    <div className={cn(
      'fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50'
    )}>
      <div className={cn(
        'bg-gray-900/70 border border-white/20 rounded-2xl shadow-2xl p-6',
        'w-[420px] max-h-[90vh] overflow-y-auto text-white'
      )}>
        
        <h2 className={cn('text-xl', 'font-bold', 'mb-4', 'text-center')}>
          🎡 Prize Wheel Moderation
        </h2>

        {loading && (
          <p className={cn('text-center', 'py-4', 'text-gray-300')}>Loading…</p>
        )}

        {!loading && entries.length === 0 && (
          <p className={cn('text-center', 'py-4', 'text-gray-300')}>No submissions yet.</p>
        )}

        {/* ✅ Entries */}
        <div className="space-y-3">
          {entries.map((entry) => {
            const g = entry.guest_profiles;
            const name = g
              ? `${g.first_name || ''} ${g.last_name?.[0] || ''}.`
              : 'Unknown';

            const hasPhoto = !!g?.photo_url;

            return (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center justify-between bg-white/10 p-3 rounded-lg'
                )}
              >
                
                {/* ✅ Photo (mandatory) */}
                <div className={cn('flex', 'items-center', 'gap-3')}>
                  
                  {/* Selfie or ERROR BOX */}
                  {hasPhoto ? (
                    <img
                      src={g.photo_url}
                      className={cn(
                        'w-14 h-14 rounded-lg object-cover border border-white/20 cursor-pointer'
                      )}
                    />
                  ) : (
                    <div className={cn(
                      'w-14 h-14 rounded-lg bg-red-700 border border-red-400',
                      'flex items-center justify-center text-[10px] font-bold'
                    )}>
                      NO PHOTO
                    </div>
                  )}

                  {/* Name + status */}
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className={cn(
                      'text-xs mt-1 px-2 py-0.5 rounded-full w-fit',
                      entry.status === 'approved' && 'bg-green-600',
                      entry.status === 'rejected' && 'bg-red-600',
                      entry.status === 'pending' && 'bg-yellow-600'
                    )}>
                      {entry.status}
                    </p>
                  </div>
                </div>

                {/* ✅ Approve / Reject Buttons */}
                <div className={cn('flex', 'gap-2')}>
                  <button
                    onClick={() => updateStatus(entry.id, 'approved')}
                    className={cn('bg-green-600', 'hover:bg-green-700', 'px-2', 'py-1', 'rounded', 'text-sm')}
                  >
                    ✅
                  </button>
                  <button
                    onClick={() => updateStatus(entry.id, 'rejected')}
                    className={cn('bg-red-600', 'hover:bg-red-700', 'px-2', 'py-1', 'rounded', 'text-sm')}
                  >
                    ❌
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* ✅ Footer */}
        <div className={cn('flex', 'justify-center', 'gap-4', 'mt-6', 'pt-4', 'border-t', 'border-white/20')}>
          <button
            onClick={onClose}
            className={cn('bg-red-600', 'hover:bg-red-700', 'px-4', 'py-2', 'rounded', 'font-semibold')}
          >
            Close
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              saving ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700',
              'px-4 py-2 rounded font-semibold'
            )}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
