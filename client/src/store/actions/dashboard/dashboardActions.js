import axios from "axios";
import API from "../../../services/API";
import APICALL from "../../../services/APICALL";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";





export const getDashboardOverall = (page_type,params = null) => { 
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/get_dashboard_all/"+page_type,
            params: params,
        })
        .then(result => {
            console.log(result);
            console.log(result.data);
            console.log(result.data.data);

                if(page_type == 1){


                dispatch({
                        type: "DASHBOARD_HOLIDAY",
                        dashboardholiday: result.data.data.dashboardholiday,
                    });
                
    
                    console.log(result.data.data.todayleaves)
                    dispatch({
                        type: "TODAY_LEAVES",
                        todayleaves: result.data.data.todayleaves,
                    });
                
        
                    console.log(result.data.data.tommorowleaves)
                    dispatch({
                        type: "TOMMOROW_LEAVES",
                        tommorowleaves: result.data.data.tommorowleaves,
                    });
                

                        dispatch({
                        type: "ALTER_LOG_PENDING",
                        alterrequest: result.data.data.status_numbers.team_alterlogpending,
                        overtimerequest : result.data.data.status_numbers.team_overtimepending,
                        restdayrequest :result.data.data.status_numbers.team_restdayworkpending,
                        changeschedulerequest : result.data.data.status_numbers.team_changeschedulepending,
                
                
                        myalterrequest: result.data.data.status_numbers.alterlogpending,
                        myovertimerequest : result.data.data.status_numbers.overtimepending,
                        myrestdayrequest :result.data.data.status_numbers.restdayworkpending,
                        mychangeschedulerequest : result.data.data.status_numbers.changeschedulepending,
                        });
                    }
            if(page_type == 2){
                dispatch({
                    'type'  : 'FETCH_BIRTHDAY_ANNIVERSARY', 
                    'data'   : result.data.data.team_birthday
                })
            }
            if(page_type == 3){
                console.log(params);
                if (params !== null && params.page !== undefined && params.page !== null) {
                    dispatch({
                        'type'      : 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                        'list'      : result.data.data.announcements,
                    })
                  }else{
                    dispatch({
                        'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                        'list'      : result.data.data.announcements,
                    })
                    dispatch({
                        'type'      : 'FETCH_DEPARTMENT_LIST_SUCCESS',
                        'list'      : result.data.data.departments,
                    })
                  }
               
            }
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// BIRTHDAY ANNIV
export const getMyDtrNotifications = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/my_dtr_notifications",
        })
        .then(result => {
            
            dispatch({
                'type'  : 'FETCH_MY_DTR_NOTIFICATIONS', 
                'data'   : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// BIRTHDAY ANNIV
export const getBirthdayAnniv = ( params = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/team_birthday_anniversary",
            params    : params
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_BIRTHDAY_ANNIVERSARY', 
                'data'   : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// TEAM ATTENDANCE STATUS
export const getTeamAttendanceStatus = ( params = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/team_attendance",
            params    : params
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_TEAM_ATTENDANCE_STATUS', 
                'data'      : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// HOLIDAY
export const getThisMonthHoliday = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/holidays",
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_HOLIDAYS', 
                'data'   : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const getRecentDtr = ( user_id, from ,to ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_RECENT_DTR', 
                'recent_dtr'      : result.data.content.dtr_records,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const getRecentPunches = ( user_id, from ,to ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/punch/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_RECENT_PUNCH', 
                'data'      : result.data,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const getRecentPunches2 = ( user_id, from ,to ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/punch/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_SINGLE_PUNCH_SUCCESS', 
                'data'      : result.data,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const clearRecentPunches2 = () => {
 
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_SINGLE_PUNCH_SUCCESS'
        })
    }
    
    
}

// CHANGE LOGS
export const getChangeLogs = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/changelogs",
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_CHANGE_LOGS',
                'data'   : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
    }
}

export const clearRecentDtrInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_RECENT_DTR_INSTANCE'
        })
    }
}

// BIRTHDAY ANNIV
export const getMyNotifications = (user_id) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/get_redis_notifications/"+user_id,
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_MY_NOTIFICATIONS',
                'data'   : result.data
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) )
        });
       
        // axios({
        //     method: 'get',
        //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        //     url: process.env.REACT_APP_API_BASE_URL+`/cache/${user_id}`, // Using template literals for clarity
        //   })
        //     .then(result => {
        //       dispatch({
        //         type: 'FETCH_MY_NOTIFICATIONS',
        //         data: result.data, // Ensure you're dispatching the correct data structure
        //       });
        //       let approvalcount = result.data.requestsForApproval.length;
        //       let requestcount = result.data.requestStatus.length;
        //       let announcementcount = result.data.announcements.length
        //       let celebrationcount = result.data.celebrations.length
        //       let missingdtr = result.data.missedDtr.length

        //       dispatch({
        //         type: 'FETCH_MY_NOTIFICATIONS_COUNT',
        //         approval: approvalcount + requestcount,
        //         announcement: announcementcount,
        //         celebration: celebrationcount,
        //         missingdtr: missingdtr,
        //         alldata: (approvalcount + requestcount + announcementcount + celebrationcount + missingdtr),
        //       });
        //     })
        //     .catch(error => {
        //       if (error.response) {
        //         // The request was made and the server responded with a status code
        //         // that falls out of the range of 2xx
        //         if (error.response.status === 404) {
        //             dispatch({
        //                 type: 'FETCH_MY_NOTIFICATIONS',
        //                 data:  {

        //                     "requestsForApproval": [],
                        
        //                     "requestStatus": [],
                        
        //                     "announcements": [],
                        
        //                     "celebrations": [],
                        
        //                     "missedDtr": []
                        
        //                 }
        //                  , // Ensure you're dispatching the correct data structure
        //               });
                   
        //           console.log("Resource not found (404):", error.response.data);
        //         //   dispatch(Formatter.alert_error("Resource not found!"));
        //         } else {
        //           console.log("Error:", error.response.data);
        //         //   dispatch(Formatter.alert_error("An error occurred while fetching notifications."));
        //         }
        //       } else if (error.request) {
        //         // The request was made but no response was received
        //         console.log("No response received:", error.request);
        //         // dispatch(Formatter.alert_error("No response from server."));
        //       } else {
        //         // Something happened in setting up the request that triggered an Error
        //         console.log("Error setting up request:", error.message);
        //         // dispatch(Formatter.alert_error("Error in request setup."));
        //       }
        //     });
    }
}

