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

export const fecthBookedroomdetails =  (id,setRoomname,setStartdate,setEnddate,setNote,setUsername,setUserid,setStatus) =>{


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
            dispatch({
              "type": "SET_REDIRECT",
              "link": global.links.dashboard,
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}

