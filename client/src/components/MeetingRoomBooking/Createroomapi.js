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
  setvalidseat
) => {
  return (dispatch, getState) => {
    const history = createBrowserHistory();
    if (name !== "" && location !== "" && seat !== "") {
      API.call({
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
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/Getroomlist/${id}`,
    })
      .then((result) => {
        // alert(result.data[0].location);
        setRoomname(result.data[0].name);
        setLocation(result.data[0].location);
        setdescription(result.data[0].description);
        setSeats(result.data[0].seats);
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
  return (dispatch, getState) => {
    if (name !== "" && location !== "" && seat !== "") {
      API.call({
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
  return (dispatch, getState) => {
    // let history = useHistory();
    API.call({
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
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/Getroom?page=1`,
    })
      .then((result) => {
        setRoomlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const pagenationRoomlist = (setRoomlist,page,setTotalpagecount,setCurrentpagecount) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/Getroom?page=${page}`,
    })
      .then((result) => {
        setRoomlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};


export const drpdownLocationlist = (setDatalocation)=>{
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/getlocationcal`,
    })
      .then((result) => {
        setDatalocation(result.data);
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };

}