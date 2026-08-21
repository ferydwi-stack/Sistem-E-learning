<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function courseReport(Course $course, Request $request)
    {
        $user = $request->user();

        // Security check
        if ($user->role === 'guru' && $course->teacher_id !== $user->id) {
            abort(403, 'Unauthorized access to class report.');
        }

        // Only fetch active students
        $students = $course->students()->wherePivot('status', 'active')->get();

        // Fetch course assignments with their submissions
        $assignments = $course->assignments()->with('submissions')->get();
        
        // Fetch course attendances
        $attendances = $course->attendances()->get(['student_id', 'status']);

        // Load teacher relation
        $course->load('teacher:id,name,email');

        return response()->json([
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'code' => $course->code,
                'teacher' => $course->teacher ? [
                    'id' => $course->teacher->id,
                    'name' => $course->teacher->name,
                    'email' => $course->teacher->email
                ] : null
            ],
            'students' => $students,
            'assignments' => $assignments,
            'attendances' => $attendances
        ]);
    }
}