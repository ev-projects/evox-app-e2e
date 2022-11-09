<div style="width:100%;">
    <div style="width:800px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <div style="height: 50px;background-color: #A0CD32;">
          {{-- <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Reminder for {{ slug_to_text( get_constant('REMINDER_TYPE.no_sched')) }}</h1> --}}
          <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Notfication: New Employees
          </h1>
        </div>
        
        
        <div style="padding: 0px 25px 10px 25px;">
          <p><strong>Hello {{ $recepient->getFullName() }},</strong><br></p>
          <p>Listed below are new employees assigned to you.</p>
          <p>If you are supervisor of the employees department, you can check and adjust their <u>default schedule</u> or assign one if it is missing or needed before their hire date. 
            If the employee's department already have set schedule, system will automatically apply it as default,
            but do check if it is optimal for the user.
          </p>
        
        </div>
        <div style="padding: 0px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
            {{-- <tr ><td colspan="4" style="padding:5px 10px;background-color: #E6E6E6;">Request type: <strong>{{ slug_to_text( get_constant('REQUEST_TYPES.rest_day_work')) }}</strong></td><tr>
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #E6E6E6;">Request Date: <strong>{{ date_to_text($rest_day_work->date, 'D, d M Y') }}</strong></td><tr>
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Note: <strong>{{ ($rest_day_work->employee_note) }}</strong></td><tr> --}}
              <tr style="background-color: #E6E6E6;">
                <th>Employee Number</th>
                <th>Name</th>
                <th>Department</th>
                <th>Start Date</th>
              </tr>
              @foreach($list_employees as $employee)
                <tr>
                  <td style= "text-align: center;">{{ $employee->emp_num}}</td>
                  <td>{{ $employee->getFullName()}}</td>
                  <td>{{$employee->department->department_name}}</td>
                  <th>{{$employee->date_hired}}</th>
                </tr>
              @endforeach
           </table>
        </div>
        <div style="margin-bottom:30px;height:80px;padding: 0px 25px 10px 25px;">
         
          
        </div>
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>

      </div>
    </div>
</div>
