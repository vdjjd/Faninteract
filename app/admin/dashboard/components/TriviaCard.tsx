'use client';

import { cn } from "@/lib/utils";
import * as Tabs from "@radix-ui/react-tabs";
import { supabase } from "@/lib/supabaseClient";

export default function TriviaCard({
  trivia,
  onOpenOptions,
  onDelete,
  onLaunch,
}) {
  if (!trivia) return null;

  /* ------------------------------------------------------------
    🔥 Delete handler — safe + DB cleanup
  ------------------------------------------------------------ */
  async function handleDeleteTrivia() {
    const yes = confirm(
      `Delete trivia "${trivia.public_name}"?\n\nThis will permanently remove:\n• The trivia game\n• All questions & answers linked to it (if using a questions table)\n\nThis cannot be undone.`
    );

    if (!yes) return;

    // OPTIONAL — if you have a questions table, delete first (uncomment)
    // await supabase.from("trivia_questions").delete().eq("trivia_id", trivia.id);

    // Delete the trivia
    await supabase.from("trivia").delete().eq("id", trivia.id);

    // Tell parent to refresh UI
    onDelete?.(trivia.id);
  }

  return (
    <div
      className={cn(
        "rounded-xl p-5 bg-[#1b2638] border border-white/10 shadow-lg",
        "col-span-2 row-span-2",
        "min-h-[420px] w-full"
      )}
    >
      {/* ⭐ TABS */}
      <Tabs.Root defaultValue="menu">
        <Tabs.List
          className={cn(
            "flex gap-6 mb-4 border-b border-white/10 pb-2"
          )}
        >
          <Tabs.Trigger
            value="menu"
            className={cn(
              "px-2 py-1 text-sm font-medium",
              "data-[state=active]:text-blue-400"
            )}
          >
            Home
          </Tabs.Trigger>

          <Tabs.Trigger
            value="questions"
            className={cn(
              "px-2 py-1 text-sm font-medium",
              "data-[state=active]:text-blue-400"
            )}
          >
            Questions
          </Tabs.Trigger>

          <Tabs.Trigger
            value="leaderboard"
            className={cn(
              "px-2 py-1 text-sm font-medium",
              "data-[state=active]:text-blue-400"
            )}
          >
            Leaderboard
          </Tabs.Trigger>

          <Tabs.Trigger
            value="settings"
            className={cn(
              "px-2 py-1 text-sm font-medium",
              "data-[state=active]:text-blue-400"
            )}
          >
            Settings
          </Tabs.Trigger>
        </Tabs.List>

        {/* ---------------- HOME TAB ---------------- */}
        <Tabs.Content value="menu">
          <div
            className={cn(
              "grid grid-cols-3 gap-2 mb-4 items-center"
            )}
          >
            <div>
              <p className={cn('text-sm', 'opacity-70')}>Difficulty</p>
              <p className="font-semibold">{trivia.difficulty}</p>
            </div>

            <div className="text-center">
              <p className={cn('text-lg', 'font-semibold')}>{trivia.public_name}</p>
            </div>

            <div className="text-right">
              <p className={cn('text-sm', 'opacity-70')}>Topic</p>
              <p className="font-semibold">
                {trivia.topic_prompt || "—"}
              </p>
            </div>
          </div>

          {/* BUTTONS */}
          <div className={cn('grid', 'grid-cols-3', 'gap-3', 'mt-4')}>
            <button
              onClick={() => onLaunch(trivia)}
              className={cn('bg-blue-600', 'hover:bg-blue-700', 'py-2', 'rounded-lg', 'font-semibold')}
            >
              Launch
            </button>

            <button
              onClick={() => onOpenOptions(trivia)}
              className={cn('bg-gray-700', 'hover:bg-gray-600', 'py-2', 'rounded-lg', 'font-semibold')}
            >
              Options
            </button>

            <div className={cn('bg-gray-800', 'p-3', 'rounded-lg', 'flex', 'flex-col', 'items-center', 'justify-center')}>
              <p className={cn('text-xs', 'opacity-75')}>Participants</p>
              <p className={cn('text-lg', 'font-bold')}>0</p>
            </div>

            <button className={cn('bg-green-600', 'hover:bg-green-700', 'py-2', 'rounded-lg', 'font-semibold')}>
              ▶ Play
            </button>

            <div></div>

            <button className={cn('bg-red-600', 'hover:bg-red-700', 'py-2', 'rounded-lg', 'font-semibold')}>
              ⏹ Stop
            </button>
          </div>
        </Tabs.Content>

        {/* ---------------- QUESTIONS TAB ---------------- */}
        <Tabs.Content value="questions" className="mt-4">
          <p className={cn('text-sm', 'opacity-70', 'italic')}>
            Questions will appear here…
          </p>
        </Tabs.Content>

        {/* ---------------- LEADERBOARD TAB ---------------- */}
        <Tabs.Content value="leaderboard" className="mt-4">
          <p className={cn('text-sm', 'opacity-70', 'italic')}>
            Leaderboard coming soon…
          </p>
        </Tabs.Content>

        {/* ---------------- SETTINGS TAB ---------------- */}
        <Tabs.Content value="settings" className={cn('mt-4', 'space-y-4')}>
          <p className={cn('text-sm', 'opacity-70')}>Settings coming soon…</p>

          {/* 🔥 DELETE BUTTON HERE */}
          <button
            onClick={handleDeleteTrivia}
            className={cn(
              "w-full bg-red-700 hover:bg-red-800 py-2 rounded-lg font-semibold mt-4"
            )}
          >
            ❌ Delete Trivia
          </button>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
