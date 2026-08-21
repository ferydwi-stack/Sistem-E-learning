import type { 
  LoginResponse, 
  User, 
  Course, 
  Material, 
  Assignment, 
  Submission, 
  Attendance, 
  Notification,
  StatsResponse,
  ApiResponse
} from '@/types/api';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:8000/api/v1`;
    }
    // For ngrok or any custom domain, use relative endpoint proxied by Next.js rewrites
    return '/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lms_token');
  }
  return null;
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lms_token', token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
  }
};

export const getCurrentUser = (): any | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('lms_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

let realtimeChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    realtimeChannel = new BroadcastChannel('lms_realtime_sync');
    realtimeChannel.onmessage = (event) => {
      if (event.data && typeof event.data === 'string') {
        window.dispatchEvent(new CustomEvent(event.data));
      }
    };
  } catch (e) {}
}

export const notifyDataChanged = (eventName: string): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
    if (realtimeChannel) {
      try {
        realtimeChannel.postMessage(eventName);
      } catch (e) {}
    }
  }
};

export const setCurrentUser = (userObj: any): void => {
  if (typeof window !== 'undefined' && userObj) {
    const user = userObj.user || userObj.data || userObj;
    try {
      const existingStr = localStorage.getItem('lms_user');
      if (existingStr) {
        const existing = JSON.parse(existingStr);
        const existingUser = existing.user || existing.data || existing;
        if (existingUser.id && user.id && Number(existingUser.id) === Number(user.id)) {
          const merged = { ...existingUser, ...user };
          localStorage.setItem('lms_user', JSON.stringify(merged));
          window.dispatchEvent(new Event('lms_user_updated'));
          return;
        }
      }
    } catch (e) {}
    localStorage.setItem('lms_user', JSON.stringify(user));
    window.dispatchEvent(new Event('lms_user_updated'));
  }
};

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || getApiBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server backend. Jalankan Laravel di http://127.0.0.1:8000.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API Error: ${response.status}`);
  }

  return data;
}

