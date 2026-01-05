"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  Mail,
  Lock,
  User as UserIcon,
  ChevronDown,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { User } from "@/types";
import {
  useUpdateEmail,
  useUpdatePassword,
  useSetPassword,
  useUpdateUsername,
  useUploadAvatar,
  useDeleteAvatar,
} from "@/hooks/useApi";
import { GlassCard, Avatar, GlowButton, easings } from "@/components/ui";

interface ProfileEditPanelProps {
  user: User;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-white/[0.06] pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted group-hover:text-violet-400 transition-colors" />
          <span className="text-sm font-medium text-white group-hover:text-violet-400 transition-colors">
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: easings.smooth }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${error
            ? "border-red-500/50 focus:ring-red-500/50"
            : "border-white/10 focus:ring-violet-500/50 focus:border-violet-500/50"
          }`}
      />
      {error && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

export function ProfileEditPanel({ user }: ProfileEditPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");

  // Mutations
  const updateEmailMutation = useUpdateEmail();
  const updatePasswordMutation = useUpdatePassword();
  const setPasswordMutation = useSetPassword();
  const updateUsernameMutation = useUpdateUsername();
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  // Calculate days until username can be changed
  const getDaysUntilUsernameChange = () => {
    if (!user.username_last_changed_at) return 0;
    const lastChanged = new Date(user.username_last_changed_at);
    const daysSince = Math.floor(
      (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 30 - daysSince);
  };

  const daysRemaining = getDaysUntilUsernameChange();
  const canChangeUsername = daysRemaining === 0;

  // Handlers
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a PNG, JPG, or WEBP image");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      await uploadAvatarMutation.mutateAsync(file);
      toast.success("Avatar updated successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar";
      toast.error(errorMessage);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail || !emailPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await updateEmailMutation.mutateAsync({
        new_email: newEmail,
        password: emailPassword,
      });
      toast.success("Email updated successfully!");
      setNewEmail("");
      setEmailPassword("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update email";
      toast.error(errorMessage);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update password";
      toast.error(errorMessage);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      await setPasswordMutation.mutateAsync({
        new_password: newPassword,
      });
      toast.success("Password set successfully! You can now login with email and password.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to set password";
      toast.error(errorMessage);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername) {
      toast.error("Please enter a new username");
      return;
    }

    if (newUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    try {
      await updateUsernameMutation.mutateAsync({
        new_username: newUsername,
      });
      toast.success("Username updated successfully!");
      setNewUsername("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update username";
      toast.error(errorMessage);
    }
  };

  const isGoogleOnly = user.google_id && !user.password_hash;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: easings.smooth }}
    >
      <GlassCard className="p-6 sticky top-24">
        <h2 className="text-lg font-semibold text-white mb-6">Edit Profile</h2>

        {/* Avatar Section */}
        <div className="text-center mb-6">
          <div className="relative inline-block group">
            <Avatar
              name={user.display_name || "User"}
              size="2xl"
              tier={user.tier}
              src={user.avatar_url || undefined}
            />
            <button
              onClick={handleAvatarClick}
              disabled={uploadAvatarMutation.isPending}
              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            >
              {uploadAvatarMutation.isPending ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
              title="Upload avatar"
              aria-label="Upload avatar"
            />
          </div>
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploadAvatarMutation.isPending}
            className="text-xs text-text-muted mt-2 hover:text-violet-400 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Click to change photo
          </button>
          {user.avatar_url && (
            <button
              onClick={() => {
                deleteAvatarMutation.mutate(undefined, {
                  onSuccess: () => toast.success("Avatar removed"),
                  onError: () => toast.error("Failed to remove avatar"),
                });
              }}
              disabled={deleteAvatarMutation.isPending}
              className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
            >
              Remove photo
            </button>
          )}
        </div>

        {/* Email Section */}
        <CollapsibleSection title="Change Email" icon={Mail}>
          {isGoogleOnly ? (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Email cannot be changed for Google accounts
            </p>
          ) : (
            <>
              <p className="text-xs text-text-muted mb-2">
                Current: {user.email || "Not set"}
              </p>
              <InputField
                label="New Email"
                type="email"
                value={newEmail}
                onChange={setNewEmail}
                placeholder="new@email.com"
                disabled={updateEmailMutation.isPending}
              />
              <InputField
                label="Current Password"
                type="password"
                value={emailPassword}
                onChange={setEmailPassword}
                placeholder="Enter your password"
                disabled={updateEmailMutation.isPending}
              />
              <GlowButton
                size="sm"
                className="w-full"
                onClick={handleEmailUpdate}
                disabled={updateEmailMutation.isPending || !newEmail || !emailPassword}
              >
                {updateEmailMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Update Email
                  </>
                )}
              </GlowButton>
            </>
          )}
        </CollapsibleSection>

        {/* Password Section */}
        <CollapsibleSection title="Change Password" icon={Lock}>
          {isGoogleOnly ? (
            <>
              <p className="text-xs text-amber-400 flex items-center gap-1 mb-3">
                <AlertCircle className="w-3 h-3" />
                Set a password to enable email/password login
              </p>
              <InputField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
                disabled={setPasswordMutation.isPending}
              />
              <InputField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm password"
                disabled={setPasswordMutation.isPending}
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? "Passwords don't match"
                    : undefined
                }
              />
              <GlowButton
                size="sm"
                className="w-full"
                onClick={handleSetPassword}
                disabled={
                  setPasswordMutation.isPending ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword ||
                  newPassword.length < 8
                }
              >
                {setPasswordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Set Password
                  </>
                )}
              </GlowButton>
            </>
          ) : (
            <>
              <InputField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Current password"
                disabled={updatePasswordMutation.isPending}
              />
              <InputField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
                disabled={updatePasswordMutation.isPending}
              />
              <InputField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                disabled={updatePasswordMutation.isPending}
                error={
                  confirmPassword && newPassword !== confirmPassword
                    ? "Passwords don't match"
                    : undefined
                }
              />
              <GlowButton
                size="sm"
                className="w-full"
                onClick={handlePasswordUpdate}
                disabled={
                  updatePasswordMutation.isPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
              >
                {updatePasswordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Update Password
                  </>
                )}
              </GlowButton>
            </>
          )}
        </CollapsibleSection>

        {/* Username Section */}
        <CollapsibleSection title="Change Username" icon={UserIcon}>
          <p className="text-xs text-text-muted mb-2">
            Current: {user.display_name}
          </p>

          {!canChangeUsername && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                You can change your username in {daysRemaining} day
                {daysRemaining !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          <InputField
            label="New Username"
            value={newUsername}
            onChange={setNewUsername}
            placeholder="3-30 characters, letters/numbers/_"
            disabled={!canChangeUsername || updateUsernameMutation.isPending}
          />
          <GlowButton
            size="sm"
            className="w-full"
            onClick={handleUsernameUpdate}
            disabled={
              !canChangeUsername ||
              updateUsernameMutation.isPending ||
              !newUsername ||
              newUsername.length < 3
            }
          >
            {updateUsernameMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Update Username
              </>
            )}
          </GlowButton>
          <p className="text-xs text-text-muted mt-2 text-center">
            Username can only be changed once every 30 days
          </p>
        </CollapsibleSection>
      </GlassCard>
    </motion.div>
  );
}
