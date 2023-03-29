import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const viewBookingdetails = (
  setBookedlist,
  setTotalpagecount,
  setCurrentpagecount,
  setStatuscount
) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: `/GetBookeddetails?&page=1`,
    })
      .then((result) => {
        setBookedlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        setStatuscount(result.data.statuscount);
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

export const statusChange = (
  status,
  setBookedlist,
  setTotalpagecount,
  setStatus
) => {
  var endpoint = "";
  if (status !== "All") {
    endpoint = `/GetBookeddetails?status=${status}&page=1`;
  } else {
    endpoint = `/GetBookeddetails?page=1`;
  }

  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: endpoint,
    })
      .then((result) => {
        setBookedlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setStatus(status);
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

export const filterClick = (
  status,
  fromdate,
  todate,
  setBookedlist,
  setTotalpagecount
) => {
  var endpoint = "";
  if (status !== "All") {
    if (fromdate !== "" && todate !== "") {
      endpoint = `/GetBookeddetails?status=${status}&page=1&from_date=${fromdate}&to_date=${todate}`;
    } else {
      endpoint = `/GetBookeddetails?status=${status}&page=1`;
    }
  } else {
    if (fromdate !== "" && todate !== "") {
      endpoint = `/GetBookeddetails?page=1&from_date=${fromdate}&to_date=${todate}`;
    } else {
      endpoint = `/GetBookeddetails?page=1`;
    }
  }

  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: endpoint,
    })
      .then((result) => {
        setBookedlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
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

export const requestPagenationclick = (status,page,fromdate,todate,setBookedlist,setTotalpagecount) =>{
    var endpoint = "";
      if (status !== "All") {
        if (fromdate !== "" && todate !== "") {
            endpoint = `/GetBookeddetails?status=${status}&page=${page}&from_date=${fromdate}&to_date=${todate}`;
        } else {
            endpoint = `/GetBookeddetails?status=${status}&page=${page}`;
        }
      } else {
        if (fromdate !== "" && todate !== "") {
            endpoint = `/GetBookeddetails?page=${page}&from_date=${fromdate}&to_date${todate}`;
        } else {
            endpoint = `/GetBookeddetails?page=${page}`;
        }
      }

      return (dispatch, getState) => {
        API.call({
          method: "get",
          url: endpoint,
        })
          .then((result) => {
            setBookedlist(result.data.data.data);
            setTotalpagecount(result.data.pagination.last_page);
            dispatch({
              type: "SET_REDIRECT",
              link: global.links.dashboard,
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
      };
}
