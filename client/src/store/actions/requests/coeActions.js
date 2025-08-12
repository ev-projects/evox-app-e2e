import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../../actions/redirectActions';
import { fetchRequestList, fetchStatusNumbers } from "../filters/requestListActions";

/**
 *  A dedicated repository of Actions for Overtime
 */


// Add Overtime Request
export const addCOE = ( post_data ) => {
    return (dispatch, getState) => {
        API.export({
            method: "post",
            url: "/request/coe",
            data: post_data
        })
        .then(result => {
            dispatch(fetchCOE());
            dispatch({
                'type'      : 'REQUEST_COE_SUCCESS',
                'data'      : result.data
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch COE Request
export const fetchCOE = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/coe/"
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_COE_SUCCESS', 
                'coe'       : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}






