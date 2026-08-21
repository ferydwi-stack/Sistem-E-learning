'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, BookOpen, GraduationCap, ArrowRight, ShieldCheck, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({
    totalUsers: 0,
    teachers: 0,
    students: 0,
    courses: 0
  });

  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setError(null);
    try {
      const [statsData, usersData, coursesData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getUsers().catch(() => []),
        api.getCourses().catch(() => [])
      ]);

      const usersList = Array.isArray(usersData) ? usersData : ((usersData as any)?.users || []);
      const coursesList = Array.isArray(coursesData) ? coursesData : ((coursesData as any)?.courses || []);

      if (statsData && statsData.total_users !== undefined) {
        setCounts({
          totalUsers: statsData.total_users || 0,
          teachers: statsData.total_teachers || 0,
          students: statsData.total_students || 0,
          courses: statsData.total_courses || (Array.isArray(coursesList) ? coursesList.length : 0)
        });
      } else if (Array.isArray(usersList) && usersList.length > 0) {
        const teacherCount = usersList.filter((u: any) => u.role === 'guru').length;
        const studentCount = usersList.filter((u: any) => u.role === 'siswa').length;

        setCounts({
          totalUsers: usersList.length,
          teachers: teacherCount,
          students: studentCount,
          courses: Array.isArray(coursesList) ? coursesList.length : 0
        });
      }

      if (Array.isArray(usersList) && usersList.length > 0) {
        const latest = usersList.slice(0, 4).map((u: any) => ({
          name: u.name,
          email: u.email,
          role: u.role === 'guru' ? 'Guru' : (u.role === 'siswa' ? 'Siswa' : 'Admin'),
          type: u.role === 'guru' ? 'Teacher' : (u.role === 'siswa' ? 'Student' : 'Admin'),
          date: 'Aktif'
        }));
        setRecentUsers(latest);
      }
      return { usersList, coursesList, statsData };
    } catch (e: any) {
      console.error('Failed to load dashboard data:', e);
      setError(e.message || 'Gagal memuat data dashboard. Silakan coba lagi.');
      throw e;
    }
  }, []);

  const { loading: isLoading, refresh: refreshDashboard } = useRealtimeData(
    loadDashboardData,
    4000,
    [],
    'lms_courses_updated'
  );

  const stats = [
    {
      title: 'Total Akun Pengguna',
      value: isLoading ? '...' : counts.totalUsers.toString(),
      badge: 'Aktif',
      badgeClass: 'bg-[#2563EB]/10 text-[#2563EB]',
      icon: <Users className="w-4 h-4 text-[#2563EB]" />,
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Guru Terdaftar',
      value: isLoading ? '...' : counts.teachers.toString(),
      badge: 'Pengajar',
      badgeClass: 'bg-purple-100 text-purple-700',
      icon: <UserCheck className="w-4 h-4 text-purple-600" />,
      iconBg: 'bg-purple-100'
    },
    {
      title: 'Siswa Terdaftar',
      value: isLoading ? '...' : counts.students.toString(),
      badge: 'Peserta Didik',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      icon: <GraduationCap className="w-4 h-4 text-emerald-600" />,
      iconBg: 'bg-emerald-100'
    },
    {
      title: 'Total Kelas Aktif',
      value: isLoading ? '...' : counts.courses.toString(),
      badge: 'Aktif',
      badgeClass: 'bg-amber-100 text-amber-700',
      icon: <BookOpen className="w-4 h-4 text-amber-600" />,
      iconBg: 'bg-amber-100'
    }
  ];

  return (
    <DashboardLayout
      role="admin"
      title="Dashboard Admin"
      subtitle="Overview sistem manajemen pembelajaran EduSchool"
    >
      {/* Error State */}
      {error && (
        <div className="mb-6 p-6 bg-[#FEF2F2] border border-[#FCA5A5] rounded-[22px] flex items-start gap-4 shadow-none">
          <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900 mb-1">Gagal Memuat Dashboard</h3>
            <p className="text-xs text-rose-700 mb-3">{error}</p>
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Memuat...' : 'Coba Lagi'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-[#2F6FE4] border border-[#2F6FE4] rounded-[22px] p-5 sm:p-7 mb-8 shadow-sm flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border-2 border-white/80 text-white flex items-center justify-center font-bold text-xl">
            AD
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Panel Administrator Utama</h2>
            <p className="text-xs text-blue-100 font-medium mt-0.5">Kelola pengguna (Guru & Siswa) dan pantau daftar kelas sistem.</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-[#059669] font-bold rounded-2xl text-xs border border-white/70">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span>Sistem Normal</span>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-[#EDF0F4] rounded-[22px] p-5 flex flex-col justify-between shadow-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${stat.iconBg}`}>
                {stat.icon}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${stat.badgeClass}`}>
                {stat.badge}
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#0F172E] tracking-tight">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Quick Links Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/users"
          className="bg-[#EFF4F8] border border-[#D6DEE7] rounded-[22px] p-6 shadow-none flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#0F172E] text-base">Management Akun Pengguna</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Kelola, tambah, edit, hapus, dan cari akun Guru & Siswa</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </Link>

        <Link
          href="/admin/courses"
          className="bg-[#EFF4F8] border border-[#D6DEE7] rounded-[22px] p-6 shadow-none flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#0F172E] text-base">Daftar Kelas Sistem</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Lihat kelas, guru pengampu, dan daftar siswa anggotanya</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </Link>
      </div>
    </DashboardLayout>
  );
}