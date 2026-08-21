'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

import TypewriterText from '@/components/TypewriterText';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleForgotPassword = async () => {
    setForgotMsg(null);
    if (!forgotEmail.trim()) {
      setForgotMsg({ type: 'error', text: 'Masukkan alamat email Anda.' });
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotMsg({ type: 'success', text: 'Tautan reset password telah dikirim ke email Anda. Silakan cek inbox atau folder Spam.' });
      // Auto-close modal after 2.5 seconds on success
      setTimeout(() => {
        closeForgotModal();
      }, 2500);
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err.message || 'Gagal mengirim tautan reset. Periksa email Anda.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotMsg(null);
    setForgotLoading(false);
  };

  // Helper: clear previous user's cached profile data on new login
  const clearPreviousUserCache = () => {
    if (typeof window !== 'undefined') {
      try {
        // Remove the global standalone key
        localStorage.removeItem('lms_teacher_profile_data');
        // Remove all per-user profile keys
        const keys = Object.keys(localStorage).filter(k => k.startsWith('lms_teacher_profile_'));
        keys.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { api } = await import('@/lib/api');
      const res = await api.login(email, password);
      const userObj = res.user;

      if (typeof window !== 'undefined') {
        clearPreviousUserCache();
        localStorage.setItem('lms_user', JSON.stringify(userObj));
      }

      const roleStr = userObj.role === 'guru' ? 'guru' : (userObj.role === 'siswa' ? 'siswa' : 'admin');
      router.push(`/${roleStr}/dashboard`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between font-sans">
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden">
        
        {/* Left Side: Original Theme White & Royal Blue Visual Hero */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden z-10 border-b lg:border-b-0 lg:border-r border-slate-100">
          
          {/* Decorative Royal Blue Blobs (Optimized GPU Rendering) */}
          <div className="absolute -top-36 -right-36 w-[400px] h-[400px] bg-[#2563EB]/5 rounded-full pointer-events-none hidden sm:block" />
          <div className="absolute -bottom-36 -left-36 w-[420px] h-[420px] bg-[#2563EB]/10 rounded-full pointer-events-none hidden sm:block" />

          {/* Logo Header */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 bg-[#2563EB] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-xl tracking-tight leading-tight">EduSchool</h1>
              <p className="text-xs text-[#1D4ED8] font-bold">School Platform</p>
            </div>
          </div>

          {/* Hero Tagline */}
          <div className="max-w-lg my-auto py-8 sm:py-12 relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-[#1D4ED8]">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
              <span>Platform Pembelajaran Sekolah Terpadu</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold text-[#1D4ED8] tracking-tight leading-[1.25] min-h-[96px] sm:min-h-[120px] lg:min-h-[150px]">
              <TypewriterText
                phrases={[
                  "Kelola aktivitas belajar-mengajar dalam satu platform.",
                  "Pantau presensi, tugas, dan nilai secara real-time.",
                  "Solusi digital terpadu untuk sekolah masa depan."
                ]}
                typingSpeed={45}
                pauseDuration={3200}
              />
            </h2>
            
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              Akses dashboard admin, guru, dan siswa secara terintegrasi — materi, tugas, presensi, hingga laporan real-time.
            </p>
          </div>

          {/* Footer Copyright */}
          <div className="text-xs text-slate-500 font-medium relative z-10 pt-4">
            © 2026 EduSchool Platform. All rights reserved.
          </div>
        </div>

        {/* Right Side: Form & Demo Accounts */}
        <div className="lg:col-span-6 bg-[#F8FAFC] p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative z-10">
          <div className="w-full max-w-md mx-auto">
            
            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Masuk ke Akun Anda</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Silakan login menggunakan email dan password terdaftar.</p>
              {errorMsg && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Main Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1.5">Email / Username</label>
                <div className="relative">
                  <input
                    id="login-email"
                    name="email"
                    type="text"
                    required
                    aria-label="Email atau Username"
                    placeholder="nama@EduSchool.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition shadow-xs pl-10 font-medium"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    aria-label="Kata Sandi / Password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition shadow-xs pl-10 pr-10 font-medium"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-800 p-0.5 rounded-lg focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <label htmlFor="login-remember" className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    id="login-remember"
                    name="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#2563EB] hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">Masukkan email terdaftar untuk menerima tautan reset password.</p>

            {forgotMsg && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold border ${forgotMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                {forgotMsg.text}
              </div>
            )}

            <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
            <div className="relative mb-5">
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="nama@EduSchool.sch.id"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition shadow-xs pl-10 font-medium"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeForgotModal}
                className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="flex-1 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
              >
                {forgotLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
