'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, notifyDataChanged } from '@/lib/api';
import type { Course as ApiCourse, User } from '@/types/api';

export interface Course {
  id: string;
  code: string;
  joinCode: string;
  title: string;
  teacher: string;
  studentsCount: number;
  materi: number;
  tugas: number;
  path: string;
  studentsList: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
}

interface LmsContextType {
  enrolledCourses: Course[];
  availableCourses: Course[];
  myCourseIds: string[];
  loading: boolean;
  addCourse: (newCourseData: { title: string; code?: string; students?: string; teacher?: string }) => Promise<Course>;
  updateCourse: (id: string, updatedData: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  joinCourseByCode: (code: string) => Promise<{ success: boolean; course?: Course; message: string }>;
  joinCourseById: (id: string) => Promise<{ success: boolean; message: string }>;
  leaveCourseById: (id: string) => Promise<void>;
  kickStudent: (courseId: string, studentId: string) => Promise<void>;
  refreshCourses: () => Promise<void>;
}

const LmsContext = createContext<LmsContextType | undefined>(undefined);

function getCourseList(data: unknown): ApiCourse[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const response = data as { data?: unknown; courses?: unknown };
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.courses)) return response.courses;
  }
  return [];
}

function mapApiCourseToLocal(apiCourse: ApiCourse): Course {
  const students = Array.isArray(apiCourse.students) ? apiCourse.students : [];

  return {
    id: String(apiCourse.id),
    code: apiCourse.code,
    joinCode: apiCourse.code,
    title: apiCourse.title,
    teacher: apiCourse.teacher?.name || 'Unknown',
    studentsCount: apiCourse.students_count || students.length,
    materi: apiCourse.materials_count || 0,
    tugas: apiCourse.assignments_count || 0,
    path: '/guru/materi',
    studentsList: students.map(s => ({
      id: String(s.id),
      name: s.name,
      email: s.nisn_or_nip || s.email || '',
      status: 'Active'
    }))
  };
}

