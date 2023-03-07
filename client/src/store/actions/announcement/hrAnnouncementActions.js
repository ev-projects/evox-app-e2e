import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';




export const createHrAnnouncement = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/department/announcements/create " ,
            headers: { 
                "Content-Type": "multipart/form-data",
            },
            data: data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.manage_hr_announcements
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const updateHrAnnouncement = ( id, data ) => {
    console.log(data);
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/department/announcements/hr/" + id +"/update",
            data: data,
            headers: { 
                "Content-Type": "multipart/form-data",
            },
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.department_announcement_list
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchHrAnnouncement = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/"+ id ,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS', 
                'announcement'  : result.data.content
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchHrAnnouncementStrict = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/strict/"+ id ,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS', 
                'announcement'  : result.data.content
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



export const fetchHrAnnouncementList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/all"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchDashboardAnnouncementList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/dashboard_departments"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchHrHandleAnnouncementList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/hr/all"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const deleteHrAnnouncement = (id) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/department/announcements/hr/"+id+"/"
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const clearHrAnnouncementInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE'
        })
    }
}