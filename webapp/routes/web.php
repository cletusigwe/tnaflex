<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardVideoController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\Route;

Route::get('/', [VideoController::class, 'index'])->name('home');

Route::get('/videos/{video}', [VideoController::class, 'show'])
    ->where('video', '[a-z0-9-]+')
    ->name('videos.show');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('login.store');

    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('register.store');
});

Route::middleware('auth')->group(function (): void {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/dashboard/videos/create', [DashboardVideoController::class, 'create'])
        ->name('dashboard.videos.create');
    Route::post('/dashboard/videos', [DashboardVideoController::class, 'store'])
        ->name('dashboard.videos.store');
    Route::post('/dashboard/videos/{video}/complete', [DashboardVideoController::class, 'complete'])
        ->where('video', '[a-z0-9-]+')
        ->name('dashboard.videos.complete');
    Route::get('/dashboard/videos/{video}', [DashboardVideoController::class, 'show'])
        ->where('video', '[a-z0-9-]+')
        ->name('dashboard.videos.show');
});
