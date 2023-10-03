<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <!-- <div style="height: 133px;background-color: #A0CD32;"> -->
        @if($user_type == 'User')   
        <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">Hi {{$data[0]->user_name}},</h1>  
          <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">This is to confirm the booking of the meeting room for your upcoming meeting scheduled. We are pleased to accommodate your request.</h1>
          <!-- This is a notification that a your Requested Room {{$data[0]->name }} has Successfully Booked For this Time {{  $data[0]->start_date }} To {{  $data[0]->end_date }}.</h1>       -->
        
        @elseif($user_type == 'Helpdesk')
        <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">Hi Team,</h1>  
          <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">This is a notification that a forthcoming meeting will require certain IT requirements. Please review the information below and take the necessary action before the meeting.</h1>
        @else
        <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">Hi {{$data[0]->user_name}},</h1>  
          <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">I regret to inform you that we are unable to accommodate your request for booking the meeting room on {{ \Carbon\Carbon::parse( $data[0]->start_date)->format('d/m/Y')}} at {{ \Carbon\Carbon::parse( $data[0]->start_date)->format('H:i:s')}} - {{ \Carbon\Carbon::parse( $data[0]->end_date)->format('H:i:s')}} at {{  $data[0]->location_name }} due to {{  $data[0]->approver_note }}. We understand the importance of your meeting and apologize for any inconvenience this may cause.</h1>
          <!-- This is a notification that a your Requested Room {{$data[0]->name }} has Deny For this Time {{  $data[0]->start_date }} To {{  $data[0]->end_date }}.</h1> -->
        @endif
       
        <!-- </div> -->
        @if($user_type <> 'Deny') 
        <div style="margin-top:5px;height:180px;width:100%;background-color: #E6E6E6;display:inline-flex;font-size:12.5px">
          <div style="width:20%;padding-top:10px;padding-left:10px;">
            <strong>Meeting Date:</strong> <br/><br/>
            <strong>Meeting Time:</strong> <br/><br/>
            <strong>Meeting Room:</strong> <br/><br/>
            <strong>Location:</strong> <br/><br/>
            @if($user_type == 'Helpdesk') 
            <strong>Reserved By:</strong> <br/><br/>
            @if(isset($data[0]->Reqiurement_List))
            <strong>IT Requirement:</strong> <br/><br/>
            @endif
            @endif
          </div>
          <div style="width:70%;padding-top:10px;padding-left:10px;">
            <strong>{{ \Carbon\Carbon::parse( $data[0]->start_date)->format('d/m/Y')}}</strong> <br/><br/>
            <strong>{{ \Carbon\Carbon::parse( $data[0]->start_date)->format('H:i:s')}} - {{ \Carbon\Carbon::parse( $data[0]->end_date)->format('H:i:s')}}</strong> <br/><br/>
            <strong>{{ $data[0]->name  }}</strong> <br/><br/>
            <strong>{{  $data[0]->location_name }}</strong> <br/><br/>
            @if($user_type == 'Helpdesk') 
            <strong>{{  $data[0]->user_name }}</strong> <br/><br/>    
            @if(isset($data[0]->Reqiurement_List))
            <strong> {{ $data[0]->Reqiurement_List }}</strong> <br/><br/>
            @endif
            @endif 
           </div>
        </div>
        @endif
        <br/>
        <br/>
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
</div>
