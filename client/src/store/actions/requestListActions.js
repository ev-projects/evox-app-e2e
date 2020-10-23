import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";



// Fetch Request List
export const fetchRequestList = ( data = null ) => {
    console.log(data);
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/request-list",
            params : data
        })
        .then(result => {
            console.log(result.data);
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





export const resetRequestListInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_REQUEST_LIST'
        })
    }
}


