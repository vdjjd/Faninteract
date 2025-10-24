'use client';

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
  Upload,
  User,
  Settings,
  CreditCard,
  LogOut,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import ChangeEmailModal from '@/components/ChangeEmailModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';

interface HostProfilePanelProps {
  host: any;
  onLogoUpload: (file: File) => Promise<void>;
}

export default function HostProfilePanel({ host, onLogoUpload }: HostProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  /* ---------- PROFILE LOGO UPLOAD ---------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onLogoUpload(file);
  };

  /* ---------- BRANDING LOGO UPLOAD ---------- */
  const handleBrandingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Unable to retrieve user for upload:', userError?.message);
      return;
    }

    const filePath = `${user.id}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('bar-logos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.error('❌ Branding logo upload failed:', uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('bar-logos')
      .getPublicUrl(filePath);

    const logoUrl = publicUrlData?.publicUrl;

    const { error: updateError } = await supabase
      .from('hosts')
      .update({ branding_logo_url: logoUrl })
      .eq('auth_id', user.id);

    if (updateError) {
      console.error('❌ Failed to update branding logo URL:', updateError.message);
      return;
    }

    console.log('✅ Branding logo uploaded successfully:', logoUrl);
    window.location.reload();
  };

  /* ---------- DELETE BRANDING LOGO ---------- */
  const handleDeleteBrandingLogo = async () => {
    if (!host?.branding_logo_url) return;
    try {
      const pathParts = host.branding_logo_url.split('/');
      const filePath = `${pathParts.at(-2)}/${pathParts.at(-1)}`;

      const { error: storageError } = await supabase.storage
        .from('bar-logos')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: updateError } = await supabase
        .from('hosts')
        .update({ branding_logo_url: null })
        .eq('id', host.id);

      if (updateError) throw updateError;

      alert('✅ Branding logo removed.');
      window.location.reload();
    } catch (err) {
      console.error('❌ Failed to delete branding logo:', err);
      alert('Error removing logo.');
    }
  };

  /* ---------- DELETE PROFILE LOGO ---------- */
  const handleDeleteProfileLogo = async () => {
    if (!host?.logo_url) return;
    try {
      const pathParts = host.logo_url.split('/');
      const filePath = `${pathParts.at(-2)}/${pathParts.at(-1)}`;

      const { error: storageError } = await supabase.storage
        .from('host-logos')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: updateError } = await supabase
        .from('hosts')
        .update({ logo_url: null })
        .eq('id', host.id);

      if (updateError) throw updateError;

      alert('✅ Profile logo removed.');
      window.location.reload();
    } catch (err) {
      console.error('❌ Failed to delete profile logo:', err);
      alert('Error removing profile logo.');
    }
  };

  /* ---------- LOGOUT ---------- */
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  /* ---------- COMPONENT ---------- */
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Avatar Trigger */}
      <SheetTrigger asChild>
        <button className="rounded-full w-10 h-10 overflow-hidden border border-gray-500 hover:ring-2 hover:ring-blue-500 transition-all">
          {host?.logo_url ? (
            <Image src={host.logo_url} alt="Host Logo" width={40} height={40} />
          ) : (
            <div className="bg-gray-700 w-full h-full flex items-center justify-center text-gray-200 font-bold">
              {host?.first_name?.[0]?.toUpperCase() || 'H'}
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
          <SheetTitle className="text-white font-semibold tracking-wide text-center">
            Host Profile
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 flex flex-col gap-6">
          {/* ---------- ACCOUNT ---------- */}
          <section>
            <div className="flex items-center justify-center gap-3 mb-3 text-blue-400 font-semibold">
              <User className="w-5 h-5" />
              Account
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-600 shadow-md">
                {host?.logo_url ? (
                  <Image src={host.logo_url} alt="Logo" width={96} height={96} />
                ) : (
                  <div className="bg-gray-800 w-full h-full flex items-center justify-center text-gray-500 text-xl">
                    {host?.first_name?.[0]?.toUpperCase() || 'H'}
                  </div>
                )}
              </div>

              <label className="mt-1 cursor-pointer text-sm text-blue-400 hover:underline">
                <Upload className="inline-block mr-1 w-4 h-4" />
                Upload Profile Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {host?.logo_url && (
                <button
                  onClick={handleDeleteProfileLogo}
                  className="text-red-400 text-sm hover:text-red-500 hover:underline mt-1 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Remove Logo
                </button>
              )}

              <div className="text-center mt-3">
                <p className="font-semibold text-lg text-white">
                  {host?.first_name && host?.last_name
                    ? `${host.first_name} ${host.last_name}`
                    : 'Host User'}
                </p>
                <p className="text-sm text-gray-400">{host?.email}</p>
              </div>

              <div className="flex flex-col gap-2 w-full mt-4">
                <Button variant="outline" onClick={() => setShowEmailModal(true)}>
                  Change Email
                </Button>
                <Button variant="outline" onClick={() => setShowPassModal(true)}>
                  Change Password
                </Button>
              </div>
            </div>
          </section>

          {/* ---------- BRANDING ---------- */}
          <section className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3 text-blue-400 font-semibold">
              <ImageIcon className="w-5 h-5" />
              Branding
            </div>

            <p className="text-sm text-gray-400 mb-3 max-w-[85%] mx-auto leading-snug">
              Upload your bar or venue logo below. It will automatically replace the
              FanInteract logo across all your fan walls.
            </p>

            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-600 shadow-md flex items-center justify-center bg-gray-800">
                {host?.branding_logo_url ? (
                  <Image
                    src={host.branding_logo_url}
                    alt="Brand Logo"
                    width={128}
                    height={128}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-gray-500 text-sm">No logo yet</span>
                )}
              </div>

              <label className="mt-2 cursor-pointer text-sm text-blue-400 hover:underline">
                <Upload className="inline-block mr-1 w-4 h-4" />
                Upload Branding Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBrandingLogoUpload}
                />
              </label>

              {host?.branding_logo_url && (
                <button
                  onClick={handleDeleteBrandingLogo}
                  className="text-red-400 text-sm hover:text-red-500 hover:underline mt-1 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Remove Logo
                </button>
              )}
            </div>
          </section>

          {/* ---------- SETTINGS ---------- */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <Settings className="w-5 h-5" />
              Settings
            </div>
            <p className="text-sm text-gray-400">Business Name / Venue Name – coming soon</p>
            <p className="text-sm text-gray-400">Contact Phone – coming soon</p>
          </section>

          {/* ---------- BILLING ---------- */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <CreditCard className="w-5 h-5" />
              Billing
            </div>
            <Button variant="outline" className="w-full">
              Manage Billing (coming soon)
            </Button>
          </section>

          {/* ---------- LOGOUT ---------- */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-blue-400 font-semibold">
              <LogOut className="w-5 h-5" />
              Security
            </div>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </section>

          <div className="h-8"></div>
        </div>

        {/* ---------- MODALS ---------- */}
        {showEmailModal && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-email-title"
          >
            <div className="bg-neutral-900 border border-gray-700 rounded-lg shadow-lg w-96">
              <div id="change-email-title" className="sr-only">Change Email</div>
              <ChangeEmailModal onClose={() => setShowEmailModal(false)} />
            </div>
          </div>
        )}

        {showPassModal && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="bg-neutral-900 border border-gray-700 rounded-lg shadow-lg w-96">
              <div id="change-password-title" className="sr-only">Change Password</div>
              <ChangePasswordModal onClose={() => setShowPassModal(false)} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}