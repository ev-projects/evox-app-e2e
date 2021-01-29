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


export const getDefaultSchedule = (bind_to, bind_id) => {
    
    return (dispatch, getState) => {

        // Sets the isReloading to True to current state while reloading the page.
        dispatch({'type': 'RELOAD_START'});
        
        API.call({
            method: "get",
            url: "/"+bind_to+"/"+bind_id+"/default_schedule/",
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


export const getTemplateSchedule = (template_id,type) => {
 
    var reducer_case = '';
    if(type=='Template'){
        reducer_case = 'FETCH_TEMPLATE_SCHEDULE_SUCCESS';
    }else if(type=='Default'){
        reducer_case = 'FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS';
    }

    return (dispatch, getState) => {
        dispatch({'type': 'RELOAD_START'});
        
        API.call({
            method: "get",
            url: "/schedule/"+template_id+"/",
        })
        .then(result => {
            dispatch({
                'type'      : reducer_case, 
                'templatedata'   : result.data.content
            })
            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( API.format( e.response ) ) ) 
        });
    }
}

export const updateSchedule = (post_data,sched_id) => {
    return (dispatch, getState) => {
        API.call({
            method: "put",
            url: "/schedule/"+sched_id+"/",
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

export const listTemplate = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/schedule/templates/",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_TEMPLATES_SCHEDULE_SUCCESS', 
                'template'   : result.data.content
            })
            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const deleteSchedule = (id) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/schedule/"+id+"/",
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
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
