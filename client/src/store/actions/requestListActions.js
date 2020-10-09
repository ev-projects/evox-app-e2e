import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";



// Fetch Request List
export const fetchRequestList = ( page,data = null ) => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/my-team-requests",
            params : data
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_REQUEST_LIST_SUCCESS', 
                'requestList'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Reset Change Schedule Instance
export const resetRequestList = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_REQUEST_LIST'
        })
    }
}

// Reset Change Schedule Instance
export const paginateRequestList = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_CHANGE_SCHEDULE_INSTANCE'
        })
    }
}
