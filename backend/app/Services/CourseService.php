<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class CourseService
{
    public function getCoursesForUser(User $user): Collection
    {
        $query = Course::with([
                'teacher',
                'students' => fn ($query) => $query->wherePivot('status', 'active'),
            ])
            ->withCount([
                'materials',
                'assignments',
                'students' => fn ($query) => $query->where('course_student.status', 'active'),
            ]);

        return match ($user->role) {
            'guru' => $query->where('teacher_id', $user->id)->latest()->get(),
            'siswa' => $query->whereHas('students', fn ($q) => $q->where('users.id', $user->id)
                ->where('course_student.status', 'active')
            )->latest()->get(),
            'admin' => $query->latest()->get(),
            default => collect(),
        };
    }

    public function createCourse(User $user, array $data): Course
    {
        $code = $data['code'] ?? strtoupper(Str::random(6));

        return Course::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'teacher_id' => $user->id,
            'code' => $code,
        ]);
    }

    public function enrollStudent(Course $course, User $student): void
    {
        if ($student->role !== 'siswa') {
            throw new \Exception('Hanya siswa yang bisa enroll');
        }

        DB::transaction(function () use ($course, $student) {
            $membership = $course->students()
                ->where('users.id', $student->id)
                ->first();

            if ($membership) {
                $membershipStatus = DB::table('course_student')
                    ->where('course_id', $course->id)
                    ->where('student_id', $student->id)
                    ->value('status');

                if ($membershipStatus === 'active') {
                    throw new \Exception('Sudah terdaftar di kelas ini');
                }

                $course->students()->updateExistingPivot($student->id, ['status' => 'active']);
            } else {
                $course->students()->attach($student->id, ['status' => 'active']);
            }

            if ($course->teacher) {
                app(NotificationService::class)->notifyTeacherOfEnrollment(
                    $course->teacher,
                    $student->name,
                    $course->title,
                    $course->id
                );
            }
        });
    }

    public function enrollByCode(string $code, User $student): Course
    {
        $course = Course::where('code', $code)->firstOrFail();
        $this->enrollStudent($course, $student);

        return $course;
    }

    public function leaveCourse(Course $course, User $student): void
    {
        if ($student->role !== 'siswa') {
            throw new \Exception('Hanya siswa yang bisa keluar dari kelas');
        }

        $updated = $course->students()
            ->wherePivot('status', 'active')
            ->updateExistingPivot($student->id, ['status' => 'dropped']);

        if ($updated === 0) {
            throw new \Exception('Anda belum tergabung di kelas ini');
        }
    }

    public function getEnrolledStudents(Course $course): Collection
    {
        return $course->students()
            ->wherePivot('status', 'active')
            ->get();
    }

    public function kickStudent(Course $course, int $studentId): void
    {
        $course->students()->updateExistingPivot($studentId, ['status' => 'dropped']);
    }

    public function getAvailableCourses(): Collection
    {
        return Course::with([
                'teacher',
                'students' => fn ($query) => $query->wherePivot('status', 'active'),
            ])
            ->withCount([
                'materials',
                'assignments',
                'students' => fn ($query) => $query->where('course_student.status', 'active'),
            ])
            ->latest()
            ->get();
    }
}
