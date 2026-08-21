'use client';

import React, { useState, useEffect, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, ArrowLeft, BookOpen, FileCheck2, CalendarCheck, FileEdit, X, Download, Award, CheckCircle2, Clock, Filter, ExternalLink, FileText, UploadCloud, Eye, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { api, notifyDataChanged } from '@/lib/api';

function GuruTugasContent() {
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const courseTitle = searchParams.get('title') || 'Kelas Pembelajaran';
  const courseTeacher = searchParams.get('teacher') || (currentUser?.name || 'Guru');
  const courseCode = searchParams.get('code') || 'MAPEL';
  const courseId = searchParams.get('course_id') || '1';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [previewTask, setPreviewTask] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [inputGrade, setInputGrade] = useState('');
  const [inputFeedback, setInputFeedback] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [modalFiles, setModalFiles] = useState<File[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [tugasList, setTugasList] = useState<any[]>([]);
  const [realStudentsCount, setRealStudentsCount] = useState<number>(8);
  const [isLoading, setIsLoading] = useState(true);

  const [newTask, setNewTask] = useState({
    title: '',
    category: 'Tugas Harian',
    deadline: '',
    instruction: '',
    attachment: ''
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) setModalFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) setModalFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
  };

  const removeModalFile = (index: number) => setModalFiles(prev => prev.filter((_, i) => i !== index));

  const loadDataFromApi = React.useCallback(async () => {
    const [assignmentsData, courseDetail] = await Promise.all([
      api.getAssignments(courseId).catch(() => []),
      api.getCourseDetail(Number(courseId)).catch(() => null)
    ]);

    const enrolledStudents = courseDetail?.students || [];
    const countSiswa = Array.isArray(enrolledStudents) ? enrolledStudents.length : 0;
    setRealStudentsCount(countSiswa);

    if (Array.isArray(assignmentsData)) {
      const formatted = assignmentsData.map((a: any) => {
        const actualCount = a.submissions_count || 0;
        const dueDate = a.due_date ? new Date(a.due_date) : null;
        const deadlineFormatted = dueDate
          ? dueDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';
        return {
          id: a.id,
          title: a.title,
          category: 'Tugas Harian',
          course: courseTitle,
          deadline: deadlineFormatted,
          deadlineRaw: a.due_date || '',
          submittedCount: actualCount,
          totalStudents: countSiswa,
          status: actualCount >= countSiswa && countSiswa > 0 ? 'Selesai' : 'Aktif',
          attachment: a.attachment_name || '',
          attachmentPath: a.attachment_path || '',
          instruction: a.instruction || '',
          submissions: []
        };
      });
      setTugasList(formatted);
    } else {
      setTugasList([]);
    }
  }, [courseId, courseTitle]);

  const { loading: tasksLoading } = useRealtimeData(loadDataFromApi, 60000, [courseId, courseTitle]);

  useEffect(() => {
    setIsLoading(tasksLoading);
  }, [tasksLoading]);

  const handleOpenTaskModal = async (tugas: any) => {
    setSelectedTask({ ...tugas, submissions: [], isLoadingSubs: true });
    try {
      const apiSubs = await api.getAssignmentSubmissions(tugas.id).catch(() => []);
      const taskSubmissions = Array.isArray(apiSubs) ? apiSubs.map((s: any, idx: number) => ({
        id: s.id || `SUB-${tugas.id}-${idx}`,
        name: s.student?.name || 'Siswa',
        nis: s.student?.nisn_or_nip || `USR-${s.student_id}`,
        time: s.submitted_at?.substring(0, 16).replace('T', ' ') || 'Hari ini',
        fileName: s.original_filename || 'file_tugas',
        filePath: s.file_path || '',
        grade: s.score ?? '',
        feedback: s.teacher_feedback || ''
      })) : [];
      setSelectedTask({ ...tugas, submissions: taskSubmissions, isLoadingSubs: false });
    } catch (e) {
      console.error(e);
      setSelectedTask({ ...tugas, submissions: [], isLoadingSubs: false });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('course_id', courseId);
      uploadFormData.append('title', newTask.title);
      let instructionText = `Modul/Kategori: ${newTask.category}`;
      if (newTask.instruction?.trim()) {
        instructionText += `\n\n${newTask.instruction.trim()}`;
      }
      uploadFormData.append('instruction', instructionText);
      if (newTask.deadline) {
        // Konversi ke format string yang persis sama tapi hindari shift timezone
        const dateObj = new Date(newTask.deadline);
        if (!isNaN(dateObj.getTime())) {
          // Ambil local parts
          const y = dateObj.getFullYear();
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const d = String(dateObj.getDate()).padStart(2, '0');
          const h = String(dateObj.getHours()).padStart(2, '0');
          const min = String(dateObj.getMinutes()).padStart(2, '0');
          uploadFormData.append('due_date', `${y}-${m}-${d} ${h}:${min}:00`);
        } else {
          uploadFormData.append('due_date', newTask.deadline.includes('T') ? `${newTask.deadline.replace('T', ' ')}:00` : newTask.deadline);
        }
      }
      if (modalFiles.length > 0) {
        uploadFormData.append('file', modalFiles[0]);
      }

      await api.createAssignment(uploadFormData);
      notifyDataChanged('lms_assignments_updated');
      
      setNewTask({ title: '', category: 'Tugas Harian', deadline: '', instruction: '', attachment: '' });
      setModalFiles([]);
      setIsCreateModalOpen(false);
      await new Promise(r => setTimeout(r, 500));
      await loadDataFromApi();
    } catch (err: any) {
      console.error('Create assignment error:', err);
      alert(err.message || 'Gagal membuat tugas baru');
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !selectedSubmission) return;

    try {
      if (selectedSubmission.id && !String(selectedSubmission.id).startsWith('SUB-')) {
        await api.gradeSubmission(selectedSubmission.id, parseInt(inputGrade || '0'), inputFeedback);
        notifyDataChanged('lms_submissions_updated');
      }
    } catch (err) {
      console.warn('Grade submission notice:', err);
    }

    const updatedSubmissions = selectedTask.submissions.map((s: any) => {
      if (s.id === selectedSubmission.id) {
        return { ...s, grade: inputGrade, feedback: inputFeedback || 'Nilai berhasil disimpan.' };
      }
      return s;
    });

    setSelectedTask({ ...selectedTask, submissions: updatedSubmissions });
    setSelectedSubmission(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteAssignment(itemToDelete.id);
      notifyDataChanged('lms_assignments_updated');
      await loadDataFromApi();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Delete assignment error:', err);
      alert(err.message || 'Gagal menghapus tugas');
    }
  };

  const queryParamsStr = `?course_id=${courseId}&title=${encodeURIComponent(courseTitle)}&teacher=${encodeURIComponent(courseTeacher)}&code=${encodeURIComponent(courseCode)}`;

  return (
    <DashboardLayout
      role="guru"
      title="Kelola Tugas Kelas"
      subtitle="Buat tugas, kelola file penyerahan siswa, dan berikan penilaian langsung"
    >
      {/* Course Sub-Header Banner */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/guru/courses"
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{courseTitle}</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Pengajar: <strong className="text-slate-700">{courseTeacher}</strong> | Kode: {courseCode}
            </p>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-sm font-bold pt-2">
          <Link
            href={`/guru/materi${queryParamsStr}`}
            className="flex items-center gap-2 pb-3 text-slate-500 hover:text-slate-900 transition"
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>Materi Pembelajaran</span>
          </Link>
          <Link
            href={`/guru/tugas${queryParamsStr}`}
            className="flex items-center gap-2 pb-3 text-[#2563EB] border-b-2 border-[#2563EB]"
          >
            <FileCheck2 className="w-4 h-4 text-[#2563EB]" />
            <span>Tugas Kelas</span>
          </Link>
          <Link
            href={`/guru/absensi${queryParamsStr}`}
            className="flex items-center gap-2 pb-3 text-slate-500 hover:text-slate-900 transition"
          >
            <CalendarCheck className="w-4 h-4 text-slate-400" />
            <span>Kehadiran / Absensi</span>
          </Link>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Daftar Tugas Aktif</h3>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Tugas Baru</span>
        </button>
      </div>

      {/* Task List Grid */}
      <div className="space-y-4">
        {isLoading ? (
          [1, 2].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs animate-pulse space-y-3">
              <div className="h-5 w-1/3 bg-slate-200 rounded-md"></div>
              <div className="h-4 w-1/4 bg-slate-100 rounded-md"></div>
            </div>
          ))
        ) : tugasList.length > 0 ? (
          tugasList.map((tugas) => (
            <div
              key={tugas.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 bg-blue-100/70 text-[#2563EB] font-bold rounded-full text-[10px] uppercase">
                      {tugas.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Tenggat: {tugas.deadline}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">{tugas.title}</h4>
                  {tugas.attachment && (
                    <p className="text-xs text-slate-400 font-mono mt-1">Lampiran: {String(tugas.attachment).split('/').pop()}</p>
                  )}
                  {!tugas.attachment && tugas.instruction && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{tugas.instruction.replace(/https?:\/\/\S+/g, '').trim()}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Pengumpulan</p>
                  <p className="text-xs font-bold text-slate-900 font-mono">{tugas.submittedCount} / {tugas.totalStudents} Siswa</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setItemToDelete(tugas);
                      setIsDeleteModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>Hapus</span>
                  </button>
                  <button
                    onClick={() => setPreviewTask(tugas)}
                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </button>
                  <button
                    onClick={() => handleOpenTaskModal(tugas)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Periksa & Beri Nilai</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-xs">
            <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileEdit className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Belum Ada Tugas Aktif</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Belum ada tugas yang dibuat untuk kelas ini. Klik tombol di bawah untuk membuat tugas pertama.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tugas Baru</span>
            </button>
          </div>
        )}
      </div>

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Hapus Tugas</h3>
              <button
                onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Tugas ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
              <p className="text-sm font-bold text-slate-900">{itemToDelete.title}</p>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }}
                className="px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-rose-500/25 transition cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Periksa & Beri Nilai */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Periksa Penyerahan Tugas Siswa</h3>
                <p className="text-xs text-slate-400 font-medium">{selectedTask.title}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-xs">
                  <span className="text-slate-400 font-medium">Total Terkumpul: </span>
                  <strong className="text-slate-900 font-mono font-bold">{selectedTask.submissions ? selectedTask.submissions.length : 0} Siswa</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSubmissionFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      submissionFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setSubmissionFilter('ungraded')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      submissionFilter === 'ungraded' ? 'bg-amber-100 text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    Belum Dinilai
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedTask.submissions && selectedTask.submissions.length > 0 ? (
                  selectedTask.submissions
                    .filter((s: any) => {
                      if (submissionFilter === 'graded') return s.grade !== '';
                      if (submissionFilter === 'ungraded') return s.grade === '';
                      return true;
                    })
                    .map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                            {sub.name ? sub.name.substring(0, 2).toUpperCase() : 'US'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{sub.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{sub.nis} • {sub.time}</p>
                            <div className="mt-1">
                              <a
                                href={sub.filePath?.startsWith('http') ? sub.filePath : (sub.filePath ? `http://127.0.0.1:8000/storage/${sub.filePath}` : '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-[#2563EB] hover:underline font-mono text-[11px] font-semibold rounded-lg transition"
                                title="Klik untuk membuka / mengunduh file atau link tugas siswa"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                                <span>{sub.file || 'File Tugas'}</span>
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {sub.grade ? (
                            <span className="px-3 py-1 bg-emerald-100/80 text-emerald-700 font-extrabold rounded-xl text-xs font-mono">
                              Nilai: {sub.grade}
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100/80 text-amber-700 font-bold rounded-xl text-[11px]">
                              Belum Dinilai
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setInputGrade(sub.grade || '');
                              setInputFeedback(sub.feedback || '');
                            }}
                            className="px-3 py-1.5 bg-[#2563EB] text-white hover:bg-blue-700 font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            Beri Nilai
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-center py-6 text-xs text-slate-400">Belum ada penyerahan tugas dari siswa.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Tugas */}
      {previewTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{previewTask.title}</h3>
                  <p className="text-xs text-slate-400 font-medium">Tenggat: {previewTask.deadline}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-6 space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deskripsi & Instruksi:</p>
                <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap break-words">
                  {previewTask.instruction || 'Tidak ada deskripsi.'}
                </p>
              </div>

              {previewTask.attachmentPath && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 max-w-[200px] truncate">{previewTask.attachment}</span>
                  </div>
                  <a
                    href={previewTask.attachmentPath.startsWith('http') ? previewTask.attachmentPath : `http://127.0.0.1:8000/storage/${previewTask.attachmentPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition"
                  >
                    Unduh File
                  </a>
                </div>
              )}
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewTask(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Input Nilai */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Beri Nilai: {selectedSubmission.name}</h3>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nilai (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  placeholder="e.g. 90"
                  value={inputGrade}
                  onChange={(e) => setInputGrade(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Catatan / Feedback Guru</label>
                <textarea
                  placeholder="e.g. Pengerjaan sangat rapi dan jawaban tepat 100%."
                  value={inputFeedback}
                  onChange={(e) => setInputFeedback(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 h-20"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md transition cursor-pointer"
                >
                  Simpan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form Buat Tugas Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Buat Tugas Baru</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Judul Tugas</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tugas 2 Pembelahan Sel"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Kategori</label>
                <div className="relative">
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 appearance-none pr-10"
                  >
                    <option className="bg-white text-slate-900" value="Tugas Harian">Tugas Harian</option>
                    <option className="bg-white text-slate-900" value="UTS">UTS</option>
                    <option className="bg-white text-slate-900" value="UAS">UAS</option>
                    <option className="bg-white text-slate-900" value="Remedi UTS">Remedi UTS</option>
                    <option className="bg-white text-slate-900" value="Remedi UAS">Remedi UAS</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tenggat Waktu</label>
                <input
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Deskripsi / Link Tugas (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Jawab semua soal di link berikut: https://drive.google.com/file/d/..."
                  value={newTask.instruction}
                  onChange={(e) => setNewTask({ ...newTask, instruction: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Gunakan field ini untuk share link tugas (Google Drive, MediaFire, dll) jika tidak upload file
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">File Lampiran (Opsional)</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition ${dragActive ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-slate-50/50'}`}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="modal-file-input"
                  />
                  <label htmlFor="modal-file-input" className="cursor-pointer block">
                    <div className="flex flex-col items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Seret file atau klik untuk pilih</p>
                    </div>
                  </label>
                </div>
                {modalFiles.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {modalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-100 rounded-lg text-xs">
                        <span className="truncate text-slate-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeModalFile(idx)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setModalFiles([]); }}
                  className="px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition cursor-pointer"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function GuruTugasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <GuruTugasContent />
    </Suspense>
  );
}
