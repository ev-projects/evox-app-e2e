import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';

/**
 *  A dedicated repository of Actions for Job Openings
 */

// Fetch Job Openings
export const fetchJobOpenings = ( ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/careers/",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_CAREERS_SUCCESS',
                'list'      : result.data.content,
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Import Job Openings
export const importJobOpening = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/careers/",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.dashboard
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}