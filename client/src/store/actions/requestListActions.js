import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";



// Fetch Request List
export const fetchRequestList = ( data = null , status_numbers = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/request-list",
            params : data
        })
        .then(result => {
            if (status_numbers === null){
                dispatch({
                    'type'      : 'FETCH_REQUEST_LIST_SUCCESS_INITIALLY', 
                    'requestList'  : result.data.content
                })
            }else{
                dispatch({
                    'type'      : 'FETCH_REQUEST_LIST_SUCCESS', 
                    'requestList'  : result.data.content,
                    'statusNumbers'  : status_numbers,
                })
            }
            
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

//  fetch the request status numbers
export const fetchStatusNumbers = ( params , requestList ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/request-numbers",
            params : params
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_REQUEST_STATUS_NUMBERS', 
                'statusNumbers'  : result.data.content.status_numbers,
                'requestList'  : requestList,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// actions for the bulk update of the requests
export const bulkRequest = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/bulk-request/",
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






