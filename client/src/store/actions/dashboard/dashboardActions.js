import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";





export const getDashboardOverall = (page_type) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/get_dashboard_all/"+page_type,
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
                dispatch({
                    'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                    'list'      : result.data.data.announcements,
                })
                dispatch({
                    'type'      : 'FETCH_DEPARTMENT_LIST_SUCCESS',
                    'list'      : result.data.data.departments,
                })
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

