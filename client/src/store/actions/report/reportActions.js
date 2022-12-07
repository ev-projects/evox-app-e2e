import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


// TEAM ATTENDANCE SUMMARY

export const setSelectedAttendanceSummary = (data) => {
    return {
        type: "SET_SELECTED_ATTENDACE_SUMMARY",
        payload: data
    }
}

export const exportAttendanceSummary = (start_date, end_date, params) => {
   

    return (dispatch, getState) => {
        API.export({
            method: "get",
            url: "/report/attendance/summary/export/" + start_date.format("YYYY-MM-DD") + "/" + end_date.format("YYYY-MM-DD"),
            params: params  
        })
        .then(result => {
            
            var fileURL = window.URL.createObjectURL(new Blob([result.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;

            // console.log(params,result.data.content);
            fileLink.setAttribute('download', 'Attendance_report.xlsx');
            document.body.appendChild(fileLink);
            fileLink.click();
            })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const getTeamAttendanceSummary = (start_date, end_date, params) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/team_attendance_summary/" + start_date.format("YYYY-MM-DD") + "/" + end_date.format("YYYY-MM-DD"),
            params: params
        })
            .then(result => {
                dispatch({
                    'type': 'FETCH_TEAM_ATTENDANCE_SUMMARY',
                    'data': result.data.content
                })
            })
            .catch(e => {
                dispatch(Formatter.alert_error(e))
            });
    }
}

