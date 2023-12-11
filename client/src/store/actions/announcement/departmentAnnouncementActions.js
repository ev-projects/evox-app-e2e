import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';




export const createDepartmentAnnouncement = ( data ) => {
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
                'link'      : global.links.department_announcement_list
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const updateDepartmentAnnouncement = ( id, data ) => {
    console.log(data);
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/department/announcements/my_handle_announcements/" + id +"/update",
            data: data,
            headers: { 
                "Content-Type": "multipart/form-data",
            },
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            

            if(data.get("previousPath" ) != null && data.get("previousPath" ) == "AdminAnnouncementList" ){
                dispatch({
                    'type'      : 'SET_REDIRECT',
                    'link'      : global.links.admin_announcement_list
                })
            }
            else{
                dispatch({
                    'type'      : 'SET_REDIRECT',
                    'link'      : global.links.department_announcement_list
                })
            }
           
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchDepartmentAnnouncement = ( id ) => {
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

export const fetchDepartmentAnnouncementStrict = ( id ) => {
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


    // used only by admin
export const fetchDepartmentAnnouncementList = (params = null) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/all",
            params: params
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

export const fetchDashboardAnnouncementList = (params = null) => {
    
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/dashboard_departments",
            params: params,
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

export const incrementDashboardAnnouncementList = (params = null) => {
    
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/increment_dashboard_departments",
            params: params,
        })
        .then(result => {
            
            dispatch({
                'type'      : 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchMyHandleAnnouncementList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/announcements/my_handle_announcements/all"
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


export const deleteDepartmentAnnouncement = (id) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/department/announcements/my_handle_announcements/"+id+"/"
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const clearDepartmentAnnouncementInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE'
        })
    }
}

export const clearDepartmentAnnouncementListInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE'
        })
    }
}