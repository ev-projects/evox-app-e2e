import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";






// BIRTHDAY ANNIV
export const getDtrNotifications = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/report/dtr_notifications",
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_DTR_NOTIFICATIONS', 
                'data'   : result.data
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
            url: "/dtr/report/team_birthday_anniversary",
            params    : params
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_BIRTHDAY_ANNIVERSARY', 
                'data'   : result.data
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
            url: "/dtr/report/team_attendance",
            params    : params
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_TEAM_ATTENDANCE_STATUS', 
                'data'      : result.data,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// TEAM ATTENDANCE SUMMARY
export const getTeamAttendanceSummary = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/report/team_attendance_summary",
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_TEAM_ATTENDANCE_SUMMARY', 
                'data'   : result.data
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
            url: "/dtr/report/holidays",
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_HOLIDAYS', 
                'data'   : result.data
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
            url: "/dtr/report/team_attendance",
            url: "/dtr/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_RECENT_DTR', 
                'data'      : result.data,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}
