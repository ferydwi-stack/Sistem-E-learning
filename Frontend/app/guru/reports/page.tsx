'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Download, FileSpreadsheet, FileText, CheckCircle2, Search, Filter, Edit3, X, Save, Calculator, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function GuruReportsPage() {
  const { user: currentUser } = useAuth();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [inputUts, setInputUts] = useState('');
  const [inputUas, setInputUas] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [reportsData, setReportsData] = useState<any[]>([]);

  // Load courses bound strictly to the logged-in teacher
  useEffect(() => {
    const loadTeacherCourses = async () => {
      setIsLoading(true);
      try {
        const { api } = await import('@/lib/api');
        const coursesData = await api.getCourses().catch(() => []);
        if (Array.isArray(coursesData) && currentUser) {
          const loggedName = currentUser.name || '';
          const loggedId = currentUser.id;

          // Strictly filter courses for this teacher
          const teacherCourses = coursesData.filter((c: any) => {
            if (c.teacher_id && Number(c.teacher_id) === Number(loggedId)) return true;
            if (c.teacher && typeof c.teacher === 'object' && Number(c.teacher.id) === Number(loggedId)) return true;
            if (c.teacher && typeof c.teacher === 'string' && c.teacher.toLowerCase().includes(loggedName.toLowerCase())) return true;
            return false;
          });

          setCourses(teacherCourses);
          if (teacherCourses.length > 0) {
            setSelectedClass(teacherCourses[0].id.toString());
          } else {
            setSelectedClass('');
            setReportsData([]);
          }
        } else {
          setCourses([]);
          setSelectedClass('');
          setReportsData([]);
        }
      } catch (e) {
        console.error('Failed to load courses for reports:', e);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      loadTeacherCourses();
    }
  }, [currentUser]);

  useEffect(() => {
    const loadClassStudents = async () => {
      if (!selectedClass) {
        setReportsData([]);
        return;
      }

      try {
        const { api } = await import('@/lib/api');
        const reportDetail = await api.getCourseReport(Number(selectedClass)).catch(() => null);
        const enrolled = reportDetail?.students || [];

        if (Array.isArray(enrolled) && enrolled.length > 0) {
          const attendances = Array.isArray(reportDetail?.attendances) ? reportDetail.attendances : [];
          const assignments = Array.isArray(reportDetail?.assignments) ? reportDetail.assignments : [];

          const mapped = enrolled.map((s: any, idx: number) => {
            const nis = s.nisn_or_nip || `USR-00${s.id || idx + 1}`;

            // Calculate attendance percentage for this student in this course
            const studentAttendances = attendances.filter((a: any) => Number(a.student_id) === Number(s.id));
            const presentCount = studentAttendances.filter((a: any) => a.status === 'Hadir' || a.status === 'hadir').length;
            const totalSessions = studentAttendances.length;
            const absensiPercent = totalSessions > 0 
              ? `${Math.round((presentCount / totalSessions) * 100)}%` 
              : '-';

            const scores = { tugas: [] as number[], uts: [] as number[], uas: [] as number[], remediUts: [] as number[], remediUas: [] as number[] };
            assignments.forEach((asg: any) => {
              const category = String(asg.instruction || asg.category || '').replace(/^Modul\/Kategori:\s*/i, '').trim().toLowerCase();
              const subs = Array.isArray(asg.submissions) ? asg.submissions : [];
              const userSub = subs.find((sub: any) => Number(sub.student_id) === Number(s.id));
              if (!userSub || userSub.score === null || userSub.score === undefined) return;
              const score = Number(userSub.score);
              if (category === 'uts') scores.uts.push(score);
              else if (category === 'uas') scores.uas.push(score);
              else if (category === 'remedi uts') scores.remediUts.push(score);
              else if (category === 'remedi uas') scores.remediUas.push(score);
              else scores.tugas.push(score);
            });

            const highest = (values: number[]) => values.length ? Math.max(...values) : null;
            const tugasScore = scores.tugas.length ? Math.round(scores.tugas.reduce((sum, v) => sum + v, 0) / scores.tugas.length) : null;
            const storedUts = highest(scores.uts) ?? highest(scores.remediUts) ?? (s.pivot?.uts_score !== undefined && s.pivot?.uts_score !== null ? Number(s.pivot.uts_score) : null);
            const storedUas = highest(scores.uas) ?? highest(scores.remediUas) ?? (s.pivot?.uas_score !== undefined && s.pivot?.uas_score !== null ? Number(s.pivot.uas_score) : null);

            return {
              no: (idx + 1).toString().padStart(2, '0'),
              id: s.id,
              name: s.name,
              nis: nis,
              tugasScore: tugasScore,
              utsScore: storedUts,
              uasScore: storedUas,
              absensiPercent: absensiPercent,
              hasAnyScore: tugasScore !== null || storedUts !== null || storedUas !== null
            };
          });
          setReportsData(mapped);
        } else {
          setReportsData([]);
        }
      } catch (e) {
        console.error('Failed to load students for class:', e);
        setReportsData([]);
      }
    };

    loadClassStudents();
  }, [selectedClass]);

  const calculateFinal = (tugas: number, uts: number, uas: number) => {
    return parseFloat((tugas * 0.4 + uts * 0.3 + uas * 0.3).toFixed(1));
  };

  // Real Excel (.csv) Download
  const handleExportExcel = () => {
    if (!reportsData || reportsData.length === 0) return;
    const activeCourseObj = courses.find((c: any) => c.id.toString() === selectedClass);
    const activeCourseName = activeCourseObj ? activeCourseObj.title : 'Kelas';

    let csvContent = '\uFEFF';
    csvContent += `LAPORAN REKAPITULASI NILAI - ${activeCourseName.toUpperCase()}\n`;
    csvContent += `Guru Pengajar: ${currentUser?.name || 'Teacher'}\n`;
    csvContent += `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    csvContent += `No;NIS;Nama Siswa;Rata-Rata Tugas (40%);Nilai UTS (30%);Nilai UAS (30%);Kehadiran;Nilai Akhir;Status Ketuntasan\n`;

    reportsData.forEach((st, idx) => {
                  const final = st.hasAnyScore && st.tugasScore !== null && st.utsScore !== null && st.uasScore !== null ? calculateFinal(st.tugasScore, st.utsScore, st.uasScore) : null;
                  const status = final === null ? 'Belum Ada Data' : (final >= 75 ? 'Tuntas' : 'Remedial');
                  csvContent += `${idx + 1};${st.nis};"${st.name}";${st.tugasScore ?? '-'};${st.utsScore ?? '-'};${st.uasScore ?? '-'};${st.absensiPercent};${final ?? '-'};${status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekapitulasi_Nilai_${activeCourseName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(`File Excel (${activeCourseName}) berhasil diunduh ke perangkat Anda!`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Real Printable PDF Export
  const handleExportPdf = () => {
    const activeCourseObj = courses.find((c: any) => c.id.toString() === selectedClass);
    const activeCourseName = activeCourseObj ? activeCourseObj.title : 'Kelas';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlStr = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Rekapitulasi Nilai - ${activeCourseName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .header p { margin: 4px 0 0; font-size: 13px; color: #64748b; font-weight: 600; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; background: #f8fafc; padding: 12px 16px; rounded-radius: 8px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; font-size: 11px; }
            .badge-tuntas { color: #15803d; font-weight: bold; }
            .badge-remedial { color: #b91c1c; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
            .signature { text-align: center; width: 220px; }
            .signature-space { height: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EDUSCHOOL LMS PLATFORM</h1>
            <p>LAPORAN REKAPITULASI NILAI DAN EVALUASI PEMBELAJARAN</p>
          </div>
          <div class="meta">
            <div>
              <p><strong>Mata Pelajaran / Kelas:</strong> ${activeCourseName}</p>
              <p><strong>Guru Pengajar:</strong> ${currentUser?.name || 'Teacher'}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>KKM Ketuntasan:</strong> 75</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Rata Tugas (40%)</th>
                <th>UTS (30%)</th>
                <th>UAS (30%)</th>
                <th>Kehadiran</th>
                <th>Nilai Akhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportsData.map((st, idx) => {
                const final = st.hasAnyScore && st.tugasScore !== null && st.utsScore !== null && st.uasScore !== null ? calculateFinal(st.tugasScore, st.utsScore, st.uasScore) : null;
                const isPassed = final !== null && final >= 75;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${st.nis}</td>
                    <td><strong>${st.name}</strong></td>
                    <td>${st.tugasScore ?? '-'}</td>
                    <td>${st.utsScore ?? '-'}</td>
                    <td>${st.uasScore ?? '-'}</td>
                    <td>${st.absensiPercent}</td>
                    <td><strong>${final ?? '-'}</strong></td>
                    <td class="${final === null ? '' : (isPassed ? 'badge-tuntas' : 'badge-remedial')}">${final === null ? 'Belum Ada Data' : (isPassed ? 'Tuntas' : 'Remedial')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div></div>
            <div class="signature">
              <p>Mengetahui,</p>
              <p>Guru Pengajar</p>
              <div class="signature-space"></div>
              <p><strong><u>${currentUser?.name || 'Teacher'}</u></strong></p>
              <p style="font-size:11px; color:#64748b;">NIP. -</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlStr);
    printWindow.document.close();
    setExportNotice(`File PDF (${activeCourseName}) siap diunduh atau dicetak!`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleSaveScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const newUts = parseInt(inputUts) || 0;
    const newUas = parseInt(inputUas) || 0;

    try {
      const { api } = await import('@/lib/api');
      await api.updateStudentGrade(Number(selectedClass), editingStudent.id, {
        uts_score: newUts,
        uas_score: newUas
      });

      const updatedData = reportsData.map(st =>
        st.id === editingStudent.id
          ? { ...st, utsScore: newUts, uasScore: newUas }
          : st
      );

      setReportsData(updatedData);
      setEditingStudent(null);
      setExportNotice(`Nilai UTS & UAS untuk ${editingStudent.name} berhasil disimpan!`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan nilai: ' + (err.message || 'Error'));
    }
  };

  return (
    <DashboardLayout
      role="guru"
      title="Reports / Rekapitulasi Nilai"
      subtitle="Rekapitulasi nilai tugas, UTS, UAS, dan absensi per kelas dengan kalkulasi otomatis"
    >
      {/* Top Export Notice Toast */}
      {exportNotice && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{exportNotice}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-mono">File Downloaded</span>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Header & Export Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Laporan Rekapitulasi Pembelajaran</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Rumus Nilai Akhir: (40% Rata Tugas + 30% UTS + 30% UAS) • KKM Ketuntasan: 75
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl text-xs flex items-center gap-2 transition border border-emerald-200/80 cursor-pointer shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs flex items-center gap-2 transition border border-rose-200/80 cursor-pointer shadow-xs active:scale-95"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 mb-6">
          <label className="text-xs font-bold text-slate-600">Pilih Kelas:</label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 min-w-[220px] appearance-none pr-10"
            >
              {courses.length > 0 ? (
                courses.map((c: any) => (
                  <option className="bg-white text-slate-900" key={c.id} value={c.id.toString()}>
                    {c.title || c.name || `Kelas ID ${c.id}`}
                  </option>
                ))
              ) : (
                <option className="bg-white text-slate-900" value="">Belum ada kelas</option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto">
          {reportsData.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="py-4 px-4 w-12">No</th>
                  <th className="py-4 px-4">Nama Siswa</th>
                  <th className="py-4 px-4">Rata Tugas (40%)</th>
                  <th className="py-4 px-4">Nilai UTS (30%)</th>
                  <th className="py-4 px-4">Nilai UAS (30%)</th>
                  <th className="py-4 px-4">Kehadiran</th>
                  <th className="py-4 px-4">Nilai Akhir</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportsData.map((row) => {
                  const hasAnyScore = row.hasAnyScore;
                  const final = hasAnyScore && row.tugasScore !== null && row.utsScore !== null && row.uasScore !== null
                    ? calculateFinal(row.tugasScore, row.utsScore, row.uasScore)
                    : null;
                  const isPassed = final !== null && final >= 75;
                  const displayFinal = final !== null ? final : '-';
                  const displayStatus = final === null ? 'Belum Ada Data' : (isPassed ? 'Tuntas' : 'Remedial');

                  return (
                    <tr key={row.no} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-4 text-slate-400 font-semibold">{row.no}</td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{row.nis}</p>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">{row.tugasScore ?? '-'}</td>
                      <td className="py-4 px-4 font-bold text-blue-600 font-mono">{row.utsScore ?? '-'}</td>
                      <td className="py-4 px-4 font-bold text-purple-600 font-mono">{row.uasScore ?? '-'}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                          {row.absensiPercent}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-slate-900 font-mono text-sm">{displayFinal}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full font-bold text-[11px] ${
                          final === null ? 'bg-slate-100/70 text-slate-700' : (isPassed ? 'bg-emerald-100/70 text-emerald-700' : 'bg-rose-100/70 text-rose-700')
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingStudent(row);
                            setInputUts(row.utsScore.toString());
                            setInputUas(row.uasScore.toString());
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold rounded-xl text-[11px] transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Ujian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">
                {courses.length === 0 ? 'Belum Ada Kelas Yang Dibuat' : 'Belum Ada Siswa Terdaftar Di Kelas Ini'}
              </p>
              <p className="text-slate-400 max-w-sm mx-auto">
                {courses.length === 0
                  ? 'Anda belum memiliki kelas. Buat kelas baru terlebih dahulu untuk merekap rekapitulasi nilai.'
                  : 'Belum ada siswa yang mendaftar atau masuk ke dalam kelas ini.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit Nilai UTS & UAS */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditingStudent(null)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Input Nilai Ujian</h3>
                <p className="text-xs text-slate-400">{editingStudent.name} • {editingStudent.nis}</p>
              </div>
            </div>

            <form onSubmit={handleSaveScores} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nilai UTS (30%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={inputUts}
                  onChange={(e) => setInputUts(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nilai UAS (30%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={inputUas}
                  onChange={(e) => setInputUas(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Nilai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
