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
            ?: $_SERVER['PAYROLL_USER']
            ?: $_ENV['PAYROLL_USER']
            ?: 'active@company.com';
    }

    protected function scenarioDate(): string
    {
        return getenv('PAYROLL_DATE')
            ?: $_SERVER['PAYROLL_DATE']
            ?: $_ENV['PAYROLL_DATE']
            ?: '2026-06-10';
    }

    protected function biometricUserId(User $user): string
    {
        return '20' . $user->emp_num;
    }
 
    protected function timeAt(string $time): string
    {
        return $this->scenarioDate() . ' ' . $time;
    }
}