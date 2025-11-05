"use client";

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  Settings,
  CreditCard,
  LogOut,
  SlidersHorizontal
} from 'lucide-react';
import ChangeEmailModal from '@/components/ChangeEmailModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { motion } from 'framer-motion';
import { cn } from "../lib/utils";

interface HostProfilePanelProps {
  host: any;
  setHost: React.Dispatch<React.SetStateAction<any>>;
}

export default function HostProfilePanel({ host }: HostProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function openAdsManager() {
    if (!host) return;

    // ✅ Use host.profile_id instead of host.id
    const url = `/admin/ads/${host.id}?master=${host.role === 'master'}`;

    window.open(
      url,
      "_blank",
      "width=1280,height=720,top=50,left=50,resizable=yes,scrollbars=yes"
    );
  }

  if (!host) {
    return (
      <div className={cn('flex items-center justify-center text-gray-400 text-sm py-6')}>
        Loading profile…
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className={cn('rounded-full w-10 h-10 overflow-hidden border border-gray-500 hover:ring-2 hover:ring-blue-500 transition-all')}>
          <div className={cn('bg-gray-700 w-full h-full flex items-center justify-center text-gray-200 font-bold')}>
            {host?.first_name?.[0]?.toUpperCase() || host?.venue_name?.[0]?.toUpperCase() || 'H'}
          </div>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className={cn('w-80 bg-black/80 backdrop-blur-xl border-l border-gray-700 text-gray-100 overflow-y-auto')}>
        <SheetHeader>
          <SheetTitle className={cn('text-white font-semibold tracking-wide text-center')}>
            Host Profile
          </SheetTitle>
        </SheetHeader>

        <div className={cn('mt-5', 'flex', 'flex-col', 'gap-6')}>

          {/* ACCOUNT */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold', 'text-center')}>
              <User className={cn('w-5', 'h-5')} /> Account
            </div>

            <div className={cn('flex', 'flex-col', 'items-center', 'gap-3', 'text-center')}>
              <div className={cn('w-24', 'h-24', 'rounded-full', 'overflow-hidden', 'border', 'border-gray-600', 'shadow-md', 'flex', 'items-center', 'justify-center', 'bg-gray-800')}>
                <span className={cn('text-3xl', 'font-semibold', 'text-gray-300')}>
                  {host?.first_name?.[0]?.toUpperCase() || 'H'}
                </span>
              </div>

              <div className={cn('text-center', 'mt-3')}>
                <p className={cn('font-semibold', 'text-lg', 'text-white')}>
                  {host?.first_name && host?.last_name
                    ? `${host.first_name} ${host.last_name}`
                    : host?.venue_name || 'Host User'}
                </p>
                <p className={cn('text-sm', 'text-gray-400')}>{host?.email}</p>
                <p className={cn('text-sm', 'text-gray-400', 'italic', 'mt-1')}>
                  Role: {host?.role || 'host'}
                </p>
              </div>

              <div className={cn('flex', 'flex-col', 'gap-2', 'w-full', 'mt-4')}>
                <Button variant="outline" onClick={() => setShowEmailModal(true)}>
                  Change Email
                </Button>
                <Button variant="outline" onClick={() => setShowPassModal(true)}>
                  Change Password
                </Button>
              </div>
            </div>
          </section>

          {/* SETTINGS */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold', 'text-center')}>
              <Settings className={cn('w-5', 'h-5')} /> Settings
            </div>
            <p className={cn('text-sm', 'text-gray-400', 'text-center')}>Venue: {host?.venue_name}</p>
            <p className={cn('text-sm', 'text-gray-400', 'text-center')}>Username: {host?.username}</p>
            <p className={cn('text-sm', 'text-gray-400', 'text-center')}>
              Created: {new Date(host?.created_at).toLocaleDateString()}
            </p>
          </section>

          {/* ✅ AD MANAGER */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold', 'text-center')}>
              <SlidersHorizontal className={cn('w-5', 'h-5')} /> Ad Manager
            </div>

            <Button variant="outline" className="w-full" onClick={openAdsManager}>
              Open Ad Manager
            </Button>
          </section>

          {/* BILLING */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold', 'text-center')}>
              <CreditCard className={cn('w-5', 'h-5')} /> Billing
            </div>
            <Button variant="outline" className="w-full" disabled>
              Manage Billing (coming soon)
            </Button>
          </section>

          {/* SECURITY */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold', 'text-center')}>
              <LogOut className={cn('w-5', 'h-5')} /> Security
            </div>

            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </section>

          <div className="h-8"></div>
        </div>

        {/* EMAIL MODAL */}
        {showEmailModal && (
          <div className={cn('fixed', 'inset-0', 'bg-black/70', 'flex', 'items-center', 'justify-center', 'z-50')}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn('bg-neutral-900', 'border', 'border-gray-700', 'rounded-lg', 'shadow-lg', 'w-96', 'p-4')}>
              <ChangeEmailModal onClose={() => setShowEmailModal(false)} />
            </motion.div>
          </div>
        )}

        {/* PASSWORD MODAL */}
        {showPassModal && (
          <div className={cn('fixed', 'inset-0', 'bg-black/70', 'flex', 'items-center', 'justify-center', 'z-50')}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn('bg-neutral-900', 'border', 'border-gray-700', 'rounded-lg', 'shadow-lg', 'w-96', 'p-4')}>
              <ChangePasswordModal onClose={() => setShowPassModal(false)} />
            </motion.div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
