import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";

// Fetch Request List
export const fetchRequestList = (params = null) => {
  return (dispatch, getState) => {
    var dispatch_commands = {};
    var dispatch_commands2;
    if (params.url == "my_team_requests") {
      dispatch_commands = {
        set_filters: "SET_MY_TEAM_REQUEST_LIST_FILTERS",
        fetch_list: "FETCH_MY_TEAM_REQUEST_LIST_SUCCESS",
      };
    } else {
      dispatch_commands = {
        set_filters: "SET_MY_REQUEST_LIST_FILTERS",
        fetch_list: "FETCH_MY_REQUEST_LIST_SUCCESS",
      };
    }

    if (params.url == "my_team_requests") {
      dispatch_commands2 = "FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS";
    } else {
      dispatch_commands2 = "FETCH_MY_REQUEST_STATUS_NUMBERS";
    }

    dispatch({
      type: dispatch_commands.set_filters,
      filters: params,
    });

    API.call({
      method: "get",
      url: "/request/request-list",
      params: params,
    })
      .then((result) => {

        console.log();
        dispatch({
          type: dispatch_commands.fetch_list,
          requestList: result.data.content,
        });

        if (params.url == "my_team_requests") {
          dispatch({
            type: "FETCH_MY_TEAM_REFRESH_DEP_LIST",
            content: result.data.content,
          });
        }
        
        if(params.url == "my_team_requests"){
          dispatch({
            type: dispatch_commands2,
            statusNumbers: result.data.content.result.status_numbers,
          });
        }
      
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));  
      });
  };
};

