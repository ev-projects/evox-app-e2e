import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";

/**
 *  A dedicated repository of Actions for Profile
 */

export const fetchProfile = ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/profile"
        })
        .then(result => {
            
            dispatch({
                'type'               : 'FETCH_PROFILE',
                'user'               : result.data.content.user,
                'profile_picture'    : result.data.content.profile_picture,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const updateUserProfile = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/" + id + "/profile",
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

export const fetchPersonalInformation = ( id ) => {
    return (dispatch, getState) => {
        
        API.call({
            method: "get",
            url: "/user/" + id + "/personal_information"
        })
        .then(result => {
            
            dispatch({
                'type'                      : 'FETCH_PERSONAL_INFORMATION',
                'personal_information'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchJobInformation= ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/job_information"
        })
        .then(result => {
            
            dispatch({
                'type'              : 'FETCH_JOB_INFORMATION',
                'job_information'   : result.data.content.job_information,
                'employment_status' : result.data.content.employment_status
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchTimeOff = ( id, start_date, end_date ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/time_off/" + start_date.format("YYYY-MM-DD") + "/" + end_date.format("YYYY-MM-DD")
        })
        .then(result => {

            dispatch({
                'type'              : 'FETCH_TIME_OFF',
                'leaves_list'       : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



export const fetchLeaveCredits = ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/leave_credits/"
        })
        .then(result => {

            dispatch({
                'type'              : 'FETCH_LEAVE_CREDITS',
                'leave_credits'     : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const changePassword = ( id, formData ) => {

    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/" + id + "/change_password",
            data: formData
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));
            
            dispatch({
                'type'              : 'CLOSE_ALL_FORM'
            })

            if( formData.reset_password ){

                dispatch({
                    'type'      : 'TOGGLE_FORCE_CHANGE_PASSWORD'
                })
                
            }
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const tickDpa = ( id ) => {

    return (dispatch, getState) => {
        
        API.call({
            method: "post",
            url: "/user/" + id + "/tick_dpa"
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({'type'      : 'TICK_DPA' });
            
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

