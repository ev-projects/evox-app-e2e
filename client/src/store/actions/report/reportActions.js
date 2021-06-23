import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


// TEAM ATTENDANCE SUMMARY

export const setSelectedAttendanceSummary = (data) => {
    return {
        type:"SET_SELECTED_ATTENDACE_SUMMARY",
        payload : data
    }
}

export const getTeamAttendanceSummary = ( start_date, end_date, params ) => {
    
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/team_attendance_summary/" + start_date.format("YYYY-MM-DD") + "/" + end_date.format("YYYY-MM-DD"),
            params: params
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_TEAM_ATTENDANCE_SUMMARY', 
                'data'   : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

