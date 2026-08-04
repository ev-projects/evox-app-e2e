<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use Tests\Feature\Api\evoxtest_BhrMock;

class CertificateOfEmploymentTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // CLAUDE.md: every endpoint backed by BhrRepositoryInterface must bind evoxtest_BhrMock.
        // evoxtest_BhrMock::get_user_bhr_field() now returns a minimal non-null object so
        // COEController::create() proceeds past the `if (!$employee)` guard.
        $this->app->bind(BhrRepositoryInterface::class, function () {
            return new evoxtest_BhrMock();
        });
    }

    public function test_user_can_create_coe_request()
    {
        $this->withoutMiddleware();
        config(['dompdf.defines.enable_remote' => true]);

        // DomPDF font cache missing in test env — mock the facade so PDF generation
        // never touches the filesystem, and the response still carries the right shape.
        \PDF::shouldReceive('loadView')->andReturnSelf();
        \PDF::shouldReceive('setPaper')->andReturnSelf();
        \PDF::shouldReceive('stream')->andReturn(
            new \Illuminate\Http\Response('%PDF-1.4 fake', 200, ['Content-Type' => 'application/pdf'])
        );

        $user = User::find(1593);
        $user->bhr_num = '42734';
        $user->save();

        $payload = [
            'purpose_index' => 1,
            'session_id' => 'test-session-id',
        ];

        // Mock COE Repository
        $this->mock(\App\Modules\Coe\Repositories\COERepositoryInterface::class, function ($mock) {
            $mock->shouldReceive('create')
                ->andReturn([
                    (object)[
                        'sequence_number' => 'COE-001',
                        'created_at' => now(),
                        'full_name' => 'Test User',
                        'address' => 'Test Address',
                        'hire_date' => now()->subYear(),
                        'separation_date' => null,
                        'position' => 'Developer',
                        'show_compensation' => false,
                        'basic_pay' => '1000',
                        'purpose' => 'Employment',
                        'purpose_note' => null,
                    ],
                    [],
                    (object)[
                        'template_header' => 'default.png',
                        'template_name' => 'default', // or 'ev-ph-ortigas'
                        'employer_address' => '',
                        'employer_entity' => '',
                        'signature_file' => '',
                        'signatory_name' => '',
                        'signatory_position' => '',
                    ]
                ]);
        });
    
        $response = $this->actingAs($user)
            ->post('/api/request/coe', $payload);

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
    
    public function test_coe_view_renders_without_errors()
    {
        $coe = (object)[
            'sequence_number' => 'COE-001',
            'full_name' => 'Test User',
            'address' => 'Test Address',
            'hire_date' => now()->subYear(),
            'position' => 'Developer',
            'show_compensation' => false,
            'purpose' => 'Employment',
            'purpose_note' => null,
            'separation_date' => null,
        ];
    
        $coe_template = (object)[
            'template_name' => 'default',
            'template_header' => 'default.png',
            'employer_entity' => 'Test Company',
            'employer_address' => 'Test Address',
            'signature_file' => 'signature.png',
            'signatory_name' => 'John Doe',
            'signatory_position' => 'HR Manager',
        ];
    
        $allowances = [];
        $header_image = '';
        $local_time = now()->format('F d, Y h:i:s A');
    
        $view = view('pdfs.coe', compact(
            'coe',
            'allowances',
            'coe_template',
            'header_image',
            'local_time'
        ));
    
        $html = $view->render();
    
        $this->assertStringContainsString('Certificate of Employment', $html);
        $this->assertStringContainsString('COE-001', $html);
    }
    
    public function test_coe_download_endpoint_returns_pdf()
    {
        $this->withoutMiddleware();
        config(['dompdf.defines.enable_remote' => true]);

        // DomPDF font cache missing in test env — mock PDF facade.
        \PDF::shouldReceive('loadView')->andReturnSelf();
        \PDF::shouldReceive('setPaper')->andReturnSelf();
        \PDF::shouldReceive('stream')->andReturn(
            new \Illuminate\Http\Response('%PDF-1.4 fake', 200, ['Content-Type' => 'application/pdf'])
        );

        $user = User::find(1593);

        $this->actingAs($user);

        $this->mock(\App\Modules\Coe\Repositories\COERepositoryInterface::class, function ($mock) {
            $mock->shouldReceive('create')
                ->andReturn([
                    (object)[
                        'sequence_number' => 'COE-001',
                        'created_at' => now(),
                        'full_name' => 'Test User',
                        'address' => 'Test Address',
                        'hire_date' => now(),
                        'position' => 'Developer',
                        'purpose' => 'Employment',
                        'purpose_note' => null,
                        'show_compensation' => false,
                        'separation_date' => null,
                    ],
                    [],
                    (object)[
                        'template_name' => 'default',
                        'template_header' => 'default.png',
                        'employer_entity' => 'Test Company',
                        'employer_address' => 'Test Address',
                        'signature_file' => 'sig.png',
                        'signatory_name' => 'John Doe',
                        'signatory_position' => 'HR',
                    ]
                ]);
        });
    
        $response = $this->postJson('/api/request/coe', [
            'purpose_index' => 1,
            'session_id' => 'test-session-id',
        ]);

        $response->assertStatus(200);
    
        $response->assertHeader('content-type', 'application/pdf');
    
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_can_get_all_coe_requests()
    {
        $this->withoutMiddleware();

        $user = User::find(1698);

        $response = $this->actingAs($user)
            ->getJson('/api/request/coe');

        $response->assertOk();

        $response->assertJsonStructure([
            'content',
            'message'
        ]);
    }

    public function test_get_users_filters_by_country_when_not_admin_level()
    {
        $this->withoutMiddleware();

        $authUser = User::find(1698); // make sure this user has LevelId != 5

        $response = $this->actingAs($authUser)
            ->getJson('/api/request/coe/user/?keyword=glenn');

        $response->assertOk();

        $response->assertJsonStructure([
            '*' => [
                'id',
                'name'
            ]
        ]);

        foreach ($response->json() as $user) {
            $this->assertNotEmpty($user['name']);
        }
    }
}
