import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";


/**
 *  A dedicated repository of Actions for Redirect
 */

 
//  Redirect Link
export const setRedirect = (link) => {
    
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'SET_REDIRECT',
            'link'      : ( link != null ) ? link : global.dashboard_url
        })
    }
}

// Clear Redirect Link
export const clearRedirect = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_REDIRECT'
        })
    }
}