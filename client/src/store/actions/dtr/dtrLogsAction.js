import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Fetch Request List
export const fetchDtrLogs = ( data = null ) => {
    console.log(data);
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/dtr_logs/team",
            params : data
        })
        .then(result => {
        
            dispatch({
                'type'      : 'FETCH_DTR_LOGS_SUCCESS', 
                'dtrSummary'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const exportDtrLogs = ( data = null ) => {
    return (dispatch, getState) => {
        API.export({
            method: "get",
            url: "/report/dtr_logs/export",
            params : data
        })
        .then(result => {
            var fileURL = window.URL.createObjectURL(new Blob([result.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', 'dtr_summary.csv');
            document.body.appendChild(fileLink);
            fileLink.click();
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}




