<div style="width:100%;">
    <div style="width:600px;margin:0 auto 0 auto;background:#fff;border: 1px solid #8fd400;font-family:BhrHeaderFont,Trebuchet MS;">
      <div>
        <!-- <div style="height: 133px;background-color: #A0CD32;"> -->
        <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">Hi Team,</h1>  
          <h1 style="font-weight:normal;font-size:1.5em;text-align:left;padding-top:11px;margin:0px;padding-left: 15px;">This is a notification that a forthcoming meeting will require certain IT requirements. Please review the information below and take the necessary action before the meeting.</h1>
        <!-- </div> -->
        <div style="margin-top:5px;height:180px;width:100%;background-color: #E6E6E6;display:inline-flex;font-size:12.5px">
          <div style="width:20%;padding-top:10px;padding-left:10px;">
            <strong>Room Name:</strong> <br/><br/>
            <strong>Reserved By:</strong> <br/><br/>
            <strong>Location:</strong> <br/><br/>
            <strong>Start Date:</strong> <br/><br/>
            <strong>End Date:</strong> <br/><br/>
            <strong>IT Requirement:</strong> <br/><br/>
           
          </div>
          <div style="width:70%;padding-top:10px;padding-left:10px;">
            <strong>{{ $data[0]->name  }}</strong> <br/><br/>
            <strong>{{  $data[0]->user_name }}</strong> <br/><br/>
            <strong>{{  $data[0]->location_name }}</strong> <br/><br/>
             <strong>{{  $data[0]->start_date }}</strong> <br/><br/>
            <strong>{{  $data[0]->end_date }}</strong> <br/><br/>
            <strong>{{ $data[0]->Reqiurement_List }}</strong> <br/><br/>
           </div>
        </div>
        <br/>
        <br/>
        <!-- <div style="padding: 0px 25px 10px 25px;">
       
          <p>This is to request the correction of my time logs on the mentioned dates below. Thank you!</p>

        </div> -->
        <!-- <div style="padding: 0px 25px 10px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
            <tr style="background-color: #f2f2f2;">
              <td align="left" style="padding:5px 10px;width:18%;">IT Requirement:</td><td style="padding: 5px 10px;width:32%;">{{$data[0]->Reqiurement_List}}</td>
            <tr>
          
          </table>
        </div> -->
        <!-- <div style="margin-top:10px;margin-bottom:30px;padding: 0px 25px 10px 25px;">
          <table width="100%" style="margin-left:auto;margin-right:auto;">
            <tr ><td colspan="4" style="padding:5px 10px;background-color: #dedede;font-weight:600;">New:</td><tr>
            <tr style="background-color: #dedede;">
          
          </table>
        </div> -->
        <div style="height:30px;margin:10px 0px;">
          <img style="float:right;height:30px;width:180px;" src="{{url('/images/powered-by-evox-logo.png')}}" fluid />
        </div>
      </div>
    </div>
</div>