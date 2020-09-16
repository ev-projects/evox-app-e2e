import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";


import { setRedirect, clearRedirect } from './redirectActions';

/**
 *  A dedicated repository of Actions for Change Schedule
 */


// Add Change Schedule Request
export const addChangeSchedule = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/change_schedule",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.dashboard_url
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Update Change Schedule Request
export const updateChangeSchedule = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/change_schedule/" + id,
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.dashboard_url
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Update Change Schedule Status Request
export const updateChangeScheduleStatus = ( id, post_data, status ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/change_schedule/"+ status + "/" + id,
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.dashboard_url
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch Change Schedule instance
export const fetchChangeSchedule = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/change_schedule/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_CHANGE_SCHEDULE_SUCCESS', 
                'changeSchedule'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear Change Schedule Instance
export const clearChangeScheduleInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_CHANGE_SCHEDULE_INSTANCE'
        })
    }
}

// Reset Change Schedule Instance
export const resetChangeScheduleInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_CHANGE_SCHEDULE_INSTANCE'
        })
    }
}

