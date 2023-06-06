<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <div style="height: 50px;background-color: #A0CD32;">
          {{-- <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Reminder for {{ slug_to_text( get_constant('REMINDER_TYPE.invalid_check_ins')) }}</h1> --}}
          <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Reminder regarding employees with invalid check-ins</h1>

        </div>
        
        
        <div style="padding: 0px 25px 10px 25px;">
          <p><strong>Dear {{ $recepient->getFullName() }},</strong><br></p>
          <p>Listed below are employees who did not check-in properly for two consecutive days:</p>
        </div>
        <div style="padding: 0px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
              <tr>
                <th>Employee Number</th>
                <th>Name</th>
                <th>Department</th>
              </tr>
              @foreach($invalid_check_ins as $employee)
                <tr>
                  <td>{{ $employee->emp_num }}</td>
                  <td>{{ $employee->employee_name }}</td>
                  <td>{{ $employee->department_name }}</td>
                </tr>
              @endforeach
           </table>
        </div>
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
</div>
