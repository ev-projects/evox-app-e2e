<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <div style="height: 50px;background-color: #A0CD32;">
          <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Forgot Password</h1>
        </div>
        <br/>
        <div style="padding: 0px 25px 10px 25px;">
          <p><strong>Dear {{ $user->getFullName() }},</strong><br></p>
          <p style="text-align:center;">We received your request and reset it with this temporary password: 
            <br/>
            <br/>
            <b style="background-color: #c1c1c1; color: black; padding: 5px 20px 5px 20px;">{{ $temporary_password }}</b>
            <br/>
            <br/>
            Once you logged in, the system will require you to change your password.
            <br/>
            <br/>
            <a target="_blank" style="background:#A0CD32;padding: 10px 15px 10px 15px;marginborder-radius: 0px;color: #fff;cursor: pointer;font-size: 14px;text-decoration:none;text-align:center;" href="{{ $site_link }}">Go to EVOX </a>
          </p>
        </div>
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
</div>