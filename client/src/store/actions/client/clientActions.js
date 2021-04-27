import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// BIRTHDAY ANNIV
export const birthdayAnniv = ( params = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/birthday_anniversary",
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
export const teamAttendanceStatus = ( params = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/team_attendance",
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
export const teamAttendanceSummary = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/"+ id +"/get_team_attendance_summary",
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
export const thisMonthHoliday = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/holidays",
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


