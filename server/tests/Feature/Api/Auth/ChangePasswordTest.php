<?php

namespace Tests\Feature\API\User;

use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\ApiTestCase;

class ChangePasswordTest extends ApiTestCase
{
    /** @test */
    public function forgotpassword_001_submit_forgot_password_request()
    {
        $payload = [
            'email' => 'gary.aure@eastvantage.com',
        ];

        $response = $this->json(
            'POST',
            '/api/forgot_password_request',
            $payload,
            $this->headers()
        );

        $response
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Password successfully reset. Please check your e-mail for further instructions.',
                'content' => [],
            ]);
    }

    /** @test */
    /** @test */
    public function changepassword_002_change_user_password()
    {
        $user_id = 1698;
        $token = $this->tokenForUserId($user_id);

        $temporary_password = str_random(8);

        $user = User::find($user_id);
        $user->password = Hash::make($temporary_password);
        $user->save();

        $payload = [
            'current_password' => $temporary_password,
            'new_password' => '{ev2010}',
            'confirm_new_password' => '{ev2010}',
        ];

        $response = $this->json(
            'POST',
            sprintf('/api/user/%s/change_password', $user_id),
            $payload,
            $this->authHeaders($token)
        );

        $response->assertStatus(200);

        // Reload the user from the database
        $user->refresh();

        // Verify the password was actually changed
        $this->assertTrue(
            Hash::check('{ev2010}', $user->password)
        );

        // Verify the old password no longer works
        $this->assertFalse(
            Hash::check($temporary_password, $user->password)
        );
    }
}