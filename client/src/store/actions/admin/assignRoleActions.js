
import API from "../../../services/API";
import Formatter from "../../../services/Formatter";



// Fetch Roles
export const fetchRoles = (  ) => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/admin-access/roles",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_ROLES', 
                'roles'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch User Role
export const fetchUserRole = ( id ) => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/"+ id +"/role",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_USER_ROLE', 
                'userRole'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchUser = ( name_string ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/admin-access/search-user/" + name_string,
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_USER', 
                'userLists'  : result.data.content 
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const assignRole = ( id , post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "POST",
            url: "/user/" + id + "/assign_roles_permissions/",
            data: post_data
        })
        .then(result => {
           
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

