'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BarChart3, 
  User, 
  LogOut, 
  Menu, 
  X,
  FileText,
  Settings,
  Bell,
  CheckCircle2
} from 'lucide-react';

import { api } from '@/lib/api';

interface DashboardLayoutProps {
  role: 'admin' | 'guru' | 'siswa';
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DashboardLayout({ role, title, subtitle, children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [mountedUser, setMountedUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('lms_user');
      if (cached) {
        try { setMountedUser(JSON.parse(cached)); } catch {}
      }
    }
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await api.getNotifications();
        const list = Array.isArray(data) ? data : ((data as any)?.notifications || []);
        setNotifications(list);
      } catch {}
    };
    loadNotifications();
  }, []);

  const roleConfig = {
    admin: {
      user: { name: 'Admin Utama', sub: 'Super Admin', initials: 'AD' },
      items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { path: '/admin/users', label: 'Management Akun', icon: <Users className="w-5 h-5" /> },
        { path: '/admin/courses', label: 'Monitoring Kelas', icon: <BookOpen className="w-5 h-5" /> },
        { path: '/admin/assignments', label: 'Daftar Tugas', icon: <FileText className="w-5 h-5" /> },
        { path: '/admin/reports', label: 'Laporan & Presensi', icon: <BarChart3 className="w-5 h-5" /> },
        { path: '/admin/settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
      ],
      showWidget: true
    },
    guru: {
      user: { name: 'Guru Pengajar', sub: 'Guru', initials: 'GP' },
      items: [
        { path: '/guru/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { path: '/guru/courses', label: 'Courses / Kelas', icon: <BookOpen className="w-5 h-5" /> },
        { path: '/guru/reports', label: 'Reports / Presensi', icon: <BarChart3 className="w-5 h-5" /> },
        { path: '/guru/profile', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
      ],
      showWidget: false
    },
    siswa: {
      user: { name: 'Peserta Didik', sub: 'Siswa', initials: 'SD' },
      items: [
        { path: '/siswa/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { path: '/siswa/courses', label: 'Courses / Kelas', icon: <BookOpen className="w-5 h-5" /> },
        { path: '/siswa/reports', label: 'Reports / Presensi', icon: <BarChart3 className="w-5 h-5" /> },
        { path: '/siswa/profile', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
      ],
      showWidget: false
    }
  };

  const config = roleConfig[role];
  const fallbackName = role === 'guru' ? 'Tenaga Pengajar' : (role === 'siswa' ? 'Peserta Didik' : 'Admin Utama');
  const fallbackSub = role === 'guru' ? 'Guru Pengajar' : (role === 'siswa' ? 'Siswa / Peserta Didik' : 'Super Admin');
  const fallbackInitials = role === 'guru' ? 'GP' : (role === 'siswa' ? 'SD' : 'AD');

  // Only use real user data after client mount to prevent hydration mismatch
  let userDisplayName = fallbackName;
  let userDisplaySub = fallbackSub;
  let userInitials = fallbackInitials;

  if (isClient) {
    const rawUser = user || mountedUser;
    const activeUser = rawUser?.user || rawUser?.data || rawUser;
    if (activeUser?.name) {
      userDisplayName = activeUser.name;
      userInitials = activeUser.name.replace(/,.*$/, '').split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (activeUser?.subject || activeUser?.specialization) {
      userDisplaySub = activeUser.subject || activeUser.specialization;
    }
  }

  const [userStats, setUserStats] = useState({ total: 0, teachers: 0, students: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleToggleNotifications = async () => {
    if (!showNotifications) {
      setShowNotifications(true);
      try {
        await api.markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        window.dispatchEvent(new CustomEvent('notifications_read'));
      } catch (error) {
        console.error('Failed to mark all as read:', error);
      }
    } else {
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    if (role === 'admin' && userStats.total === 0) {
      api.getAdminStats().then((stats: any) => {
        if (stats && stats.total_users !== undefined) {
          setUserStats({
            total: stats.total_users || 0,
            teachers: stats.total_teachers || 0,
            students: stats.total_students || 0
          });
        }
      }).catch(() => {
        api.getUsers().then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.users || []);
          if (Array.isArray(list) && list.length > 0) {
            setUserStats({
              total: list.length,
              teachers: list.filter((u: any) => u.role === 'guru').length,
              students: list.filter((u: any) => u.role === 'siswa').length
            });
          }
        }).catch(() => {});
      });
    }
  }, [role, userStats.total]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Dark Navy Sidebar (#0F172E) */}
      <aside
        className={`fixed lg:sticky top-0 z-40 w-64 h-screen bg-[#0F172E] text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="absolute inset-y-0 right-0 w-px bg-white/5 pointer-events-none" />
        <div>
          {/* Sidebar Brand Header */}
          <div className="p-6 flex items-center justify-between">
            <Link href={`/${role}/dashboard`} className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg leading-tight tracking-tight">EduSchool</h1>
                <p className="text-[11px] text-slate-400 font-medium">LMS Platform</p>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <div className="px-4 py-2">
            <p               className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-3">Main Menu</p>
            <nav className="space-y-1.5">
              {config.items.map((item) => {
                const isSubCourse = item.path.includes('courses') && (pathname.includes('/materi') || pathname.includes('/tugas') || pathname.includes('/absensi'));
                const isActive = pathname === item.path || isSubCourse || (item.path !== '/admin/dashboard' && item.path !== '/guru/dashboard' && item.path !== '/siswa/dashboard' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#2563EB] text-white font-semibold shadow-lg shadow-blue-600/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Area (Widget & Sign Out) */}
        <div className="p-4 space-y-4">
          {config.showWidget && (
            <div className="bg-[#0A0E1A] border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Total Users</span>
                <span className="font-bold text-white font-mono bg-slate-800 px-2.5 py-0.5 rounded-md">{userStats.total}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Teachers</span>
                <span className="font-bold text-blue-400 font-mono bg-slate-800 px-2.5 py-0.5 rounded-md">{userStats.teachers}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Students</span>
                <span className="font-bold text-emerald-400 font-mono bg-slate-800 px-2.5 py-0.5 rounded-md">{userStats.students}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Clean Header Bar (Bell icon button removed) */}
        <header className="bg-white border-b border-slate-100 px-6 sm:px-8 py-5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>

          {/* Top Right User Profile Info */}
          <div className="flex items-center gap-3">
            {role !== 'admin' && (
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="p-2 text-[#10B981] hover:bg-[#ECFDF5] rounded-xl relative cursor-pointer"
                  title="Notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] text-white text-[10px] flex items-center justify-center border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Notifikasi</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-10 h-10 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                            <Bell className="w-5 h-5" />
                          </div>
                          <p className="text-xs text-slate-500">Tidak ada notifikasi baru</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.slice(0, 10).map((notif: any) => (
                            <div 
                              key={notif.id} 
                              className={`p-3 hover:bg-slate-50 transition cursor-pointer ${!notif.read_at ? 'bg-blue-50/30' : ''}`}
                              onClick={() => handleMarkAsRead(notif.id)}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                  <Bell className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-800 leading-relaxed">{notif.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {new Date(notif.created_at || notif.time).toLocaleString('id-ID', { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      day: 'numeric',
                                      month: 'short'
                                    })}
                                  </p>
                                </div>
                                {!notif.read_at && (
                                  <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-md uppercase font-mono hover:ring-2 hover:ring-blue-500 transition"
              >
                {userInitials}
              </button>
              
              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                        {userInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{userDisplayName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{userDisplaySub}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setShowProfileMenu(false); router.push(`/${role}/profile`); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profil Saya</span>
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); router.push('/login'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