// API Service Methods
export const api = {
  // Auth
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
      setCurrentUser(res.user);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lms_user_updated'));
      }
    }
    return res;
  },

  logout: async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API failed or token already invalid');
    } finally {
      removeAuthToken();
      if (typeof window !== 'undefined') {
        try {
          const keys = Object.keys(localStorage).filter(k => k.startsWith('lms_'));
          keys.forEach(k => localStorage.removeItem(k));
        } catch {}
      }
    }
  },

  me: async (): Promise<User> => {
    const res = await fetchApi('/auth/me');
    if (res.user) {
      setCurrentUser(res.user);
    }
    return res.user;
  },

  // Admin Users
  getUsers: (role?: string, search?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/admin/users${queryStr}`);
  },

  createUser: async (userData: Partial<User> & { password?: string }): Promise<ApiResponse<User>> => {
    const res = await fetchApi('/admin/users', { method: 'POST', body: JSON.stringify(userData) });
    notifyDataChanged('lms_users_updated');
    return res;
  },
  updateUser: async (id: number, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const res = await fetchApi(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
    notifyDataChanged('lms_users_updated');
    return res;
  },
  resetUserPassword: async (id: number, password: string): Promise<ApiResponse> => {
    const res = await fetchApi(`/admin/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ password }) });
    notifyDataChanged('lms_users_updated');
    return res;
  },
  deleteUser: async (id: number): Promise<ApiResponse> => {
    const res = await fetchApi(`/admin/users/${id}`, { method: 'DELETE' });
    notifyDataChanged('lms_users_updated');
    return res;
  },
  bulkImportUsers: async (users: Partial<User>[]): Promise<ApiResponse> => {
    const res = await fetchApi('/admin/users/bulk-import', { method: 'POST', body: JSON.stringify({ users }) });
    notifyDataChanged('lms_users_updated');
    return res;
  },

  // Courses
  getCourses: (): Promise<Course[]> => fetchApi('/courses'),
  getCourseDetail: (id: number | string): Promise<Course> => fetchApi(`/courses/${id}`),
  createCourse: async (data: Partial<Course>): Promise<ApiResponse<Course>> => {
    const res = await fetchApi('/courses', { method: 'POST', body: JSON.stringify(data) });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  updateCourse: async (id: number, data: Partial<Course>): Promise<ApiResponse<Course>> => {
    const res = await fetchApi(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  deleteCourse: async (id: number | string): Promise<ApiResponse> => {
    const res = await fetchApi(`/courses/${id}`, { method: 'DELETE' });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  updateAttendanceSchedule: async (id: number | string, data: { attendance_open_time: string; attendance_close_time: string }): Promise<ApiResponse<Course>> => {
    const res = await fetchApi(`/courses/${id}/attendance-schedule`, { method: 'PUT', body: JSON.stringify(data) });
    notifyDataChanged('lms_courses_updated');
    return res;
  },

  // Materials
  getMaterials: (courseId?: number | string): Promise<Material[]> => fetchApi(courseId ? `/materials?course_id=${courseId}` : '/materials'),
  createMaterial: async (data: FormData | Partial<Material>): Promise<ApiResponse<Material>> => {
    const res = await fetchApi('/materials', { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) });
    notifyDataChanged('lms_materials_updated');
    return res;
  },
  deleteMaterial: async (id: number | string): Promise<ApiResponse> => {
    const res = await fetchApi(`/materials/${id}`, { method: 'DELETE' });
    notifyDataChanged('lms_materials_updated');
    return res;
  },

  // Assignments
  getAssignments: (courseId?: number | string): Promise<Assignment[]> => fetchApi(courseId ? `/assignments?course_id=${courseId}` : '/assignments'),
  getAssignmentDetail: (id: number | string): Promise<Assignment> => fetchApi(`/assignments/${id}`),
  createAssignment: async (data: FormData | Partial<Assignment>): Promise<ApiResponse<Assignment>> => {
    const res = await fetchApi('/assignments', { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) });
    notifyDataChanged('lms_assignments_updated');
    return res;
  },
  deleteAssignment: async (id: number | string): Promise<ApiResponse> => {
    const res = await fetchApi(`/assignments/${id}`, { method: 'DELETE' });
    notifyDataChanged('lms_assignments_updated');
    return res;
  },

  // Submissions (Tugas Siswa)
  submitAssignment: async (assignmentId: number | string, formData: FormData): Promise<ApiResponse<Submission>> => {
    const res = await fetchApi(`/assignments/${assignmentId}/submit`, { method: 'POST', body: formData });
    notifyDataChanged('lms_submissions_updated');
    return res;
  },

  gradeSubmission: async (submissionId: number | string, score: number, teacherFeedback?: string): Promise<ApiResponse<Submission>> => {
    const res = await fetchApi(`/submissions/${submissionId}/grade`, { method: 'PUT', body: JSON.stringify({ score, teacher_feedback: teacherFeedback }) });
    notifyDataChanged('lms_submissions_updated');
    return res;
  },

  getMySubmissions: (): Promise<Submission[]> => fetchApi('/submissions/my'),
  getAssignmentSubmissions: (assignmentId: number | string): Promise<Submission[]> => fetchApi(`/assignments/${assignmentId}/submissions`),

  // Enrollment
  enrollCourse: async (id: number): Promise<ApiResponse> => {
    const res = await fetchApi(`/courses/${id}/enroll`, { method: 'POST' });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  enrollByCode: async (code: string): Promise<ApiResponse<{ course: Course }>> => {
    const res = await fetchApi('/courses/enroll-by-code', { method: 'POST', body: JSON.stringify({ code }) });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  leaveCourse: async (id: number): Promise<ApiResponse> => {
    const res = await fetchApi(`/courses/${id}/leave`, { method: 'POST' });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  getCourseStudents: (id: number): Promise<User[]> => fetchApi(`/courses/${id}/students`),
  getCourseReport: (id: number): Promise<any> => fetchApi(`/courses/${id}/report`),
  getAvailableCourses: (): Promise<Course[]> => fetchApi('/available-courses'),
  kickStudent: async (courseId: number, studentId: number): Promise<ApiResponse> => {
    const res = await fetchApi(`/courses/${courseId}/students/${studentId}`, { method: 'DELETE' });
    notifyDataChanged('lms_courses_updated');
    return res;
  },
  updateStudentGrade: async (courseId: number, studentId: number, data: { uts_score: number; uas_score: number }): Promise<ApiResponse> => {
    const res = await fetchApi(`/courses/${courseId}/students/${studentId}/grades`, { method: 'PUT', body: JSON.stringify(data) });
    notifyDataChanged('lms_courses_updated');
    return res;
  },

  // Attendance
  getCourseAttendances: (courseId: number, date?: string): Promise<Attendance[]> => fetchApi(`/courses/${courseId}/attendances${date ? `?date=${date}` : ''}`),
  getCourseAttendanceStats: (courseId: number): Promise<any> => fetchApi(`/courses/${courseId}/attendance-stats`),
  saveCourseAttendances: async (courseId: number, data: { date: string; attendances: Array<{ student_id: number; status: string; note?: string }> }): Promise<ApiResponse> => {
    const res = await fetchApi(`/courses/${courseId}/attendances`, { method: 'POST', body: JSON.stringify(data) });
    notifyDataChanged('lms_attendances_updated');
    return res;
  },
  selfAttend: async (courseId: number): Promise<ApiResponse> => {
    const res = await fetchApi('/attendances/self', { method: 'POST', body: JSON.stringify({ course_id: courseId }) });
    notifyDataChanged('lms_attendances_updated');
    return res;
  },
  getMyAttendances: (): Promise<Attendance[]> => fetchApi('/attendances/my'),

  // Notifications
  getNotifications: (): Promise<Notification[]> => fetchApi('/notifications'),
  getUnreadCount: (): Promise<{ unread_count: number }> => fetchApi('/notifications/unread-count'),
  markNotificationRead: (id: number): Promise<ApiResponse> => fetchApi(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: (): Promise<ApiResponse> => fetchApi('/notifications/read-all', { method: 'PUT' }),

  // Profile
  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const res = await fetchApi('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
    notifyDataChanged('lms_user_updated');
    return res;
  },

  // Password Reset
  forgotPassword: (email: string): Promise<ApiResponse> => fetchApi('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data: { email: string; token: string; password: string; password_confirmation: string }): Promise<ApiResponse> =>
    fetchApi('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Admin Settings
  getAdminSettings: (): Promise<ApiResponse<any>> => fetchApi('/admin/settings'),
  updateAdminSettings: async (data: Record<string, any>): Promise<ApiResponse<any>> => {
    const res = await fetchApi('/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
    notifyDataChanged('lms_settings_updated');
    return res;
  },

  // Stats
  getAdminStats: (): Promise<StatsResponse> => fetchApi('/admin/stats'),
  getGuruStats: (): Promise<StatsResponse> => fetchApi('/guru/stats'),
  getSiswaStats: (): Promise<StatsResponse> => fetchApi('/siswa/stats'),
  getAllAssignments: (): Promise<Assignment[]> => fetchApi('/assignments'),
  getAllAttendances: (): Promise<Attendance[]> => fetchApi('/attendances/my'),
};
