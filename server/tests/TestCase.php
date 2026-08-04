<?php

namespace Tests;

use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function user(?string $email = null): ?User
    {
        $email = $email ?? $this->scenarioUserEmail();
        
        return User::where('email', $email)->first();
    }

    protected function userId(?string $email = null): ?int
    {
        $email = $email ?? $this->scenarioUserEmail();
    
        return User::where('email', $email)->value('id');
    }

    protected function scenarioUserEmail(): string
    {
        return getenv('PAYROLL_USER')
            ?: ($_SERVER['PAYROLL_USER'] ?? null)
            ?: ($_ENV['PAYROLL_USER'] ?? null)
            ?: 'active@company.com';
    }

    protected function scenarioDate(): string
    {
        $start = \Illuminate\Support\Facades\DB::table('payroll_cutoffs')
            ->whereNull('deleted_at')
            ->whereRaw('CURDATE() BETWEEN start_date AND end_date')
            ->value('start_date');

        return $start ?? '2026-06-10';
    }

    protected function biometricUserId(User $user): string
    {
        return '20' . $user->emp_num;
    }
 
    protected function timeAt(string $time, string $timezone = 'UTC'): string
    {
        return $this->scenarioDate() . ' ' . $time;
    }
}