"use client";

import { useState } from "react";
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
  SlidersHorizontal,
} from "lucide-react";

import ChangeEmailModal from "@/components/ChangeEmailModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";

import Modal from "@/components/Modal";   // ✅ YOUR CUSTOM MODAL
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface HostProfilePanelProps {
  host: any;
  setHost: React.Dispatch<React.SetStateAction<any>>;
}

export default function HostProfilePanel({ host, setHost }: HostProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  const [showGuestModal, setShowGuestModal] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function updateGuestOption(field: string, value: boolean) {
    await supabase
      .from("hosts")
      .update({ [field]: value })
      .eq("id", host.id);

    setHost((prev: any) => ({ ...prev, [field]: value }));
  }

  /** -----------------------------------
   *   Guest Signup Options Modal
   *  ----------------------------------- */
  const GuestOptionsModal = () => (
    <Modal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)}>
      <div className="text-white">
        <h2 className={cn('text-xl', 'font-semibold', 'text-center', 'text-sky-300', 'mb-4')}>
          Guest Sign Up Options
        </h2>

        <div className="space-y-4">
          {/* Always Required */}
          <div className={cn('flex', 'items-center', 'justify-between', 'p-2', 'bg-black/40', 'rounded-lg', 'border', 'border-white/10')}>
            <span className={cn('font-medium', 'text-gray-200')}>First Name</span>
            <span className={cn('text-gray-400', 'text-sm', 'italic')}>
              (always required)
            </span>
          </div>

          {/* Toggles */}
          {[
            { key: "require_last_name", label: "Last Name" },
            { key: "require_email", label: "Email Address" },
            { key: "require_phone", label: "Phone Number" },
            { key: "require_street", label: "Street Address" },
            { key: "require_city", label: "City" },
            { key: "require_state", label: "State" },
            { key: "require_zip", label: "ZIP Code" },
            { key: "require_age", label: "Age" },
          ].map((field) => (
            <div
              key={field.key}
              className={cn('flex', 'items-center', 'justify-between', 'p-2', 'bg-black/40', 'rounded-lg', 'border', 'border-white/10')}
            >
              <span className="font-medium">{field.label}</span>
              <Switch
                checked={host[field.key]}
                onCheckedChange={(v) => updateGuestOption(field.key, v)}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );

  if (!host) {
    return (
      <div className={cn('flex', 'items-center', 'justify-center', 'text-gray-400', 'text-sm', 'py-6')}>
        Loading profile…
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className={cn('rounded-full', 'w-10', 'h-10', 'overflow-hidden', 'border', 'border-gray-500', 'hover:ring-2', 'hover:ring-blue-500', 'transition-all')}>
          <div className={cn('bg-gray-700', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center', 'text-gray-200', 'font-bold')}>
            {host?.first_name?.[0]?.toUpperCase() ||
              host?.venue_name?.[0]?.toUpperCase() ||
              "H"}
          </div>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className={cn('w-80', 'bg-black/80', 'backdrop-blur-xl', 'border-l', 'border-gray-700', 'text-gray-100', 'overflow-y-auto')}
      >
        <SheetHeader>
          <SheetTitle className={cn('text-white', 'font-semibold', 'tracking-wide', 'text-center')}>
            Host Profile
          </SheetTitle>
        </SheetHeader>

        <div className={cn('mt-5', 'flex', 'flex-col', 'gap-6')}>
          {/* ACCOUNT */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold')}>
              <User className={cn('w-5', 'h-5')} /> Account
            </div>

            <div className={cn('flex', 'flex-col', 'items-center', 'gap-3', 'text-center')}>
              <div className={cn('w-24', 'h-24', 'rounded-full', 'overflow-hidden', 'border', 'border-gray-600', 'shadow-md', 'flex', 'items-center', 'justify-center', 'bg-gray-800')}>
                <span className={cn('text-3xl', 'font-semibold', 'text-gray-300')}>
                  {host?.first_name?.[0]?.toUpperCase() || "H"}
                </span>
              </div>

              <div className={cn('text-center', 'mt-3')}>
                <p className={cn('font-semibold', 'text-lg', 'text-white')}>
                  {host?.first_name && host?.last_name
                    ? `${host.first_name} ${host.last_name}`
                    : host?.venue_name || "Host User"}
                </p>
                <p className={cn('text-sm', 'text-gray-400')}>{host?.email}</p>
                <p className={cn('text-sm', 'text-gray-400', 'italic', 'mt-1')}>
                  Role: {host?.role || "host"}
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
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold')}>
              <Settings className={cn('w-5', 'h-5')} /> Settings
            </div>
            <p className={cn('text-sm', 'text-gray-400', 'text-center')}>
              Venue: {host?.venue_name}
            </p>
            <p className={cn('text-sm', 'text-gray-400', 'text-center')}>
              Username: {host?.username}
            </p>
            <p className={cn('text-sm', 'text-gray-400', 'text-center')}>
              Created: {new Date(host?.created_at).toLocaleDateString()}
            </p>

            <Button
              variant="outline"
              className={cn('w-full', 'mt-3', 'flex', 'items-center', 'justify-center', 'gap-2')}
              onClick={() => setShowGuestModal(true)}
            >
              <SlidersHorizontal className={cn('w-4', 'h-4')} />
              Guest Sign Up Options
            </Button>

            <GuestOptionsModal />
          </section>

          {/* BILLING */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold')}>
              <CreditCard className={cn('w-5', 'h-5')} /> Billing
            </div>
            <Button variant="outline" className="w-full" disabled>
              Manage Billing (coming soon)
            </Button>
          </section>

          {/* SECURITY */}
          <section>
            <div className={cn('flex', 'items-center', 'justify-center', 'gap-3', 'mb-3', 'text-blue-400', 'font-semibold')}>
              <LogOut className={cn('w-5', 'h-5')} /> Security
            </div>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </section>

          <div className="h-8" />
        </div>

        {/* Email Modal */}
        <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)}>
          <ChangeEmailModal onClose={() => setShowEmailModal(false)} />
        </Modal>

        {/* Password Modal */}
        <Modal isOpen={showPassModal} onClose={() => setShowPassModal(false)}>
          <ChangePasswordModal onClose={() => setShowPassModal(false)} />
        </Modal>
      </SheetContent>
    </Sheet>
  );
}
