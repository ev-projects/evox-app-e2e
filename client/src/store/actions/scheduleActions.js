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


export const getDefaultSchedule = () => {
    
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/1/default_schedule/",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_DEFAULT_SCHEDULE_SUCCESS', 
                'schedule'   : result.data.content,
            })

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
