<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div >
        <div style="height: 50px;background-color: #A0CD32;">
          <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Request for {{ slug_to_text($overtime->type) }}</h1>
        </div>
        <div style="margin-top:5px;height:85px;width:100%;background-color: #E6E6E6;display:inline-flex;font-size:12.5px">
          <div style="width:50%;padding-top:10px;padding-left:10px;">
              <strong>{{ $user->getFullName() }}</strong> <br/>
              {{ $user->emp_num }} <br/>
              <strong>{{ $department->getCompleteName() }}</strong>
          </div>
          <div style="width:50%;">
            <a target="_blank" style="background:#AC3232;padding: 5px 10px 5px 10px;margin: 25px 15px 36.5px 0px;border-radius: 0px;color: #fff;cursor: pointer;font-size: 14px;float:right;text-decoration:none;text-align:center;" href="{{ $approval_link .'/declined' }}">Decline</a>
            <a target="_blank" style="background:#A0CD32;padding: 5px 10px 5px 10px;margin: 25px 15px 36.5px 0px;border-radius: 0px;color: #fff;cursor: pointer;font-size: 14px;float:right;text-decoration:none;text-align:center;" href="{{ $approval_link .'/approved' }}">Approve</a>
          </div>
        </div>
        <div style="padding: 0px 25px 10px 25px;">
          <p><strong>Dear {{ $recepient->getFullName() }},</strong><br></p>
          <p>I would like to request to work overtime on the selected dates below. Thank you!</p>

        </div>
        <div style="margin-bottom:30px;padding: 0px 25px 0px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Request type: <strong>{{ slug_to_text($overtime->type) }}</strong></td><tr>
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Request date: <strong>{{ ($overtime->date) }}</strong></td><tr>
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Hours requested: <strong>{{ seconds_to_hour($overtime->amount) }}</strong></td><tr>
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #EAEBED;">Note: <strong>{{ ($overtime->employee_note) }}</strong></td><tr>
          </table>
        </div>
        <div style="height:30px;margin:10px 0px;">
            <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
  </div>
