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
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';
import ChangeEmailModal from '@/components/ChangeEmailModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { motion } from 'framer-motion';
import { toast } from 'sonner'; // ✅ Toasts added

interface HostProfilePanelProps {
  host: any;
  onLogoUpload: (file: File) => Promise<void>;
  setHost: React.Dispatch<React.SetStateAction<any>>;
}

export default function HostProfilePanel({ host, onLogoUpload, setHost }: HostProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBrandLogo, setDeletingBrandLogo] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState(false);

  /* ---------- PROFILE LOGO UPLOAD ---------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading profile logo...");
    setUploadingProfile(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${host.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('host-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase
        .storage
        .from('host-logos')
        .getPublicUrl(filePath);
      const logoUrl = publicUrlData?.publicUrl;

      const { error: updateError } = await supabase
        .from('hosts')
        .update({ logo_url: logoUrl })
        .eq('id', host.id);
      if (updateError) throw updateError;

      setHost((prev: any) => ({ ...prev, logo_url: logoUrl }));
      toast.success("✅ Profile logo uploaded successfully!", { id: toastId });
    } catch (err) {
      console.error("❌ Upload failed:", err);
      toast.error("Upload failed. Please try again.", { id: toastId });
    } finally {
      setUploadingProfile(false);
      toast.dismiss(toastId);
    }
  };

  /* ---------- BRANDING LOGO UPLOAD ---------- */
  const handleBrandingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading branding logo...");
    setUploadingBrand(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('bar-logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase
        .storage
        .from('bar-logos')
        .getPublicUrl(filePath);
      const logoUrl = publicUrlData?.publicUrl;

      const { error: updateError } = await supabase
        .from('hosts')
        .update({ branding_logo_url: logoUrl })
        .eq('auth_id', user.id);
      if (updateError) throw updateError;

      setHost((prev: any) => ({ ...prev, branding_logo_url: logoUrl }));
      toast.success("✅ Branding logo uploaded successfully!", { id: toastId });
    } catch (err) {
      console.error("❌ Branding upload failed:", err);
      toast.error("Upload failed. Please try again.", { id: toastId });
    } finally {
      setUploadingBrand(false);
      toast.dismiss(toastId);
    }
  };

  /* ---------- DELETE BRANDING LOGO ---------- */
  const handleDeleteBrandingLogo = async () => {
    if (!host?.branding_logo_url) return;
    setDeletingBrandLogo(true);

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

      setHost((prev: any) => ({ ...prev, branding_logo_url: null }));
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('❌ Failed to delete branding logo:', err);
      alert('Error removing logo.');
    } finally {
      setDeletingBrandLogo(false);
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

      setHost((prev: any) => ({ ...prev, logo_url: null }));
    } catch (err) {
      console.error('❌ Failed to delete profile logo:', err);
      alert('Error removing profile logo.');
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (!host) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm py-6">
        Loading profile…
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="rounded-full w-10 h-10 overflow-hidden border border-gray-500 hover:ring-2 hover:ring-blue-500 transition-all">
          {host?.logo_url ? (
            <Image src={host.logo_url} alt="Host Logo" width={40} height={40} unoptimized />
          ) : (
            <div className="bg-gray-700 w-full h-full flex items-center justify-center text-gray-200 font-bold">
              {host?.first_name?.[0]?.toUpperCase() || 'H'}
            </div>
          )}
        </button>
      </SheetTrigger>

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
                  <Image src={host.logo_url} alt="Logo" width={96} height={96} unoptimized />
                ) : (
                  <div className="bg-gray-800 w-full h-full flex items-center justify-center text-gray-500 text-xl">
                    {host?.first_name?.[0]?.toUpperCase() || 'H'}
                  </div>
                )}
              </div>

              <label className="mt-1 cursor-pointer text-sm text-blue-400 hover:underline flex items-center justify-center gap-1">
                {uploadingProfile ? (
                  <div className="flex items-center gap-2 text-blue-400">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading…
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Profile Logo
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingProfile}
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
              Upload your bar or venue logo below. It will automatically replace the FanInteract logo across all your fan walls.
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
                    unoptimized
                  />
                ) : (
                  <span className="text-gray-500 text-sm">No logo yet</span>
                )}
              </div>

              <label className="mt-2 cursor-pointer text-sm text-blue-400 hover:underline flex items-center justify-center gap-1">
                {uploadingBrand ? (
                  <div className="flex items-center gap-2 text-blue-400">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading…
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Branding Logo
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBrandingLogoUpload}
                  disabled={uploadingBrand}
                />
              </label>

              {host?.branding_logo_url && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
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

        {/* ---------- DELETE CONFIRM MODAL ---------- */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0d1625]/90 border border-blue-800/40 rounded-xl shadow-lg p-6 text-center w-[360px]"
            >
              <AlertTriangle className="text-yellow-400 w-10 h-10 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Remove Branding Logo?</h3>
              <p className="text-gray-400 text-sm mb-5">
                This will permanently delete your uploaded brand logo from storage.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="destructive" onClick={handleDeleteBrandingLogo} disabled={deletingBrandLogo}>
                  {deletingBrandLogo ? 'Deleting…' : 'Yes, Delete'}
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ---------- EMAIL + PASSWORD MODALS ---------- */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-900 border border-gray-700 rounded-lg shadow-lg w-96">
              <ChangeEmailModal onClose={() => setShowEmailModal(false)} />
            </div>
          </div>
        )}

        {showPassModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-900 border border-gray-700 rounded-lg shadow-lg w-96">
              <ChangePasswordModal onClose={() => setShowPassModal(false)} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}