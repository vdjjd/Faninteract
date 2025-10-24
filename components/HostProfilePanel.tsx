'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, User, Settings, CreditCard, LogOut, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface HostProfilePanelProps {
  host: any;
  onLogoUpload: (file: File) => Promise<void>;
}

export default function HostProfilePanel({ host, onLogoUpload }: HostProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onLogoUpload(file);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Avatar Trigger */}
      <SheetTrigger asChild>
        <button className="rounded-full w-10 h-10 overflow-hidden border border-gray-500 hover:ring-2 hover:ring-blue-500 transition-all">
          {host?.logo_url ? (
            <Image src={host.logo_url} alt="Host Logo" width={40} height={40} />
          ) : (
            <div className="bg-gray-700 w-full h-full flex items-center justify-center text-gray-200 font-bold">
              {host?.name?.[0]?.toUpperCase() || 'H'}
            </div>
          )}
        </button>
      </SheetTrigger>

      {/* Slide-Out Sidebar */}
      <SheetContent
        side="right"
        className="w-80 bg-black/80 backdrop-blur-xl border-l border-gray-700 text-gray-100 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-white font-semibold tracking-wide">
            Host Profile
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 flex flex-col gap-6">
          {/* ACCOUNT */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <User className="w-5 h-5" />
              Account
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-600 shadow-md">
                {host?.logo_url ? (
                  <Image src={host.logo_url} alt="Logo" width={96} height={96} />
                ) : (
                  <div className="bg-gray-800 w-full h-full flex items-center justify-center text-gray-500 text-xl">
                    {host?.name?.[0]?.toUpperCase() || 'H'}
                  </div>
                )}
              </div>
              <label className="mt-1 cursor-pointer text-sm text-blue-400 hover:underline">
                <Upload className="inline-block mr-1 w-4 h-4" />
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <div className="text-center mt-2">
                <p className="font-semibold text-lg text-white">
                  {host?.name || 'Host'}
                </p>
                <p className="text-sm text-gray-400">{host?.email}</p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-4">
                <Button variant="outline">Change Email</Button>
                <Button variant="outline">Change Password</Button>
              </div>
            </div>
          </section>

          {/* BRANDING */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <ImageIcon className="w-5 h-5" />
              Branding
            </div>
            <p className="text-sm text-gray-400">
              The uploaded logo automatically replaces the FanInteract default across your fan walls.
            </p>
          </section>

          {/* SETTINGS (placeholders for future) */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <Settings className="w-5 h-5" />
              Settings
            </div>
            <p className="text-sm text-gray-400">Business Name / Venue Name – coming soon</p>
            <p className="text-sm text-gray-400">Contact Phone – coming soon</p>
          </section>

          {/* BILLING */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <CreditCard className="w-5 h-5" />
              Billing
            </div>
            <Button variant="outline" className="w-full">Manage Billing (coming soon)</Button>
          </section>

          {/* LOGOUT */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <LogOut className="w-5 h-5" />
              Security
            </div>
            <Button variant="destructive" className="w-full">
              Logout
            </Button>
          </section>

          <div className="h-8"></div>
        </div>
      </SheetContent>
    </Sheet>
  );
}