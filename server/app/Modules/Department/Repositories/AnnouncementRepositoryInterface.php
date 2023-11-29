<?php 

namespace App\Modules\Department\Repositories;

use App\Modules\User\Models\User;

interface AnnouncementRepositoryInterface
{
    public function index();
    
    public function store( $request);
    
    public function show($id);
    
    public function show_strict($id);
    
    public function update($request, $id);
    
    public function update_status( $request, $id);
    
    public function dashboard_index($request);

    public function increment_dashboard_index($request);
    
     public function handle_announcements_index();
     
    public function all_department_handled_Announcements();
    
    public function show_hr_strict($id);
    
    public function all_hr_handled_Announcements();
    
}