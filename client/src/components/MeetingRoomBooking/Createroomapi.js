import React from "react";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { setRedirect } from "../../store/actions/redirectActions";
import { createBrowserHistory } from "history";



// Create Room in Room Master
export const CreateMasterroom = (
  name,
  location,
  seat,
  description,
  setvalidroomname,
  setvalidlocation,
  setvalidseat,
  seterror
) => {
  return async (dispatch, getState) => {
    const history = createBrowserHistory();
    if (name !== "" && location !== "" && seat !== "") {
      await API.call({
        method: "post",
        url: "/storeroom",
        data: {
          RoomName: name,
          Location: location,
          Description: description,
          Seats: seat,
        },
      })
        .then((result) => {
          if(result.data.status == 201){
            seterror(true);
          }
          dispatch(Formatter.alert_success(result, 3000));
          setRedirect(global.links.room_list);
          
          dispatch({
            type: "SET_REDIRECT",
            link: global.links.dashboard,
          });
    
          // window.location.reload(true);
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
    } else {
      if (name == "") {
        setvalidroomname(true);
      }
      if (location == "") {
        setvalidlocation(true);
      }
      if (seat == "") {
        setvalidseat(true);
      }
    }
  };
};

// Fecth Room Details by Room ID
export const fecthRoomdetails = (
  id,
  setRoomname,
  setLocation,
  setdescription,
  setSeats
) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/Getroomlist/${id}`,
    })
      .then((result) => {
        // alert(result.data[0].location);
        setRoomname(result.data[0].name);
        setLocation(result.data[0].location);
        setdescription(result.data[0].description);
        setSeats(result.data[0].seats);
        dispatch({
        type: "UPDATE_ROOM",
        roomname : result.data[0].name,
        locationname:result.data[0].location,
        description:result.data[0].description,
        noofseats:result.data[0].seats,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

// Updated Room Details by Room ID
export const updatedRoomdetails = (
  id,
  name,
  location,
  seat,
  description,
  setvalidroomname,
  setvalidlocation,
  setvalidseat
) => {
  return async (dispatch, getState) => {
    if (name !== "" && location !== "" && seat !== "") {
      await API.call({
        method: "put",
        url: `/UpdateRoomdetails/${id}`,
        data: {
          RoomName: name,
          Location: location,
          Description: description,
          Seats: seat,
        },
      })
        .then((result) => {
          dispatch(Formatter.alert_success(result, 3000));
          dispatch({
            type: "SET_REDIRECT",
            link: global.links.room_list,
          });
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
    } else {
      if (name == "") {
        setvalidroomname(true);
      }
      if (location == "") {
        setvalidlocation(true);
      }
      if (seat == "") {
        setvalidseat(true);
      }
    }
  };
};

// Delete Room Details by Room ID

export const deleteRoomdetails = (id) => {
  return async (dispatch, getState) => {
    // let history = useHistory();
    await API.call({
      method: "get",
      url: `/DeleteRoomdetails/${id}`,
    })
      .then((result) => {
        dispatch(Formatter.alert_success(result, 3000));
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const viewRoomlist = (setRoomlist,setTotalpagecount,setCurrentpagecount) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/Getroom?page=1`,
    })
      .then((result) => {
        setRoomlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "FECTH_ROOM_LIST",
          roomlist : result.data.data.data,
          total_page_count : result.data.pagination.last_page,
          current_page_count : result.data.pagination.current_page,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const pagenationRoomlist = (setRoomlist,page,setTotalpagecount,setCurrentpagecount) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/Getroom?page=${page}`,
    })
      .then((result) => {
        setRoomlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "FECTH_ROOM_LIST",
          roomlist : result.data.data.data,
          total_page_count : result.data.pagination.last_page,
          current_page_count : result.data.pagination.current_page,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};


export const drpdownLocationlist = (setDatalocation)=>{
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/getlocationcal`,
    })
      .then((result) => {
        setDatalocation(result.data);
        dispatch({
          type: "FECTH_LOCATION_LIST",
          locationlist:result.data,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };

}