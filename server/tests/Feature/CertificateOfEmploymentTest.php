<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class CertificateOfEmploymentTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_create_coe_request()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);
        $user->bhr_num = 'TEST123';
        $user->save();
    
        $payload = [
            'purpose_index' => 1,
            'session_id' => 'test-session-id',
        ];

        // Mock BHR Repository
        $this->mock(\App\Modules\Bhr\Repositories\BhrRepositoryInterface::class, function ($mock) {
            $mock->shouldReceive('get_user_bhr_field')
                ->andReturn((object)[
                    'employee_name' => 'Test User',
                    'position' => 'Developer',
                ]);
        });
    
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
    
        $user = User::find(1593);
    
        $this->actingAs($user);
    
        $this->mock(\App\Modules\Bhr\Repositories\BhrRepositoryInterface::class, function ($mock) {
            $mock->shouldReceive('get_user_bhr_field')
                ->andReturn((object)[
                    'employee_name' => 'Test User',
                    'position' => 'Developer',
                ]);
        });
    
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
}
