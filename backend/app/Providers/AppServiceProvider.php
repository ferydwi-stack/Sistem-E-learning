<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Events\SubmissionCreated;
use App\Events\SubmissionGraded;
use App\Listeners\SendSubmissionNotification;
use App\Listeners\SendGradeNotification;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontend = rtrim(env('FRONTEND_URL', 'https://sistem-e-learning.vercel.app'), '/');
            return $frontend . '/reset-password?email=' . urlencode($user->email) . '&token=' . $token;
        });

        Event::listen(
            SubmissionCreated::class,
            SendSubmissionNotification::class
        );
        
        Event::listen(
            SubmissionGraded::class,
            SendGradeNotification::class
        );
    }
}
