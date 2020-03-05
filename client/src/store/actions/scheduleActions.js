import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

/**
 *  A dedicated repository of Actions for Schedules
 */


// Add Template
export const addTemplateSchedule = ( post_data ) => {
    
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/schedule",
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


export const getDefaultSchedule = (employee_id) => {
    
    return (dispatch, getState) => {

        // Sets the isReloading to True to current state while reloading the page.
        dispatch({'type': 'RELOAD_START'});
        
        API.call({
            method: "get",
            url: "/user/"+employee_id+"/default_schedule/",
        })
        .then(result => {

            dispatch({
                'type'      : 'FETCH_DEFAULT_SCHEDULE_SUCCESS', 
                'schedule'   : result.data.content
            })

            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( API.format( e.response ) ) ) 
        });
    }
}


export const scheduleAssign = (post_data) => {
    
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/schedule/assign/",
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
