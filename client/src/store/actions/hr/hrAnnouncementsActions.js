import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';

/**
 *  A dedicated repository of Actions for HrAnnouncements
 */



// }

// Fetch Announcements
export const fetchHrAnnouncements = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/hr/announcements/all"
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_HR_ANNOUNCEMENTS_LIST_SUCCESS', 
                'list'      : result.data.content
            });
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch Announcement
export const fetchHrAnnouncement = (id) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/hr/announcements/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_HR_ANNOUNCEMENT_SUCCESS', 
                'list'      : result.data.content
            });
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Add Announcements
export const addHrAnnouncements = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/hr/announcements" ,
            data: data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.dashboard
            });

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Update Announcements
export const updateHrAnnouncements = ( id, data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/hr/announcements/" + id ,
            data: data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.dashboard
            });

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Delete Announcements
export const deleteHrAnnouncement = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/hr/announcements/" + id
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.dashboard
            });
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear HR Announcement Instance
export const clearHrAnnouncementInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_HR_ANNOUNCEMENT_INSTANCE'
        })
    }
}