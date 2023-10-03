import API from "../../services/API";
import Formatter from "../../services/Formatter";


export const updateApprovalstatus = (id,evetstatus,approvalnote,userid,startdate,enddate,setValidateapproval) =>{

    
    return async(dispatch, getState) => {
        if (evetstatus == 1) {
            evetstatus = "approved";
          } else if (evetstatus == 2) {
            evetstatus = "declined";
          }
        if (approvalnote !== "") {
          await API.call({
            method: "put",
            url: `/Roomapproval/${id}`,
            data: {
                ApprovalNote: approvalnote,
                Status: evetstatus,
                Approvedby: userid,
                Startdatetime: startdate,
                EnddateTime: enddate,
            },
          })
            .then((result) => {
              dispatch(Formatter.alert_success(result, 3000));
              dispatch({
                "type": "SET_REDIRECT",
                "link": global.links.dashboard,
              });
            })
            .catch((e) => {
              dispatch(Formatter.alert_error(e));
            });
        } else {
            if(approvalnote== ""){
                setValidateapproval(true);
            }
        }
      };
}

export const fecthBookedroomdetails =  (id,setRoomname,setStartdate,setEnddate,setNote,setUsername,setUserid,setStatus,setApprovalnote,setItrequirement) =>{


    return async (dispatch, getState) => {
      await API.call({
          method: "get",
          url: `/GetBookeddetailsByid/${id}`,
        })
          .then((result) => {
        setRoomname(result.data[0].name);
        setStartdate(result.data[0].start_date);
        setEnddate(result.data[0].end_date);
        setNote(result.data[0].note);
        setUsername(result.data[0].created_by);
        setUserid(result.data[0].user_id);
        setStatus(result.data[0].status);
        setApprovalnote(result.data[0].approver_note)
        setItrequirement(result.data[0].Reqiurement_List)
            dispatch({
              type: "MEETING_ROOM_APPROVAL",
              roomname : result.data[0].name,
              startdate : result.data[0].start_date,
              enddate : result.data[0].end_date,
              note : result.data[0].note,
              username : result.data[0].created_by,
              userid : result.data[0].user_id,
              status : result.data[0].status,
              approvernote : result.data[0].approver_note,
              itrequirement : result.data[0].Reqiurement_List,
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}

