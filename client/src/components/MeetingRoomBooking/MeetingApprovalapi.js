import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const viewBookingdetails = (
  setBookedlist,
  setTotalpagecount,
  setCurrentpagecount,
  setStatuscount
) => {
  return async (dispatch, getState) => {
    await  API.call({
      method: "get",
      url: `/GetBookeddetails?&page=1`,
    })
      .then((result) => {
        setBookedlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setCurrentpagecount(result.data.pagination.current_page);
        setStatuscount(result.data.statuscount);
        dispatch({
          type: "MEETING_ROOM_APPROVAL_LIST",
          bookedlist:result.data.data.data,
          statuscount:result.data.statuscount,
          totpagecount:result.data.pagination.last_page,
          curpagecount:result.data.pagination.current_page,
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
  setStatus,
  fromdate,
  todate,
  setStatuscount
) => {
  var endpoint = "";
  if (status !== "All") {
    if (fromdate !== "" && todate !== "") {
      endpoint = `/GetBookeddetails?status=${status}&page=1&from_date=${fromdate}&to_date=${todate}`;
    } else {
      endpoint = `/GetBookeddetails?status=${status}&page=1`;
    }
    // endpoint = `/GetBookeddetails?status=${status}&page=1`;
  } else {

    if (fromdate !== "" && todate !== "") {
      endpoint = `/GetBookeddetails?page=1&from_date=${fromdate}&to_date=${todate}`;
    } else {
      endpoint = `/GetBookeddetails?page=1`;
    }
 
  }

  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: endpoint,
    })
      .then((result) => {
        setBookedlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setStatus(status);
        // setStatuscount(result.data.statuscount);
        dispatch({
          type: "MEETING_ROOM_APPROVAL_LIST",
          bookedlist:result.data.data.data,
          totpagecount:result.data.pagination.last_page,
          status:status,
          statuscount:result.data.statuscount,
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
  setTotalpagecount,
  setStatuscount
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

  return async (dispatch, getState) => {
    await API.call({
      method: "get",
      url: endpoint,
    })
      .then((result) => {
        setBookedlist(result.data.data.data);
        setTotalpagecount(result.data.pagination.last_page);
        setStatuscount(result.data.statuscount);

        dispatch({
          type: "MEETING_ROOM_APPROVAL_LIST",
          bookedlist:result.data.data.data,
          statuscount:result.data.statuscount,
          totpagecount:result.data.pagination.last_page,
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
            endpoint = `/GetBookeddetails?page=${page}&from_date=${fromdate}&to_date=${todate}`;
        } else {
            endpoint = `/GetBookeddetails?page=${page}`;
        }
      }

      return async (dispatch, getState) => {
        await API.call({
          method: "get",
          url: endpoint,
        })
          .then((result) => {
            setBookedlist(result.data.data.data);
            setTotalpagecount(result.data.pagination.last_page);
            dispatch({
              type: "MEETING_ROOM_APPROVAL_LIST",
              bookedlist:result.data.data.data,
              totpagecount:result.data.pagination.last_page,
              statuscount:result.data.statuscount,
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
      };
}
