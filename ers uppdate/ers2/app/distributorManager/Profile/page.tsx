"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  User, ShieldCheck, Lock, Mail, Building2,
  Camera, Save, LogOut, Key, Fingerprint, Globe, 
  Smartphone, Loader2, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/app/context/authcontext';

// --- API CONFIG ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    role: '',
    is_active: true,
  });

  const [securityKeys, setSecurityKeys] = useState({
    currentKey: '',
    newKey: '',
    confirmKey: ''
  });

  // --- Read user from virtue_user cookie (set by AuthContext on login) ---
  const { logout } = useAuth();

  const getUserFromCookie = useCallback(() => {
    try {
      const raw = Cookies.get('virtue_user');
      if (raw) return JSON.parse(raw);
    } catch { }
    return null;
  }, []);

  const getToken = () => Cookies.get('auth_token') || Cookies.get('virtue_token') || '';

  const userId = getUserFromCookie()?.id;

  // --- FETCH PROFILE ---
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!userId) {
        // Load what we can from the cookie
        const user = getUserFromCookie();
        if (user) {
          setProfile({
            username: user.username || user.name || '',
            email: user.useremail || user.email || '',
            role: user.role || '',
            is_active: true,
          });
        }
        setIsLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE}/api/v1/users/iduser/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      const data = res.data;
      setProfile({
        username: data.username || '',
        email: data.email || '',
        role: data.role || '',
        is_active: data.is_active ?? true,
      });
    } catch (err) {
      // Fallback to cookie data silently
      const user = getUserFromCookie();
      if (user) {
        setProfile({
          username: user.username || user.name || '',
          email: user.useremail || user.email || '',
          role: user.role || '',
          is_active: true,
        });
      }
      toast.error("Could not sync with server. Showing local profile.");
    } finally {
      setIsLoading(false);
    }
  }, [userId, getUserFromCookie]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // --- UPDATE PROFILE ---
  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error("User ID not found. Please re-login.");
    setIsSaving(true);
    const tId = toast.loading("Saving profile...");
    try {
      await axios.post(
        `${API_BASE}/api/v1/users/profile/${userId}`,
        { username: profile.username.trim() },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success("Profile updated successfully!", { id: tId });
    } catch (err) {
      toast.error("Failed to update profile.", { id: tId });
    } finally {
      setIsSaving(false);
    }
  };

  // --- CHANGE PASSWORD ---
  const handleKeyUpdate = async () => {
    if (!securityKeys.newKey || !securityKeys.currentKey) {
      return toast.error("Please fill in all password fields.");
    }
    if (securityKeys.newKey !== securityKeys.confirmKey) {
      return toast.error("New password and confirmation do not match.");
    }
    const isValidPassword = (pw: string) => {
      if (pw.length < 8) return false;
      if (!/[A-Z]/.test(pw)) return false;
      if (!/[a-z]/.test(pw)) return false;
      if (!/[0-9]/.test(pw)) return false;
      if (!/[^A-Za-z0-9]/.test(pw)) return false;
      return true;
    };

    if (!isValidPassword(securityKeys.newKey)) {
      return toast.warning("SECURITY RISK", { description: "Password must be at least 8 chars with uppercase, lowercase, number, and special character." });
    }
    if (!userId) return toast.error("User ID not found. Please re-login.");

    setIsSavingPassword(true);
    const tId = toast.loading("Changing password...");
    try {
      await axios.post(
        `${API_BASE}/api/v1/users/changepassword/${userId}`,
        {
          currentPassword: securityKeys.currentKey,
          newPassword: securityKeys.newKey,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setSecurityKeys({ currentKey: '', newKey: '', confirmKey: '' });
      toast.success("Password changed successfully!", { id: tId });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to change password.";
      toast.error(msg, { id: tId });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl py-3 px-5 text-xs text-white outline-none focus:border-blue-500 font-bold transition-all";
  const labelClass = "text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1";

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase">Loading Profile...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20 p-4">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Page Title */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
          <ShieldCheck className="text-blue-500 w-10 h-10" />
          Profile Settings
        </h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
          Operator: <span className="text-blue-500">{profile.email}</span>
          <span className="text-slate-700">•</span>
          <span className="text-emerald-500">{profile.role}</span>
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Identity Card */}
        <div className="xl:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950/40 border border-white/[0.08] p-8 rounded-[3rem] backdrop-blur-xl relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-blue-600/20 p-1">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-4xl font-black italic text-white shadow-2xl">
                    {(profile.username || profile.email || 'U').substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <button className="absolute bottom-1 right-1 p-2.5 bg-blue-600 rounded-full text-white border-4 border-slate-950 hover:scale-110 transition-all">
                  <Camera size={16} />
                </button>
              </div>

              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{profile.username || 'User'}</h2>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">{profile.role}</p>

              <div className="w-full h-px bg-white/5 my-6" />

              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 text-slate-400">
                  <Mail size={16} className="text-blue-500/50 shrink-0" />
                  <span className="text-[11px] font-bold truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <CheckCircle2 size={16} className={profile.is_active ? "text-emerald-500/70" : "text-rose-500/70"} />
                  <span className="text-[11px] font-bold uppercase">{profile.is_active ? 'Account Active' : 'Account Inactive'}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="mt-8 w-full py-4 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} /> Terminate Session
              </button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem]">
              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Status</p>
              <h4 className="text-sm font-black text-emerald-400 italic">Active</h4>
            </div>
            <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem]">
              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Access</p>
              <h4 className="text-sm font-black text-blue-400 italic">{profile.role?.split('_')[0] || 'User'}</h4>
            </div>
          </div>
        </div>

        {/* Right: Settings Controls */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-slate-950/40 border border-white/[0.08] rounded-[3rem] backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Tabs */}
            <div className="flex border-b border-white/5 px-4">
              {[
                { id: 'account', label: 'Profile Info', icon: User },
                { id: 'security', label: 'Change Password', icon: Lock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2",
                    activeTab === tab.id
                      ? "border-blue-500 text-white bg-blue-500/5"
                      : "border-transparent text-slate-500 hover:text-white"
                  )}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-10">
              <AnimatePresence mode="wait">
                {/* Account Tab */}
                {activeTab === 'account' && (
                  <motion.form
                    key="account"
                    onSubmit={handleUpdateNode}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className={labelClass}>Username / Display Name</label>
                        <input
                          type="text"
                          value={profile.username}
                          onChange={e => setProfile({ ...profile, username: e.target.value })}
                          className={inputClass}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Email (Read Only)</label>
                        <input
                          type="email"
                          readOnly
                          value={profile.email}
                          className={cn(inputClass, "text-slate-500 cursor-not-allowed")}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={labelClass}>Role (Read Only)</label>
                        <input
                          type="text"
                          readOnly
                          value={profile.role}
                          className={cn(inputClass, "text-blue-400 cursor-not-allowed")}
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                      <p className="text-[9px] text-slate-500 font-bold uppercase italic tracking-widest flex items-center gap-2">
                        <ShieldAlert size={14} className="text-blue-500 animate-pulse" />
                        Profile updates are saved immediately.
                      </p>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Profile
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl flex items-center gap-4">
                      <Fingerprint className="text-blue-500 shrink-0" size={24} />
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Change Your Password</h4>
                        <p className="text-[9px] text-slate-500 uppercase font-bold italic mt-1">Enter your current password and then set a new one</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className={labelClass}>Current Password</label>
                        <div className="relative">
                          <Key size={14} className="absolute left-4 top-3.5 text-slate-600" />
                          <input
                            type="password"
                            placeholder="Enter current password"
                            value={securityKeys.currentKey}
                            onChange={e => setSecurityKeys({ ...securityKeys, currentKey: e.target.value })}
                            className={cn(inputClass, "pl-10")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className={labelClass}>New Password</label>
                          <div className="relative">
                            <Lock size={14} className="absolute left-4 top-3.5 text-slate-600" />
                            <input
                              type="password"
                              placeholder="Enter new password"
                              value={securityKeys.newKey}
                              onChange={e => setSecurityKeys({ ...securityKeys, newKey: e.target.value })}
                              className={cn(inputClass, "pl-10")}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={labelClass}>Confirm New Password</label>
                          <div className="relative">
                            <Lock size={14} className="absolute left-4 top-3.5 text-slate-600" />
                            <input
                              type="password"
                              placeholder="Confirm new password"
                              value={securityKeys.confirmKey}
                              onChange={e => setSecurityKeys({ ...securityKeys, confirmKey: e.target.value })}
                              className={cn(inputClass, "pl-10", securityKeys.confirmKey && securityKeys.newKey !== securityKeys.confirmKey ? "border-rose-500/50" : "")}
                            />
                          </div>
                          {securityKeys.confirmKey && securityKeys.newKey !== securityKeys.confirmKey && (
                            <p className="text-[9px] text-rose-500 font-bold ml-2">Passwords do not match</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleKeyUpdate}
                        disabled={isSavingPassword || !securityKeys.currentKey || !securityKeys.newKey || !securityKeys.confirmKey}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        {isSavingPassword ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />}
                        Update Password
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}