import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

/**
 *  A dedicated repository of Actions for Alter Log
 */


// Add Alter Log Request
export const addAlterLog = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/alter_log",
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


// Update Alter Log Request
export const updateAlterLog = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "put",
            url: "/request/alter_log/" + id,
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


export const fetchAlterLog = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/alter_log/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_ALTER_LOG_SUCCESS', 
                'alterLog'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

