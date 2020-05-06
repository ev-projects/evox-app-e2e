import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

/**
 *  A dedicated repository of Actions for Overtime
 */


// Add Overtime Request
export const addOvertime = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/overtime",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Update Overtime Request
export const updateOvertime = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "put",
            url: "/request/overtime/" + id,
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchOvertime = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/overtime/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_OVERTIME_SUCCESS', 
                'overtime'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

