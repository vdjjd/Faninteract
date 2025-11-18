'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { cn } from "../lib/utils";

interface CreateFanWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  refreshFanWalls: () => Promise<void>;
}

export default function CreateFanWallModal({
  isOpen,
  onClose,
  hostId,
  refreshFanWalls,
}: CreateFanWallModalProps) {
  const supabase = getSupabaseClient();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !hostId || !supabase) return;

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('fan_walls')
        .insert([
          {
            id: crypto.randomUUID(),
            host_id: hostId,
            title: title.trim(),
            background_type: 'gradient',
            background_value: 'linear-gradient(135deg, #1b2735, #090a0f)',
            status: 'inactive',
            transition_speed: 'Medium',
            post_transition: 'Fade In / Fade Out',
            auto_delete_minutes: 0,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating fan wall:', error);
        return;
      }

      console.log('✅ Fan wall created:', data);
      await refreshFanWalls();
      setTitle('');
      onClose();
    } catch (err) {
      console.error('❌ Unexpected error creating fan wall:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className={cn('text-xl', 'font-bold', 'text-center', 'mb-4')}>
        🎤 New Fan Zone Wall
      </h2>

      <input
        type="text"
        placeholder="Enter private wall name..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={cn(
          'w-full',
          'px-3',
          'py-2',
          'rounded-lg',
          'text-black',
          'text-sm',
          'mb-4'
        )}
      />

      <div className={cn('flex', 'justify-center', 'gap-3')}>
        <button
          onClick={handleCreate}
          disabled={saving}
          className={cn(
            'bg-green-600',
            'hover:bg-green-700',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold'
          )}
        >
          {saving ? 'Creating...' : '✅ Create'}
        </button>

        <button
          onClick={onClose}
          disabled={saving}
          className={cn(
            'bg-red-600',
            'hover:bg-red-700',
            'px-4',
            'py-2',
            'rounded-lg',
            'font-semibold'
          )}
        >
          ✖ Cancel
        </button>
      </div>
    </Modal>
  );
}
