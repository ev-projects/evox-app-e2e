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



// // Fetch Department User List base on Department ID
// export const fetchDepartmentUsers = ( department_id ) => {
//     return (dispatch, getState) => {
//         API.call({
//             method: "get",
//             url: "/department/"+ department_id +"/users"
//         })
//         .then(result => {
            
//             dispatch({
//                 'type'              : 'FETCH_DEPARTMENT_USER_LIST_SUCCESS',
//                 'department_id'     : department_id,
//                 'list'              : result.data.content,
//             })

//         })
//         .catch(e => {
//             dispatch( Formatter.alert_error( e ) ) 
//         });
//     }
// }


// Fetch User List base on Role
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




