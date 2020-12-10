import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Fetch Request List
export const fetchRequestList = ( params = null , status_numbers = null ) => {

    return (dispatch, getState) => {

        var dispatch_commands = {};

        if( params.url == "my_team_requests" ){
            dispatch_commands = {
                set_filters          : 'SET_MY_TEAM_REQUEST_LIST_FILTERS',
                fetch_list_initially : 'FETCH_MY_TEAM_REQUEST_LIST_SUCCESS_INITIALLY',
                fetch_list           : 'FETCH_MY_TEAM_REQUEST_LIST_SUCCESS'
            }
        } else {
            dispatch_commands = {
                set_filters          : 'SET_MY_REQUEST_LIST_FILTERS',
                fetch_list_initially : 'FETCH_MY_REQUEST_LIST_SUCCESS_INITIALLY',
                fetch_list           : 'FETCH_MY_REQUEST_LIST_SUCCESS'
            }
        }

        dispatch({
            'type'     : dispatch_commands.set_filters, 
            'filters'  : params
        });

        API.call({
            method: "get",
            url: "/request/request-list",
            params : params
        })
        .then(result => {
            if (status_numbers === null){
                dispatch({
                    'type'          : dispatch_commands.fetch_list_initially, 
                    'requestList'   : result.data.content
                })
            }else{
                dispatch({
                    'type'      : dispatch_commands.fetch_list, 
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
        
        var dispatch_commands = {};

        if( params.url == "my_team_requests" ){
            dispatch_commands = {
                fetch_status_numbers          : 'FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS',
            }
        } else {
            dispatch_commands = {
                fetch_status_numbers          : 'FETCH_MY_REQUEST_STATUS_NUMBERS',
            }
        }

        API.call({
            method: "get",
            url: "/request/request-numbers",
            params : params
        })
        .then(result => {
            dispatch({
                'type'      : dispatch_commands.fetch_status_numbers, 
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






