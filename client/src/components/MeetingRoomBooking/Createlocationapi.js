import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const createLocationmaster = (locationname, setvalidlocationname) => {
  
   return async (dispatch, getState) => {
    if (locationname !== "") {
     await API.call({
        method: "post",
        url: "/storelocation",
        data: {
          Locationname: locationname,
        },
      })
        .then((result) => {
          dispatch(Formatter.alert_success(result, 3000));
          dispatch({
            type: "SET_REDIRECT",
            link: global.links.dashboard,
          });
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
    } else {
      if (locationname == "") {
        setvalidlocationname(true);
      }
    }
  };
};

export const updateLocationmaster = (
  id,
  locationname,
  setvalidlocationname
) => {
  return async (dispatch, getState) => {
    if (locationname !== "") {
      await API.call({
        method: "put",
        url: `/UpdateLocationDetails/${id}`,
        data: {
          Locationname: locationname,
        },
      })
        .then((result) => {
          dispatch(Formatter.alert_success(result, 3000));
          dispatch({
            type: "SET_REDIRECT",
            link: global.links.dashboard,
          });
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
    } else {
      if (locationname == "") {
        setvalidlocationname(true);
      }
    }
  };
};

export const deleteLocationmaster = (id) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/DeleteLocationDetails/${id}`,
    })
      .then((result) => {
        dispatch(Formatter.alert_success(result, 3000));
        dispatch({
          type: "SET_REDIRECT",
          link: global.links.dashboard,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const fecthLocationdetails = (id) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/getlocation/${id}`,
    })
      .then((result) => {
        // dispatch(Formatter.alert_success(result, 3000));
        // setLocationname(result.data[0].location_name);
        dispatch({
          type: "UPDATE_LOCATION",
          location: result.data[0].location_name,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const viewLocationlist = (setLocationlist,setTotalpagecount,setCurrentpagecount) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/getlocation?page=1`,
    })
      .then((result) => {
        setLocationlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "LOCATION_DETAILS",
          location: result.data.data.data,
          totalpagecount: result.data.pagination.last_page,
          currentpagecount: result.data.pagination.current_page,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const pagenationLocationlist = (
  setLocationlist,
  page,
  setTotalpagecount,
  setCurrentpagecount
) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/getlocation?page=${page}`,
    })
      .then((result) => {
        // dispatch(Formatter.alert_success(result, 3000));
        setLocationlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "LOCATION_DETAILS",
          location: result.data.data.data,
          totalpagecount: result.data.pagination.last_page,
          currentpagecount: result.data.pagination.current_page,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const drpdownLocation = (setLocationlist,setTotalpagecount,setCurrentpagecount) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/getlocation?page=1`,
    })
      .then((result) => {
        setLocationlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "SET_REDIRECT",
          link: global.links.dashboard,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};


export const viewRequestlist = (setRequestlist,setTotalpagecount,setCurrentpagecount,user_id) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/Getitrequirement?page=1`,
    })
      .then((result) => {
        setRequestlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "FECTH_ITREQUIREMENT_LIST",
          itrequirementlist:result.data.data.data,
          totalpage_count_itrequirement:result.data.pagination.last_page,
          currentpage_count_itrequirement:result.data.pagination.current_page,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
}


export const pagenationRequestlist = (
  setRequestlist,
  page,
  setTotalpagecount,
  setCurrentpagecount
) => {
  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: `/Getitrequirement?page=${page}`,
    })
      .then((result) => {
        // dispatch(Formatter.alert_success(result, 3000));
        setRequestlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        dispatch({
          type: "FECTH_ITREQUIREMENT_LIST",
          itrequirementlist:result.data.data.data,
          totalpage_count_itrequirement:result.data.pagination.last_page,
          currentpage_count_itrequirement:result.data.pagination.current_page,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};