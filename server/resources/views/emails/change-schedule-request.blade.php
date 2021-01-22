<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <div style="height: 50px;background-color: #A0CD32;">
          <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Request for {{ slug_to_text( get_constant('REQUEST_TYPES.change_schedule')) }}</h1>
        </div>
        <div style="margin-top:5px;height:85px;width:100%;background-color: #E6E6E6;display:inline-flex;font-size:12.5px">
          <div style="width:50%;padding-top:10px;padding-left:10px;">
            <strong>{{ $user->getFullName() }}</strong> <br/>
            #{{ $user->emp_num }} <br/>
            <strong>{{ $department->getCompleteName() }}</strong>
          </div>
          <div style="width:50%;">
            <a target="_blank" style="background:#AC3232;padding: 5px 10px 5px 10px;margin: 25px 15px 36.5px 0px;border-radius: 0px;color: #fff;cursor: pointer;font-size: 14px;float:right;text-decoration:none;text-align:center;" href="{{ $approval_link .'/declined' }}">Decline</a>
            <a target="_blank" style="background:#A0CD32;padding: 5px 10px 5px 10px;margin: 25px 15px 36.5px 0px;border-radius: 0px;color: #fff;cursor: pointer;font-size: 14px;float:right;text-decoration:none;text-align:center;" href="{{ $approval_link .'/approved' }}">Approve</a>
          </div>
        </div>
        <br/>
        <br/>
        <div style="padding: 0px 25px 10px 25px;">
          <p><strong>Dear {{ $recepient->getFullName() }},</strong><br></p>
          <p>This is to request for a change schedule on the selected dates below. Thank you!</p>
        </div>
        <div style="padding: 0px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Request type: <strong>{{ slug_to_text( get_constant('REQUEST_TYPES.change_schedule')) }}</strong></td><tr>
            <tr style="background-color: #EAEBED;">
              <td align="left" style="padding:5px 10px;width:18%;">From:</td><td style="padding: 5px 10px;width:32%;">{{ date_to_text($change_schedule->valid_from, 'F d, Y') }}</td>
              <td align="left" style="padding: 5px 10px;width:18%;">To:</td><td style="padding: 5px 10px;width:32%;">{{ date_to_text($change_schedule->valid_to) }}</td>
            <tr>
          </table>
        </div>
        <div style="padding: 0px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Work Day(s): <b>{{ implode(', ', array_map('ucfirst', get_work_days($schedule->rest_days))) }}<b></td><tr>
          </table>
        </div>
        <div style="padding: 0px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;background-color: #EAEBED;border-spacing:13px 0px;">
            <tr>
              <td colspan="4" style="padding:5px 0px;">
                @foreach ($schedule_details as $key => $schedule_detail)
                <b>{{ ucfirst( $key ) }}</b> - 
                On-Duty: {{ $schedule_detail['start_time'] }} | 
                Off-Duty: {{ $schedule_detail['end_time'] }} | 
                Breaktime: {{ $schedule_detail['break_time'] }}<br/>
                
                  @if( !$schedule->isStandard() ) 
                    <span style="margin-left:50px;">{{ 'Flexy On-Duty: '.$schedule_detail['start_flexy_time'] . ' | Flexy Off-Duty: ' . $schedule_detail['end_flexy_time']  }}</span><br/><br/>
                  @endif
                @endforeach
              </td>
            <tr>
          </table>
        </div>
        <div style="padding: 4px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;background-color: #EAEBED;border-spacing:13px 0px;">
            <tr ><td colspan="4" style="padding:5px 0px;">Rest Day(s): <b>{{ implode(', ', array_map('ucfirst', $schedule->rest_days)) }}</b></td><tr>
          </table>
        </div>
        <div style="padding: 4px 25px 0px 25px;margin-bottom:30px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;background-color: #EAEBED;border-spacing:13px 0px;">
            <tr ><td colspan="4" style="padding:5px 0px;">Reason(s): <b>{{ ($change_schedule->employee_note) }}</b></td><tr>
          </table>
        </div>
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
</div>