import API from "../../services/API";
import Formatter from "../../services/Formatter";


export const dropdownLocationdetails = (setDatalocation)=>{

    return async (dispatch, getState) => {
      await API.call({
        method: "get",
        url: `/getlocationcal`,
      })
        .then((result) => {
          setDatalocation(result.data);
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


  export const dropdownMeetingRoomdetails= (setRoomlist) =>{

    return async (dispatch, getState) => {
      await API.call({
          method: "get",
          url: `/Getroomcal`,
        })
          .then((result) => {
            setRoomlist(result.data);
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

  export const changeLocation = (id,setRoomlist) => {

    return async (dispatch, getState) => {
      await API.call({
        method: "get",
        url: `/Getroomlistlocation_wise/${id}`,
      })
        .then((result) => {
          setRoomlist(result.data);
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