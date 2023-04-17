import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';

/**
 *  A dedicated repository of Actions for User List 
 */


// Fetch User List base on Role
export const fetchUserList = ( role, params ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/role/"+ role +"/users",
            params : params
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_USER_LIST_SUCCESS',
                'list'      : result.data.content,
                'role'      : role
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch the Teams Handled via User ID
export const fetchTeamsHandledList = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/" + id + "/teams_handled"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_TEAMS_HANDLED_LIST_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



// Fetch the Teams Details via ID
export const fetchTeam = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/team/" + id
        })
        .then(result => {
            
            dispatch({
                'type'          : 'FETCH_TEAM_SUCCESS',
                'instance'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch Role List
export const fetchRoleList = () => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/roles",
        })
        .then(result => {
            dispatch({
                'type'     : 'FETCH_ROLE_LIST_SUCCESS', 
                'list'     : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch Department List
export const fetchDepartmentList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/all"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_LIST_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchDepartmentListWithAnnouncements = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/all_with_announcements"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_LIST_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch the Department Handlers List via Department ID
export const fetchDepartmentHandlersList = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/" + id + "/department_handlers"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch the Department Users List via Department ID
export const fetchDepartmentUsersList = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/" + id + "/users"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_USERS_LIST_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const fetchEmployeesClientUserLists = ( client_id , department_id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/client/" + client_id + "/" + department_id + "/users"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_EMPLOYEES_CLIENT_USERS_LIST_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}




