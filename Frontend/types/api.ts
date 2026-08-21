export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
  message: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'guru' | 'siswa';
  nisn_or_nip?: string;
  class_name?: string;
  subject?: string;
  specialization?: string;
  gender?: string;
  address?: string;
  phone?: string;
  bio?: string;
}

export interface Course {
  id: number;
  title: string;
  code: string;
  description?: string;
  teacher_id: number;
  teacher?: User;
  students_count?: number;
  materials_count?: number;
  assignments_count?: number;
  attendance_open_time?: string | null;
  attendance_close_time?: string | null;
  students?: Array<User & { pivot?: { status?: string; uts_score?: number; uas_score?: number } }>;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: number;
  course_id: number;
  title: string;
  content?: string;
  file_path?: string;
  created_at: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  instruction?: string;
  due_date?: string;
  attachment_path?: string;
  attachment_name?: string;
  course?: Course;
  submissions_count?: number;
  created_at: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  file_path?: string;
  original_filename?: string;
  note?: string;
  status: 'submitted' | 'late' | 'graded';
  score?: number;
  teacher_feedback?: string;
  submitted_at: string;
  graded_at?: string;
  assignment?: Assignment;
  student?: User;
}

export interface Attendance {
  id: number;
  course_id: number;
  student_id: number;
  date: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
  note?: string;
  attended_at?: string;
  time?: string;
  course?: Course;
  student?: User;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: number;
  user_id?: number;
  type?: string;
  title?: string;
  message: string;
  data?: Record<string, any>;
  read_at?: string;
  created_at?: string;
  time?: string;
  course?: string;
  link?: string;
  badge?: string;
  description?: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface StatsResponse {
  active_courses?: number;
  pending_tasks?: number;
  attendance_rate?: number;
  total_students?: number;
  pending_assignments?: number;
  courses?: Course[];
  // Admin stats fields
  total_users?: number;
  total_teachers?: number;
  total_courses?: number;
  total_assignments?: number;
  submissions_today?: number;
}
