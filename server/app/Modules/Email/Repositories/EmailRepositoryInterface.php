<?php 

namespace App\Modules\Email\Repositories;

use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface EmailRepositoryInterface
{

    public function sendRegisteredUserEmail( User $user, $temporary_password );

    public function sendForgotPasswordRequestEmail( User $user, $temporary_password );

    public function sendOvertimeRequestEmail( Overtime $overtime );

    public function sendOvertimeDisputeEmail( array $request );

    public function sendOvertimeRequestChangeStatusEmail( Overtime $overtime );

    public function sendRestDayWorkRequestEmail( RestDayWork $rest_day_work );

    public function sendRestDayWorkDisputeEmail( array $request );

    public function sendRestDayWorkRequestChangeStatusEmail( RestDayWork $rest_day_work );

    public function sendAlterLogRequestEmail( AlterLog $alter_log );

    public function sendAlterLogDisputeEmail( array $request );

    public function sendAlterLogRequestChangeStatusEmail( AlterLog $alter_log );

    public function sendChangeScheduleRequestEmail( ChangeSchedule $change_schedule );

    public function sendChangeScheduleRequestChangeStatusEmail( ChangeSchedule $change_schedule );

    public function sendSupervisorReminderNoSchedEmail( $reminders );

    public function sendSupervisorReminderofNewUser($new_user_list_for_reminder );

    public function sendSupervisorReminderRequestsEmail( $reminder);

    public function sendSupervisorReminderInvalidCheckInsEmail( $u, $check_ins_collection);


}