export function LmsProvider({ children }: { children: React.ReactNode }) {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutatingCourseId, setMutatingCourseId] = useState<string | null>(null);

  const refreshCourses = async (): Promise<void> => {
    try {
      const [myCoursesResult, availableCoursesResult] = await Promise.allSettled([
        api.getCourses(),
        api.getAvailableCourses(),
      ]);

      if (myCoursesResult.status === 'fulfilled') {
        const myMapped = getCourseList(myCoursesResult.value).map(mapApiCourseToLocal);
        setEnrolledCourses(myMapped);
        setMyCourseIds(myMapped.map(c => c.id));
      }

      if (availableCoursesResult.status === 'fulfilled') {
        setAvailableCourses(getCourseList(availableCoursesResult.value).map(mapApiCourseToLocal));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCourses();

    const handleUserUpdated = () => {
      refreshCourses();
    };

    const handleCoursesUpdated = () => {
      refreshCourses();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('lms_user_updated', handleUserUpdated);
      window.addEventListener('lms_courses_updated', handleCoursesUpdated);
      return () => {
        window.removeEventListener('lms_user_updated', handleUserUpdated);
        window.removeEventListener('lms_courses_updated', handleCoursesUpdated);
      };
    }
  }, []);

  const addCourse = async (data: { title: string; code?: string; students?: string; teacher?: string }): Promise<Course> => {
    const generatedCode = data.code ? data.code.toUpperCase() : `MAPEL-${Math.floor(100 + Math.random() * 900)}`;
    
    try {
      const response = await api.createCourse({
        title: data.title,
        code: generatedCode,
        description: 'Kelas baru buatan Guru'
      });
      
      const apiCourse = (response as any).data || response;
      const newCourse = mapApiCourseToLocal(apiCourse as ApiCourse);
      setEnrolledCourses(prev => [newCourse, ...prev]);
      notifyDataChanged('lms_courses_updated');
      return newCourse;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  };

  const updateCourse = async (id: string, updatedData: Partial<Course>): Promise<void> => {
    try {
      await api.updateCourse(Number(id), updatedData as any);
      await refreshCourses();
      notifyDataChanged('lms_courses_updated');
    } catch (error) {
      console.error('Failed to update course:', error);
      throw error;
    }
  };

  const deleteCourse = async (id: string): Promise<void> => {
    try {
      await api.deleteCourse(id);
      setEnrolledCourses(prev => prev.filter(c => c.id !== id));
      setMyCourseIds(prev => prev.filter(cId => cId !== id));
      notifyDataChanged('lms_courses_updated');
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw error;
    }
  };

  const joinCourseById = async (id: string) => {
    if (myCourseIds.includes(id)) {
      return { success: false, message: 'Anda sudah terdaftar di kelas ini.' };
    }

    const targetCourse = availableCourses.find(c => String(c.id) === String(id));
    const prevEnrolled = [...enrolledCourses];
    const prevMyIds = [...myCourseIds];

    // Optimistic Update: Instantly add to joined classes in UI (0ms response)
    if (targetCourse) {
      setEnrolledCourses(prev => [{ ...targetCourse, isJoined: true }, ...prev.filter(c => c.id !== id)]);
    }
    setMyCourseIds(prev => [...new Set([...prev, id])]);

    try {
      setMutatingCourseId(id);
      await api.enrollCourse(Number(id));
      notifyDataChanged('lms_courses_updated');
      void refreshCourses();
      return { success: true, message: 'Berhasil bergabung ke kelas!' };
    } catch (error: any) {
      // Rollback if server fails
      setEnrolledCourses(prevEnrolled);
      setMyCourseIds(prevMyIds);
      return { success: false, message: error.message || 'Gagal bergabung ke kelas.' };
    } finally {
      setMutatingCourseId(null);
    }
  };

  const leaveCourseById = async (id: string) => {
    const prevEnrolled = [...enrolledCourses];
    const prevMyIds = [...myCourseIds];

    // Optimistic Update: Instantly remove from UI
    setEnrolledCourses(prev => prev.filter(c => String(c.id) !== String(id)));
    setMyCourseIds(prev => prev.filter(cId => String(cId) !== String(id)));

    try {
      setMutatingCourseId(id);
      await api.leaveCourse(Number(id));
      notifyDataChanged('lms_courses_updated');
      void refreshCourses();
    } catch (error) {
      // Rollback if server fails
      setEnrolledCourses(prevEnrolled);
      setMyCourseIds(prevMyIds);
      console.error('Failed to leave course:', error);
      throw error;
    } finally {
      setMutatingCourseId(null);
    }
  };

  const joinCourseByCode = async (codeInput: string) => {
    const cleanCode = codeInput.trim().toUpperCase().replace(/-JOIN$/i, '');
    
    try {
      setMutatingCourseId(cleanCode);
      const result = await api.enrollByCode(cleanCode);
      const enrolled = (result as any).course ? mapApiCourseToLocal((result as any).course) : undefined;
      if (enrolled) {
        setEnrolledCourses(prev => [enrolled, ...prev.filter(c => c.id !== enrolled.id)]);
        setMyCourseIds(prev => [...new Set([...prev, enrolled.id])]);
      }
      notifyDataChanged('lms_courses_updated');
      void refreshCourses();
      
      return { 
        success: true, 
        course: enrolled, 
        message: `Berhasil bergabung ke kelas dengan kode ${cleanCode}!` 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || `Kode Akses "${cleanCode}" tidak ditemukan atau gagal bergabung!` 
      };
    } finally {
      setMutatingCourseId(null);
    }
  };

  const kickStudent = async (courseId: string, studentId: string) => {
    try {
      await api.kickStudent(Number(courseId), Number(studentId));
      await refreshCourses();
      notifyDataChanged('lms_courses_updated');
    } catch (error) {
      console.error('Failed to kick student:', error);
      throw error;
    }
  };

  return (
    <LmsContext.Provider value={{
      enrolledCourses,
      availableCourses,
      myCourseIds,
      loading,
      addCourse,
      updateCourse,
      deleteCourse,
      joinCourseByCode,
      joinCourseById,
      leaveCourseById,
      kickStudent,
      refreshCourses
    }}>
      {children}
    </LmsContext.Provider>
  );
}

export function useLms() {
  const context = useContext(LmsContext);
  if (!context) {
    throw new Error('useLms must be used within an LmsProvider');
  }
  return context;
}
