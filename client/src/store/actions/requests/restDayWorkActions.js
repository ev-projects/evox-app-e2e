import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../../actions/redirectActions';
import { fetchRequestList, fetchStatusNumbers } from "../filters/requestListActions";

/**
 *  A dedicated repository of Actions for Rest Day Work
 */


// Add Rest Day Work Log Request
export const addRestDayWork = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/rest_day_work",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            dispatch(fetchRequestList({
                status:           "pending",
                valid_from:       null,
                valid_to:         null,
                department_id:    null,
                name:             null,
                page:             1,
                checkedList:      [],
                isAll:            false,
                action:           null,
                request_type:     'all',
                bulk_action:      null,
                url:              'my_team_requests'
            }));


            dispatch(fetchStatusNumbers({
                status:           "pending",
                valid_from:       null,
                valid_to:         null,
                department_id:    null,
                name:             null,
                page:             1,
                checkedList:      [],
                isAll:            false,
                action:           null,
                request_type:     'all',
                bulk_action:      null,
                url:              'my_team_requests'
            }));

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


// Update Rest Day Work Log Request
export const updateRestDayWork = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/rest_day_work/" + id,
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


// Update Rest Day Work Status Request
export const updateRestDayWorkStatus = ( id, post_data, status ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/rest_day_work/"+ status + "/" + id,
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

// Fetch Rest Day Work instance
export const fetchRestDayWork = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/rest_day_work/" + id
        })
        .then(result => {
            dispatch({
                'type'          : 'FETCH_REST_DAY_WORK_SUCCESS', 
                'restDayWork'   : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear Rest Day Work Instance
export const clearRestDayWorkInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_REST_DAY_WORK_INSTANCE'
        })
    }
}

// Reset Rest Day Work Instance
export const resetRestDayWorkInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_REST_DAY_WORK_INSTANCE'
        })
    }
}

