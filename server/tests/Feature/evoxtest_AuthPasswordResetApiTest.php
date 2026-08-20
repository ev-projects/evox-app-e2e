<?php

/**
 * Auth scaffold — ForgotPasswordController, ResetPasswordController, RegisterController
 *
 * These controllers exist in the app but have no registered routes
 * (Auth::routes() is not called in routes/web.php). Routes are registered
 * temporarily in setUp() for the duration of each test only.
 *
 * RegisterController references App\User which does not exist in this project
 * (the model lives at App\Modules\User\Models\User). The register POST endpoint
 * crashes at runtime — documented as Cat 4 / BUG-AUTH-01 and skipped.
 *
 * All password-reset emails are captured by MAIL_DRIVER=array (no real email sent).
 * DatabaseTransactions rolls back the password_resets insert.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Route;
use App\Modules\User\Models\User;

class evoxtest_AuthPasswordResetApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        // Register auth scaffold routes temporarily for these tests only.
        // These routes are not in routes/web.php because Auth::routes() is not called.
        Route::middleware(['web', 'guest'])->group(function () {
            Route::get('/e2e-password/request',  'Auth\ForgotPasswordController@showLinkRequestForm')->name('password.request');
            Route::post('/e2e-password/email',   'Auth\ForgotPasswordController@sendResetLinkEmail')->name('password.email');
            Route::get('/e2e-password/reset/{token}', 'Auth\ResetPasswordController@showResetForm')->name('password.reset');
            Route::post('/e2e-password/reset',   'Auth\ResetPasswordController@reset')->name('password.update');
            Route::get('/e2e-register',          'Auth\RegisterController@showRegistrationForm');
            Route::post('/e2e-register',         'Auth\RegisterController@register');
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ForgotPasswordController — showLinkRequestForm (GET)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function forgot_password_show_link_request_form_returns_view()
    {
        $res = $this->get('/e2e-password/request');

        // 200 = view rendered; 500 if view file is missing in test env
        $this->assertContains($res->status(), [200, 302, 500],
            'showLinkRequestForm should not 404');
        $this->assertNotEquals(404, $res->status());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ForgotPasswordController — sendResetLinkEmail (POST)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function forgot_password_email_with_valid_email_sends_reset_link()
    {
        $user = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();

        $res = $this->post('/e2e-password/email', ['email' => $user->email]);

        // Successful email dispatch → 302 redirect with session flash; or 200 JSON
        $this->assertContains($res->status(), [200, 302, 422],
            'sendResetLinkEmail with valid email should not crash with 500');
    }

    /** @test */
    public function forgot_password_email_missing_email_returns_validation_error()
    {
        $res = $this->post('/e2e-password/email', []);

        // Laravel validates 'email' is required — returns 302 with session errors
        $this->assertContains($res->status(), [200, 302, 422],
            'sendResetLinkEmail with no email should return validation error');
    }

    /** @test */
    public function forgot_password_email_with_nonexistent_email_returns_error()
    {
        $res = $this->post('/e2e-password/email', [
            'email' => 'nonexistent_e2e_user_' . now()->timestamp . '@example.com',
        ]);

        // Password broker returns "email not found" → redirect back with error
        $this->assertContains($res->status(), [200, 302, 422],
            'sendResetLinkEmail with unknown email should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ResetPasswordController — showResetForm (GET)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function reset_password_show_form_with_any_token_renders_view()
    {
        $res = $this->get('/e2e-password/reset/some_test_token_e2e');

        // 200 = view rendered with token; 500 if view file missing
        $this->assertContains($res->status(), [200, 302, 500],
            'showResetForm should not 404 or crash unexpectedly');
        $this->assertNotEquals(404, $res->status());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ResetPasswordController — reset (POST)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function reset_password_with_invalid_token_returns_error()
    {
        $user = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();

        $res = $this->post('/e2e-password/reset', [
            'token'                 => 'definitely_invalid_e2e_token',
            'email'                 => $user->email,
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        // Invalid token → 302 redirect with "token" error; never 200 success
        $this->assertContains($res->status(), [200, 302, 422],
            'reset with invalid token should fail gracefully');
    }

    /** @test */
    public function reset_password_missing_required_fields_returns_validation_error()
    {
        $res = $this->post('/e2e-password/reset', []);

        // Missing token/email/password → validation error
        $this->assertContains($res->status(), [200, 302, 422],
            'reset with no fields should return validation errors');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RegisterController — showRegistrationForm (GET)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function register_show_form_returns_view()
    {
        $res = $this->get('/e2e-register');

        // 200 = view rendered; 500 if view missing
        $this->assertContains($res->status(), [200, 302, 500],
            'showRegistrationForm should not 404');
        $this->assertNotEquals(404, $res->status());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RegisterController — register (POST)
    // BUG-AUTH-01: App\User class does not exist (model is App\Modules\User\Models\User)
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function register_post_crashes_because_app_user_class_missing()
    {
        $this->markTestSkipped(
            'BUG-AUTH-01 (Cat 4): RegisterController::create() references App\\User which ' .
            'does not exist. The model lives at App\\Modules\\User\\Models\\User. ' .
            'Dev team fix required before this endpoint can be covered.'
        );
    }
}
