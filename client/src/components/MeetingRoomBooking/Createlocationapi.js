import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const createLocationmaster = (locationname, setvalidlocationname) => {
  return (dispatch, getState) => {
    if (locationname !== "") {
      API.call({
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
  return (dispatch, getState) => {
    if (locationname !== "") {
      API.call({
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
  return (dispatch, getState) => {
    API.call({
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

export const fecthLocationdetails = (id, setLocationname) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/getlocation/${id}`,
    })
      .then((result) => {
        // dispatch(Formatter.alert_success(result, 3000));
        setLocationname(result.data[0].location_name);
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

export const viewLocationlist = (setLocationlist,setTotalpagecount,setCurrentpagecount) => {
  return (dispatch, getState) => {
    API.call({
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

export const pagenationLocationlist = (
  setLocationlist,
  page,
  setTotalpagecount,
  setCurrentpagecount
) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/getlocation?page=${page}`,
    })
      .then((result) => {
        // dispatch(Formatter.alert_success(result, 3000));
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

export const drpdownLocation = (setLocationlist,setTotalpagecount,setCurrentpagecount) => {
  return (dispatch, getState) => {
    API.call({
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
