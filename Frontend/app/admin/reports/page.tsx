'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Download, Calendar, CheckCircle2, UserCheck, Users, Printer, FileSpreadsheet, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '@/lib/api';

export default function AdminReportsPage() {
  const [range, setRange] = useState('minggu');
  const [downloadNotice, setDownloadNotice] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState({ studentPercent: 0, teacherPercent: 100, effectiveDays: 22 });

  useEffect(() => {
    const fetchReports = async () => {
  try {
    const coursesData = await api.getCourses().catch(() => []);
    const courses = Array.isArray(coursesData) ? coursesData : [];
    const reportResponses = await Promise.all(
      courses.map((c: any) => api.getCourseReport(c.id).catch(() => null))
    );

    let totalHadirAll = 0;
    let totalAttendanceAll = 0;

    const courseReports = reportResponses
      .map((res: any, idx: number) => {
        const fallbackCourse = courses[idx];
        const course = res?.course || fallbackCourse;
        if (!course) return null;

        const matchedCourse = courses.find((c: any) => Number(c.id) === Number(course.id)) || course;
        const teacherName = course.teacher?.name || matchedCourse?.teacher?.name || 'Guru Pengampu';

        const students = Array.isArray(res?.students) ? res.students : [];
        const attendances = Array.isArray(res?.attendances) ? res.attendances : [];
        const total = students.length || matchedCourse?.students_count || 0;
        const hadir = attendances.filter((a: any) => String(a.status).toLowerCase() === 'hadir').length;
        const izin = attendances.filter((a: any) => String(a.status).toLowerCase() === 'izin').length;
        const sakit = attendances.filter((a: any) => String(a.status).toLowerCase() === 'sakit').length;
        const alpa = attendances.filter((a: any) =>
          String(a.status).toLowerCase() === 'alpha' || String(a.status).toLowerCase() === 'alfa'
        ).length;
        const percent = attendances.length > 0 ? `${Math.round((hadir / attendances.length) * 100)}%` : '0%';

        totalHadirAll += hadir;
        totalAttendanceAll += attendances.length;

        return {
          class: course.title,
          teacher: teacherName,
          total,
          hadir,
          izin,
          sakit,
          alpa,
          percent,
        };
      })
      .filter(Boolean);

    const studentPercent = totalAttendanceAll > 0
      ? Math.round((totalHadirAll / totalAttendanceAll) * 100)
      : 0;

    const allAttendanceDates = new Set<string>();
    reportResponses.forEach((res: any) => {
      const atts = Array.isArray(res?.attendances) ? res.attendances : [];
      atts.forEach((a: any) => {
        if (a.date) allAttendanceDates.add(String(a.date).substring(0, 10));
      });
    });
    const effectiveDays = allAttendanceDates.size;

    setReportData(courseReports);
    setOverallStats({
      studentPercent,
      teacherPercent: courseReports.length > 0 ? 100 : 0,
      effectiveDays: effectiveDays
    });
  } catch (e) {
    console.error('Failed to fetch admin reports:', e);
  }
};

    fetchReports();
  }, [range]);

  const handleExport = (type: string) => {
    const rows = reportData.map((row) => ({
      'Grup / Kelas': row.class,
      'Wali Kelas / Penanggung Jawab': row.teacher,
      'Total': row.total,
      'Hadir': row.hadir,
      'Izin': row.izin,
      'Sakit': row.sakit,
      'Alpa': row.alpa,
      'Persentase': row.percent,
    }));

    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Presensi');
      XLSX.writeFile(wb, `laporan-presensi-admin-${range}.xlsx`);
      setDownloadNotice('Laporan Excel berhasil diunduh.');
    }

    if (type === 'pdf') {
      const content = document.getElementById('report-print-area');
      if (content) {
        const printWindow = window.open('', '_blank', 'width=1200,height=900');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Laporan Presensi Admin</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 24px; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                  th { background: #f3f4f6; text-align: left; }
                </style>
              </head>
              <body>
                ${content.innerHTML}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      }
      setDownloadNotice('Laporan PDF siap dicetak.');
    }

    setTimeout(() => setDownloadNotice(''), 3000);
  };

return (
  <>
    <style jsx global>{`
      @media print {
        @page { size: landscape; margin: 12mm; }
        body { background: white !important; }
        button, select, nav, aside, header { display: none !important; }
        #report-print-area { overflow: visible !important; }
        #report-print-area table { width: 100% !important; color: #111827 !important; }
        #report-print-area th, #report-print-area td { padding: 8px !important; border-bottom: 1px solid #d1d5db !important; }
        #report-print-area span { background: transparent !important; color: #111827 !important; padding: 0 !important; }
      }
    `}</style>
    <DashboardLayout
      role="admin"
      title="Laporan & Presensi Global"
      subtitle="Rekapitulasi persentase kehadiran harian siswa dan guru di seluruh sekolah"
    >
      {/* Toast Notification */}
      {downloadNotice && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  <div className="bg-[#10B981] rounded-[22px] p-6 shadow-none flex flex-col justify-between text-white">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-bold uppercase opacity-90">Kehadiran Siswa</span>
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <Users className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-4xl font-extrabold tracking-tight mb-1" suppressHydrationWarning>{overallStats.studentPercent}%</p>
    <p className="text-xs font-medium opacity-90">Kumulatif seluruh tingkat kelas</p>
  </div>

  <div className="bg-[#3B82F6] rounded-[22px] p-6 shadow-none flex flex-col justify-between text-white">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-bold uppercase opacity-90">Kehadiran Staf Guru</span>
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <UserCheck className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-4xl font-extrabold tracking-tight mb-1" suppressHydrationWarning>{overallStats.teacherPercent}%</p>
    <p className="text-xs font-medium opacity-90">Pengajar hadir sesuai jadwal</p>
  </div>

  <div className="bg-[#8B5CF6] rounded-[22px] p-6 shadow-none flex flex-col justify-between text-white">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-bold uppercase opacity-90">Hari Efektif Belajar</span>
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <Calendar className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className="text-4xl font-extrabold tracking-tight mb-1" suppressHydrationWarning>{overallStats.effectiveDays} Hari</p>
    <p className="text-xs font-medium opacity-90">Periode Bulan Berjalan</p>
  </div>
</div>

      {/* Main Table Section */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rekapitulasi Kehadiran per Kelas</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Filter berdasarkan rentang waktu dan unduh laporan resmi</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Rentang Filter */}
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 appearance-none pr-10"
              >
                <option className="bg-white text-slate-900" value="minggu">Minggu Ini</option>
                <option className="bg-white text-slate-900" value="bulan">Bulan Ini</option>
                <option className="bg-white text-slate-900" value="semester">Semester Ini</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Export Actions */}
            <button
  onClick={() => handleExport('excel')}
  className="px-4 py-2.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl shadow-none transition flex items-center gap-2"
>
  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
  <span>Export Excel</span>
</button>

<button
  onClick={() => handleExport('pdf')}
  className="px-4 py-2.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs rounded-xl shadow-none transition flex items-center gap-2"
>
  <Printer className="w-4 h-4 text-rose-600" />
  <span>Cetak PDF</span>
</button>
          </div>
        </div>

        {/* Table */}
        <div id="report-print-area" className="overflow-x-auto">
  <div className="hidden print:block mb-6">
    <h1 className="text-xl font-bold text-slate-900">Laporan Presensi Admin</h1>
    <p className="text-xs text-slate-500">Periode: {range === 'minggu' ? 'Minggu Ini' : range === 'bulan' ? 'Bulan Ini' : 'Semester Ini'}</p>
    <p className="text-xs text-slate-500">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
              <tr>
                <th className="py-4 px-6">Grup / Kelas</th>
                <th className="py-4 px-6">Wali Kelas / Penanggung Jawab</th>
                <th className="py-4 px-6 text-center">Hadir</th>
                <th className="py-4 px-6 text-center">Izin</th>
                <th className="py-4 px-6 text-center">Sakit</th>
                <th className="py-4 px-6 text-center">Alpa</th>
                <th className="py-4 px-6 text-right">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{row.class}</td>
                  <td className="py-4 px-6 text-slate-600 font-medium">{row.teacher}</td>
                  <td className="py-4 px-6 text-center font-bold text-emerald-600">{row.hadir}</td>
                  <td className="py-4 px-6 text-center font-bold text-blue-600">{row.izin}</td>
                  <td className="py-4 px-6 text-center font-bold text-amber-600">{row.sakit}</td>
                  <td className="py-4 px-6 text-center font-bold text-rose-600">{row.alpa}</td>
                  <td className="py-4 px-6 text-right">
                    <span className="px-3 py-1 bg-emerald-500 text-white font-bold rounded-full font-mono text-[11px]">
  {row.percent}
</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
    </>
  );
}