//  fetch the request status numbers
export const fetchStatusNumbers = (params) => {
  return (dispatch, getState) => {
    var dispatch_commands;

    if (params.url == "my_team_requests") {
      dispatch_commands = "FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS";
    } else {
      dispatch_commands = "FETCH_MY_REQUEST_STATUS_NUMBERS";
    }

    API.call({
      method: "get",
      url: "/request/request-numbers",
      params: params,
    })
      .then((result) => {
        dispatch({
          type: dispatch_commands,
          statusNumbers: result.data.content.status_numbers,
        });
        dispatch({
          'type'      : 'EVENT_CLICK', 
          'requesttype'   :  params.request_type,
      })
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

// Fetch request list disputes
export const fetchRequestListDisputes = (params = null) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: "/request/request-list-disputes",
      params: params,
    })
      .then((result) => {
        if (result.status === 200) {
          dispatch({
            type: "FETCH_MY_DISPUTE_REQUEST_LIST_SUCCESS",
            disputeRequestList: result.data.content.dispute_list,
            disputeRequestCount: result.data.content.dispute_count,
          });
        }

      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

//  fetch the Pending MyRequest Count
export const myfetchStatusNumbers_dashboard = (
    setMyaltercount,setMyOvertimecount,setMyRestdayworkcount,setMyChangeschedulecount,setTaskcompletestatus1
) => {
  return (dispatch, getState) => {
    // var dispatch_commands;
    // dispatch_commands = "FETCH_MY_REQUEST_STATUS_NUMBERS";

    // API.call({
    //   method: "get",
    //   url: "/request/request-numbers_dashboard",
    //   params: {
    //     url: "my_requests",
    //     status: "pending",
    //     page: "1",
    //     request_type: "all",
    //     first_load: true,
    //   },
    // })
    //   .then((result) => {
    //     setMyaltercount(result.data.content.status_numbers.alterlogpending);
    //     setMyOvertimecount(result.data.content.status_numbers.overtimepending);
    //     setMyRestdayworkcount(result.data.content.status_numbers.restdayworkpending);
    //     setMyChangeschedulecount(result.data.content.status_numbers.changeschedulepending);
    //     setTaskcompletestatus1(true);
    //     dispatch({
    //       type: "MY_ALTER_LOG_PENDING",
    //       myalterrequest: result.data.content.status_numbers.alterlogpending,
    //       myovertimerequest : result.data.content.status_numbers.overtimepending,
    //       myrestdayrequest :result.data.content.status_numbers.restdayworkpending,
    //       mychangeschedulerequest : result.data.content.status_numbers.changeschedulepending,
    //     });
    //   })
    //   .catch((e) => {
    //     dispatch(Formatter.alert_error(e));
    //   });
  };
};


//  fetch the Today Leaves List For Dashborad
export const get_today_leaves = (
  setTodayleaves
) => {
return (dispatch, getState) => {
  var dispatch_commands;
  dispatch_commands = "FETCH_MY_REQUEST_STATUS_NUMBERS";

  API.call({
    method: "get",
    url: "/Gettodayleaves",
  })
    .then((result) => {
      setTodayleaves(result.data.data);
      console.log(result.data.data)
      dispatch({
        type: "TODAY_LEAVES",
        todayleaves: result.data.data,
      });
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
};
};

//  fetch the Tommorow Leave List
export const get_tommrow_leaves = (
  setTommrowleaves
) => {
return (dispatch, getState) => {
  var dispatch_commands;
  dispatch_commands = "FETCH_MY_REQUEST_STATUS_NUMBERS";

  API.call({
    method: "get",
    url: "/Gettommorowleaves",
  })
    .then((result) => {
      setTommrowleaves(result.data.data);
      console.log(result.data.data)
      dispatch({
        type: "TOMMOROW_LEAVES",
        tommorowleaves: result.data.data,
      });
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
};
};

//  fetch the Holidays
export const get_dashboard_holiday = (
  setHoliday,start_date,end_date
) => {
return (dispatch, getState) => {


  API.call({
    method: "get",
    url: "/report/get_dashboard_holiday",
    params: {
      start_date: start_date,
      end_date: end_date,
    },
  })
    .then((result) => {
      setHoliday(result.data);
      console.log(result.data)
      dispatch({
        type: "DASHBOARD_HOLIDAY",
        dashboardholiday: result.data,
      });
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
};
};

// Fecth Pending AllRequest Count For Dashboard
export const fetchStatusNumbers_dashboard = (
    setaltercount,setOvertimecount,setRestdayworkcount,setChangeschedulecount,
    setMyaltercount,setMyOvertimecount,setMyRestdayworkcount,setMyChangeschedulecount,
    
    setTaskcompletestatus
) => {
  return (dispatch, getState) => {
    var dispatch_commands;
    dispatch_commands = "FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS";

    API.call({
      method: "get",
      url: "/request/request-numbers_dashboard",
      params: {
        url: "my_team_requests",
        status: "pending",
        page: "1",
        request_type: "all",
        first_load: true,
      },
    })
      .then((result) => {
        setaltercount(result.data.content.status_numbers.team_alterlogpending);
        setOvertimecount(result.data.content.status_numbers.team_overtimepending);
        setRestdayworkcount(result.data.content.status_numbers.team_restdayworkpending);
        setChangeschedulecount(result.data.content.status_numbers.team_changeschedulepending);

        setMyaltercount(result.data.content.status_numbers.alterlogpending);
        setMyOvertimecount(result.data.content.status_numbers.overtimepending);
        setMyRestdayworkcount(result.data.content.status_numbers.restdayworkpending);
        setMyChangeschedulecount(result.data.content.status_numbers.changeschedulepending);

        setTaskcompletestatus(true);
        dispatch({
          type: "ALTER_LOG_PENDING",
          alterrequest: result.data.content.status_numbers.team_alterlogpending,
          overtimerequest : result.data.content.status_numbers.team_overtimepending,
          restdayrequest :result.data.content.status_numbers.team_restdayworkpending,
          changeschedulerequest : result.data.content.status_numbers.team_changeschedulepending,


          myalterrequest: result.data.content.status_numbers.alterlogpending,
          myovertimerequest : result.data.content.status_numbers.overtimepending,
          myrestdayrequest :result.data.content.status_numbers.restdayworkpending,
          mychangeschedulerequest : result.data.content.status_numbers.changeschedulepending,
        });
       console.log()
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

// actions for the bulk update of the requests
export const bulkRequest = (post_data) => {
  return (dispatch, getState) => {
    API.call({
      method: "post",
      url: "/request/bulk-request/",
      data: post_data,
    })
      .then((result) => {
        dispatch(Formatter.alert_success(result));
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const eventclick = (requesttype) => {

  return (dispatch, getState) => {
    
      dispatch({
          type      : 'EVENT_CLICK', 
          requesttype   :  requesttype,
      })

     
  }
}

export const eventclick1 = (requesttype) => {


    return (dispatch, getState) => {
      
        dispatch({
            type      : 'EVENT_CLICK', 
            requesttype   :  requesttype,
        })
  
       
    }
  }

  export const payrollperiod = (requesttype) => {


    return (dispatch, getState) => {
      
      dispatch({
        type      : 'FETCH_PAYROLL_PERIOD', 
        payroll  : requesttype
        })  
       
    }
  }
