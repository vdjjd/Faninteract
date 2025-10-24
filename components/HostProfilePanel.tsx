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

/* ✅ Added setHost to interface */
interface HostProfilePanelProps {
  host: any;
  onLogoUpload: (file: File) => Promise<void>;
  setHost: React.Dispatch<React.SetStateAction<any>>; // ✅ <-- add this line
}

export default function HostProfilePanel({ host, onLogoUpload, setHost }: HostProfilePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBrandLogo, setDeletingBrandLogo] = useState(false);

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

    const { data: publicUrlData } = supabase
      .storage
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
    // ✅ Live update instead of reload
    setHost((prev: any) => ({ ...prev, branding_logo_url: logoUrl }));
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

  /* ---------- LOGOUT ---------- */
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  /* ---------- COMPONENT ---------- */
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
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

      <SheetContent
        side="right"
        className="w-80 bg-black/80 backdrop-blur-xl border-l border-gray-700 text-gray-100 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-white font-semibold tracking-wide text-center">
            Host Profile
          </SheetTitle>
        </SheetHeader>

        {/* (rest of your JSX stays identical) */}
        {/* ✅ No visual or functional change below */}
        {/* ✅ Keeps profile open after changes */}
        {/* ✅ Branding delete popup still matches your style */}
        ...
      </SheetContent>
    </Sheet>
  );
}