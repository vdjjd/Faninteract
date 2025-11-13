'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function CreatePollModal({
  isOpen,
  onClose,
  hostId,
  refreshPolls,
  onPollCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  refreshPolls: () => Promise<void>;
  onPollCreated: (poll: any) => void;
}) {
  const [question, setQuestion] = useState('');
  const [saving, setSaving] = useState(false);

  /* -------------------------------------------------- */
  /* 🛰️ Broadcast helper — optional grid sync */
  /* -------------------------------------------------- */
  async function broadcast(event: string, payload: any) {
    try {
      await supabase.channel('polls-grid-sync').send({
        type: 'broadcast',
        event,
        payload,
      });
    } catch (err) {
      console.error('❌ Poll broadcast failed:', err);
    }
  }

  /* -------------------------------------------------- */
  /* 💾 Save New Poll                                   */
  /* -------------------------------------------------- */
  async function handleSave() {
    if (!question.trim()) return alert('Poll name required');
    setSaving(true);

    try {
      // ✅ Create poll with all supported fields in your schema
      const { data: poll, error } = await supabase
        .from('polls')
        .insert({
          host_id: hostId,
          question,
          status: 'inactive',
          background_type: 'gradient',
          background_value: 'linear-gradient(135deg,#0d47a1,#1976d2)',
          color_start: '#0d47a1',
          color_end: '#1976d2',
          gradient_pos: 60,
          background_brightness: 100,
          countdown: 'none',
          countdown_active: false,
        })
        .select('*')
        .single();

      if (error || !poll) throw error;

      // ✅ Send live broadcast
      await broadcast('poll_created', { poll });

      // ✅ Refresh dashboard
      await refreshPolls();

      // ✅ Close and open Options modal
      onClose();
      setQuestion('');
      onPollCreated(poll);
    } catch (err) {
      console.error('❌ Error creating poll:', err);
      alert('Error creating poll');
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------- */
  /* 🖼️ Modal UI */
  /* -------------------------------------------------- */
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={cn('space-y-4 text-white')}>
        <h2 className={cn('text-xl font-semibold text-center mb-2')}>
          Create New Poll
        </h2>

        {/* Poll Name */}
        <div>
          <label className={cn('block text-sm font-semibold mb-1')}>
            Name of the Poll
          </label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10'
            )}
            placeholder="Title of your Poll Wall"
          />
        </div>

        {/* Footer */}
        <div
          className={cn(
            'flex justify-end gap-3 pt-3 border-t border-white/10'
          )}
        >
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition'
            )}
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className={cn(
              'px-4 py-2 rounded-lg border transition',
              saving
                ? 'opacity-60 cursor-wait'
                : 'bg-emerald-600/80 border-emerald-500 hover:bg-emerald-600'
            )}
          >
            {saving ? 'Saving…' : 'Create Poll'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
