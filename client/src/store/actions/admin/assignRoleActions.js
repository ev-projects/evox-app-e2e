
import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


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
            url: "/user/search-user/" + name_string,
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
           
            dispatch( Formatter.alert_success( result, 3000 ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

