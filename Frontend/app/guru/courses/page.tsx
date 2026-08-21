'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Plus, Users, BookOpen, X, Copy, CheckCircle2, Edit3, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { api } from '@/lib/api';

export default function GuruCoursesPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedStudentCourse, setSelectedStudentCourse] = useState<any>(null);
  const [copyToast, setCopyToast] = useState('');

  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    students: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: studentsData, loading: studentsLoading } = useRealtimeData(
    () => api.getUsers('siswa').catch(() => []),
    30000,
    []
  );

  const { data: coursesData, loading: coursesLoading, refresh: refreshCourses } = useRealtimeData(
    () => {
      if (!user) return Promise.resolve([]);
      return api.getCourses().catch(() => []);
    },
    4000,
    [user?.id],
    'lms_courses_updated'
  );

  useEffect(() => {
    if (coursesData && user) {
      const myCourses = Array.isArray(coursesData) ? coursesData.filter((c: any) => {
        if (c.teacher_id && Number(c.teacher_id) === Number(user.id)) return true;
        if (c.teacher && typeof c.teacher === 'object' && Number(c.teacher.id) === Number(user.id)) return true;
        if (c.teacher && typeof c.teacher === 'string' && c.teacher.toLowerCase().includes((user.name || '').toLowerCase())) return true;
        return false;
      }) : [];

        const formatted = myCourses.map((c: any) => {
        const enrolledStudents = Array.isArray(c.students) ? c.students : [];
        return {
          id: c.id,
          code: c.code || 'MAPEL',
          joinCode: c.code || 'MAPEL',
          title: c.title,
          teacher: c.teacher ? (typeof c.teacher === 'object' ? c.teacher.name : c.teacher) : user.name,
          studentsCount: c.students_count || enrolledStudents.length,
          materiCount: c.materials_count || 0,
          tugasCount: c.assignments_count || 0,
          studentsList: enrolledStudents.map((s: any) => ({
            id: s.nisn_or_nip || `USR-00${s.id}`,
            name: s.name,
            email: s.email,
            status: 'Aktif'
          }))
        };
      });

      setCourses(formatted);
      setIsLoading(false);
    }
  }, [coursesData, user]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name) return;

    setIsCreating(true);
    try {
      const { api } = await import('@/lib/api');
      const generatedCode = newCourse.code ? newCourse.code.toUpperCase() : `KLS-${Math.floor(100 + Math.random() * 900)}`;

      await api.createCourse({
        title: newCourse.name,
        code: generatedCode,
        description: 'Kelas pembelajaran interaktif'
      });

      setNewCourse({ name: '', code: '', students: '' });
      setIsCreateModalOpen(false);
      await refreshCourses();
    } catch (err: any) {
      console.error('Create course error:', err);
      alert(err.message || 'Gagal membuat kelas baru');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopyToast(`Kode Akses (${code}) berhasil disalin!`);
    setTimeout(() => setCopyToast(''), 3000);
  };

  const teacherName = mounted && user?.name ? user.name : 'Guru';

  return (
    <DashboardLayout
      role="guru"
      title="Courses / Kelola Kelas"
      subtitle="Buat kelas baru, kelola modul/tugas, dan bagikan Kode Akses unik kepada siswa"
    >
      {/* Toast Notification */}
      {copyToast && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Daftar Kelas Diampu Oleh {teacherName}</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Siswa dapat bergabung dengan mencari Kode Akses Kelas</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kelas Baru</span>
        </button>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs animate-pulse space-y-4">
              <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
              <div className="h-6 w-3/4 bg-slate-200 rounded-md"></div>
            </div>
          ))
        ) : courses.length > 0 ? (
          courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-blue-50 text-[#2563EB] font-bold rounded-full font-mono text-xs border border-blue-100/60">
                    {course.code}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">{course.title}</h3>
                <p className="text-xs text-slate-400 font-medium mb-4">
                  Pengajar: <strong className="text-slate-700">{course.teacher}</strong>
                </p>

                {/* Join Code Box */}
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-3.5 mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kode Akses Siswa</p>
                    <p className="text-xs font-bold text-slate-900 font-mono tracking-wide">{course.joinCode}</p>
                  </div>
                  <button
                    onClick={() => handleCopyJoinCode(course.joinCode)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <button
                  onClick={() => setSelectedStudentCourse(course)}
                  className="flex items-center gap-1 text-[#2563EB] font-bold hover:underline cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>{course.studentsCount} Siswa</span>
                </button>

                <Link
                  href={`/guru/materi?course_id=${course.id}&title=${encodeURIComponent(course.title)}&teacher=${encodeURIComponent(course.teacher)}&code=${encodeURIComponent(course.code)}`}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Masuk Kelas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Belum ada kelas yang dibuat oleh {teacherName}</p>
            <p className="text-xs text-slate-400">Klik tombol "Buat Kelas Baru" di atas untuk menambahkan kelas pembelajaran.</p>
          </div>
        )}
      </div>

      {/* Modal Detail Anggota Kelas */}
      {selectedStudentCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-50 text-[#2563EB] font-mono text-[11px] font-bold rounded-md">
                  {selectedStudentCourse.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedStudentCourse.title}</h3>
                <p className="text-xs text-slate-400 font-medium">Pengajar: {selectedStudentCourse.teacher}</p>
              </div>
              <button
                onClick={() => setSelectedStudentCourse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Siswa Terdaftar ({selectedStudentCourse.studentsList ? selectedStudentCourse.studentsList.length : 0})
              </h4>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedStudentCourse.studentsList && selectedStudentCourse.studentsList.length > 0 ? (
                selectedStudentCourse.studentsList.map((student: any, i: number) => (
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
                onClick={() => setSelectedStudentCourse(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Kelas Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Buat Kelas Pembelajaran Baru</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Kelas / Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biologi Sel & Genetik Kelas XII"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Kode Singkat Kelas</label>
                <input
                  type="text"
                  placeholder="e.g. BIO-XII"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isCreating ? 'Menyimpan...' : 'Simpan Kelas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
