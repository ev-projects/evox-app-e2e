import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";

/**
 *  A dedicated repository of Actions for Profile
 */

 export const setDateList = ( date_list ) => {
    return (dispatch, getState) => {

        dispatch({
            'type'               : 'SET_DATE_LIST',
            'date_list'          : date_list,
        })
    }
}

export const setEmpSchedule = ( emp_sched ) => {
    return (dispatch, getState) => {

        dispatch({
            'type'               : 'SET_EMP_SCHEDULE',
            'emp_sched'          : emp_sched,
        })
    }
}

export const setScope = ( scope ) => {
    return (dispatch, getState) => {

        dispatch({
            'type'               : 'SET_SCOPE',
            'scope'              : scope,
        })
    }
}

export const setWeekList = ( data ) => {
    return (dispatch, getState) => {

        dispatch({
            'type'               : 'SET_WEEK_LIST',
            'data'               : data,
        })
    }
}


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

export const fetchSchedule = ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/default_schedule/"
        })
        .then(result => {

            dispatch({
                'type'              : 'FETCH_SCHEDULE',
                'schedule'     : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchScheduleHistory = ( id, params = null ) => {
    return (dispatch, getState) => {

        // dispatch({
        //     'type'     : 'SET_MY_TEAM_LIST_FILTERS', 
        //     'filters'  : params
        // })

        API.call({
            method: "get",
            url: "/user/" + id + "/schedule_history/",
            params : params
        })
        .then(result => {

            dispatch({
                'type'              : 'FETCH_SCHEDULE_HISTORY',
                'schedule_history'     : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchTemporarySchedule = ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/temporary_schedules/"
        })
        .then(result => {

            dispatch({
                'type'              : 'FETCH_TEMPORARY_SCHEDULE',
                'schedule'     : result.data.content,
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
            dispatch({
                'type'              : 'CLOSE_ALL_FORM'
            })
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
            // dispatch({
            //     'type'              : 'CLOSE_ALL_FORM_FALSE'
            // })
        });
    }
}


export const tickDpa = ( id ) => {

    return (dispatch, getState) => {
        
        API.call({
            method: "post",
            url: "/user/" + id + "/tick_dpa",
            data: {'session_id' : localStorage.getItem('session_id')}
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

