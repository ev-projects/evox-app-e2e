import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../../actions/redirectActions';
import { fetchRequestList, fetchStatusNumbers } from "../filters/requestListActions";
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions';

/**
 *  A dedicated repository of Actions for OpsSchedule
 */

// Add OpsSchedule Record
export const addOpsSchedule = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/opsschedule",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.ops_schedule
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch OpsSchedule List
export const fetchOpsSchedulesList = ( dept_id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/opsschedule/list/" + dept_id
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_OPSSCHEDULES_SUCCESS', 
                'list'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch OpsSchedule List
export const fetchOpsSchedules = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/opsschedule" 
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_OPSSCHEDULES_SUCCESS', 
                'list'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch OpsSchedule Instance
export const fetchOpsSchedule = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/opsschedule/show/" + id
        })
        .then(result => {
            dispatch({
                'type' : 'FETCH_OPSSCHEDULE_SUCCESS',
                'data' : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Update OpsSchedule
export const updateOpsSchedule = ( ops_sched_id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/opsschedule/" + ops_sched_id,
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.ops_schedule
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Delete OpsSchedule
export const deleteOpsSchedule = ( ops_sched_id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/opsschedule/" + ops_sched_id
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.ops_schedule
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear OpsSchedule Instance
export const clearOpsScheduleInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_OPSSCHEDULE_INSTANCE'
        })
    }
}

// Reset OpsSchedule Instance
export const resetOpsScheduleInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_OPSSCHEDULE_INSTANCE'
        })
    }
}







