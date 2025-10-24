'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
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
      <SheetTrigger asChild>
        <button className="rounded-full w-10 h-10 overflow-hidden border border-gray-400 hover:ring-2 hover:ring-blue-400">
          {host?.logo_url ? (
            <Image src={host.logo_url} alt="Host Logo" width={40} height={40} />
          ) : (
            <div className="bg-gray-300 w-full h-full flex items-center justify-center text-gray-700 font-bold">
              {host?.name?.[0] || 'H'}
            </div>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Host Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300">
              {host?.logo_url ? (
                <Image src={host.logo_url} alt="Logo" width={96} height={96} />
              ) : (
                <div className="bg-gray-200 w-full h-full flex items-center justify-center text-gray-500 text-xl">
                  {host?.name?.[0] || 'H'}
                </div>
              )}
            </div>
            <label className="mt-2 cursor-pointer text-sm text-blue-600 hover:underline">
              <Upload className="inline-block mr-1 w-4 h-4" />
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="text-center">
            <p className="font-semibold text-lg">{host?.name}</p>
            <p className="text-sm text-gray-500">{host?.email}</p>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <Button variant="outline">Change Email</Button>
            <Button variant="outline">Change Password</Button>
            <Button variant="outline">Billing</Button>
            <Button variant="destructive">Logout</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
