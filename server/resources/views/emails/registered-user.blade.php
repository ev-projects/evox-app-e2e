<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <div style="height: 50px;background-color: #A0CD32;">
          <h1 style="font-weight:normal;font-size:1.5em;text-align:center;color:white;padding-top:11px;margin:0px;">Welcome to EVOX!</h1>
        </div>
        <br/>
        <div style="padding: 0px 25px 10px 25px;">
          <p><strong>Hi {{ $user->getFullName() }},</strong><br></p>
          <p style="text-align:center;">A site administrator at Eastvantage has created an account for you. You may now log in by clicking the following link:
            <br/>
            <br/>
            <a target="_blank" style="background:#A0CD32;padding: 10px 15px 10px 15px;marginborder-radius: 0px;color: #fff;cursor: pointer;font-size: 14px;text-decoration:none;text-align:center;" href="{{ $site_link }}">{{ $site_link }}</a>
            <br/>
            <br/>
            Please use the following credentials:<br/>
            <div style="background-color: #c1c1c1; color: black; padding: 5px 20px 5px 20px;text-align: left">
              Username: <b>{{ $user->email }}</b> <br/>
              Password: <b>{{ $temporary_password }}</b>
            </div>
            <br/>
            <p style="text-align:center"> 
              Once you have logged in, the system will require you to change your password.
              <br/>
              <br/>
              Thank you!
            </p>
          </p>
        </div>
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
</div>