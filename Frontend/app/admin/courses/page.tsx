'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Search, X, Eye, Copy, CheckCircle2, BookOpen, FileText } from 'lucide-react';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { api } from '@/lib/api';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [copyToast, setCopyToast] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const handleCopyJoinCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopyToast(`Kode Akses (${code}) berhasil disalin!`);
    setTimeout(() => setCopyToast(''), 3000);
  };

  // Load Courses and Real Students from MySQL Database
  const loadDataFromApi = useCallback(async () => {
    try {
      const [coursesData, studentsData] = await Promise.all([
        api.getCourses().catch(() => []),
        api.getUsers('siswa').catch(() => [])
      ]);

      const formattedStudents = Array.isArray(studentsData) ? studentsData.map((s: any) => ({
        id: s.nisn_or_nip || `USR-00${s.id}`,
        name: s.name,
        email: s.email,
        status: 'Aktif • Hadir'
      })) : [];

      setStudents(formattedStudents);

      if (Array.isArray(coursesData) && coursesData.length > 0) {
        const formattedCourses = coursesData.map((c: any) => {
          const studentsList = Array.isArray(c.students) ? c.students.map((s: any) => ({
            id: s.nisn_or_nip || `USR-00${s.id}`,
            name: s.name,
            email: s.email,
            status: s.pivot?.status === 'active' ? 'Aktif • Terdaftar' : 'Nonaktif'
          })) : [];

          return {
            id: c.id,
            code: c.code || 'MTK-X',
            joinCode: c.code ? `${c.code}-JOIN` : 'MTK-X-89A',
            title: c.title,
            teacher: c.teacher ? (typeof c.teacher === 'object' ? c.teacher.name : c.teacher) : 'Teacher',
            studentsCount: c.students_count || studentsList.length,
            materi: c.materials_count || 0,
            tugas: c.assignments_count || 0,
            studentsList
          };
        });
        setCourses(formattedCourses);
        return formattedCourses;
      } else {
        setCourses([]);
        return [];
      }
    } catch (e) {
      console.error('Failed to load courses from API:', e);
      return [];
    }
  }, []);

  const { loading: isLoading, refresh: refreshCourses } = useRealtimeData(
    loadDataFromApi,
    4000,
    [],
    'lms_courses_updated'
  );


  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.toLowerCase().includes(search.toLowerCase()) ||
    c.joinCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      role="admin"
      title="Monitoring Kelas"
      subtitle="Pemantauan daftar kelas aktif buatan Guru dan status pendaftaran siswa mandiri"
    >
      {/* Toast Notification */}
      {copyToast && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="bg-white border border-[#D6DEE7] rounded-[22px] p-5 mb-6 shadow-none flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kelas, kode, atau pengajar..."
            className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#D6DEE7] rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] pl-10"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#EEF2FF] border border-[#2563EB]/20 rounded-xl shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></div>
            <span className="text-xs font-bold text-slate-700">Total Kelas Aktif:</span>
            <span className="text-xs font-extrabold text-[#2563EB] bg-white px-2.5 py-0.5 rounded-lg border border-[#2563EB]/20 shadow-2xs font-mono">
              {courses.length}
            </span>
          </div>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="bg-[#EFF4F8] border border-[#D6DEE7] rounded-[22px] p-6 shadow-none animate-pulse space-y-4">
              <div className="h-5 w-20 bg-[#D3DFE9] rounded-full"></div>
              <div className="h-6 w-3/4 bg-[#D3DFE9] rounded-md"></div>
              <div className="h-4 w-1/2 bg-[#DDE7F0] rounded-md"></div>
              <div className="h-8 w-full bg-[#DDE7F0] rounded-xl pt-4"></div>
            </div>
          ))
        ) : filteredCourses.map((course) => (
          <div
            key={course.id}
            className="bg-[#EFF4F8] border border-[#D6DEE7] rounded-[22px] p-6 shadow-none flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-[#EEF2FF] text-[#2563EB] font-bold rounded-md font-mono text-xs border border-[#2563EB]/20">
                  {course.code}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#0F172E] text-white flex items-center justify-center font-bold text-xs">
                  {course.code.split('')[0]}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">{course.title}</h3>
              <p className="text-xs text-slate-500 font-medium mb-3">
                Pengajar: <strong className="text-slate-800">{course.teacher}</strong>
              </p>
              
              <div className="mt-4 rounded-2xl bg-white border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Kode Akses Siswa<br />
                  <strong className="text-xs text-[#0F172E] font-mono normal-case">{course.joinCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyJoinCode(course.joinCode)}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </button>
              </div>
            </div>

            {/* Footer with clean 2-row layout to prevent overlapping */}
            <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-3">
              {/* Row 1: Content Info (Materi & Tugas) */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 bg-white/70 px-3.5 py-2 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{course.materi} Materi</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{course.tugas} Tugas</span>
                </div>
              </div>

              {/* Row 2: Siswa Terdaftar Action Button */}
              <button
                type="button"
                onClick={() => setSelectedCourse(course)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-[0.99] cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>{course.studentsList ? course.studentsList.length : course.studentsCount} Siswa Terdaftar</span>
                <Eye className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Detail Anggota Kelas */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-50 text-[#2563EB] font-mono text-[11px] font-bold rounded-md">
                  {selectedCourse.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedCourse.title}</h3>
                <p className="text-xs text-slate-400 font-medium">Pengajar: {selectedCourse.teacher}</p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Siswa Terdaftar ({selectedCourse.studentsList ? selectedCourse.studentsList.length : 0})
              </h4>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedCourse.studentsList && selectedCourse.studentsList.length > 0 ? (
                selectedCourse.studentsList.map((student: any, i: number) => (
                  <div
                    key={i}
                    className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {student.name ? student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{student.id} • {student.email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg">
                      {student.status || 'Aktif'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">Belum ada siswa terdaftar di kelas ini.</p>
              )}
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
