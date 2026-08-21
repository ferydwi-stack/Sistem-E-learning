'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { GraduationCap, Users, BookOpen, FileCheck2, Search, Plus, LogOut, CheckCircle2, AlertCircle, Key, X } from 'lucide-react';
import { useLms } from '@/context/LmsContext';

export default function SiswaCoursesPage() {
  const { enrolledCourses, availableCourses, myCourseIds, refreshCourses, joinCourseByCode, joinCourseById, leaveCourseById } = useLms();
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'my' | 'all'>('my');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inputJoinCode, setInputJoinCode] = useState('');

  React.useEffect(() => {
    refreshCourses();
  }, []);

  const myCourses = enrolledCourses.map(c => ({ ...c, isJoined: true }));

  const allAvailableCourses = availableCourses.map(c => ({
    ...c,
    isJoined: myCourseIds.includes(c.id)
  }));

  const handleJoinCourse = async (courseId: string) => {
    const result = await joinCourseById(courseId);
    setNotice({
      type: result.success ? 'success' : 'error',
      message: result.message
    });

    if (result.success) {
      setTabFilter('my');
    }

    setTimeout(() => setNotice(null), 3500);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputJoinCode.trim()) return;

    const res = await joinCourseByCode(inputJoinCode.replace(/-JOIN$/i, ''));
    setNotice({
      type: res.success ? 'success' : 'error',
      message: res.message
    });
    if (res.success) {
      setIsJoinModalOpen(false);
      setInputJoinCode('');
      setTabFilter('my');
    }
    setTimeout(() => setNotice(null), 4000);
  };

  const handleLeaveCourse = (courseId: string, title: string) => {
    leaveCourseById(courseId);
    setNotice({
      type: 'success',
      message: `Anda telah keluar dari kelas "${title}".`
    });
    setTimeout(() => setNotice(null), 3000);
  };

  const displayedCourses = (tabFilter === 'my' ? myCourses : allAvailableCourses).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.toLowerCase().includes(search.toLowerCase()) ||
    c.joinCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      role="siswa"
      title="Courses / Kelas Saya"
      subtitle="Daftar mata pelajaran yang diikuti dan fitur bergabung kelas via Kode Akses"
    >
      {/* Top Notice Toast */}
      {notice && (
        <div
          className={`mb-6 p-4 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-xs animate-in fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Top Filter & Search Bar */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kelas, kode, atau pengajar..."
            className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 pl-10"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Tab Pills & Join Code Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setTabFilter('my')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                tabFilter === 'my' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Kelas Saya ({myCourses.length})
            </button>
            <button
              onClick={() => setTabFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                tabFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Semua Kelas Sistem ({allAvailableCourses.length})
            </button>
          </div>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-5 py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            <span>Gabung via Kode Akses</span>
          </button>
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayedCourses.map((course) => (
          <div
            key={course.id}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs hover:shadow-md transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded-full font-mono text-xs border border-blue-100/60">
                  {course.code}
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>

              {course.isJoined ? (
                <Link
                  href={`/siswa/materi?course_id=${course.id}&title=${encodeURIComponent(course.title)}&teacher=${encodeURIComponent(course.teacher)}&code=${encodeURIComponent(course.code)}`}
                  className="block group-hover:text-[#2563EB] transition"
                >
                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">{course.title}</h3>
                </Link>
              ) : (
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">{course.title}</h3>
              )}
              
              <p className="text-xs text-slate-400 font-medium mb-6">
                Pengajar: <strong className="text-slate-700">{course.teacher}</strong>
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>{course.studentsCount} Siswa</span>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span>{course.materi} Materi</span>
                  <span>•</span>
                  <span>{course.tugas} Tugas</span>
                </div>
              </div>

              {course.isJoined ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/siswa/materi?course_id=${course.id}&title=${encodeURIComponent(course.title)}&teacher=${encodeURIComponent(course.teacher)}&code=${encodeURIComponent(course.code)}`}
                    className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs rounded-xl text-center transition"
                  >
                    Buka Kelas
                  </Link>

                  <button
                    onClick={() => handleLeaveCourse(course.id, course.title)}
                    className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition"
                    title="Keluar dari Kelas Ini"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleJoinCourse(course.id)}
                  className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Gabung Kelas Ini</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Gabung via Kode Akses */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Gabung Kelas via Kode Akses</h3>
                  <p className="text-xs text-slate-400 font-medium">Masukkan Kode Akses yang diberikan Guru</p>
                </div>
              </div>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Kode Akses Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MTK-X-89A atau BIO-X-62X"
                  value={inputJoinCode}
                  onChange={(e) => setInputJoinCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono tracking-wider uppercase"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800 border border-blue-200">
                💡 Minta Kode Akses unik kepada Guru pengampu kelas Anda jika belum memilikinya.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition"
                >
                  Proses Masuk Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
