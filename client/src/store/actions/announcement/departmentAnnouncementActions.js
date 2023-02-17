import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';



// Add Change Log
export const createDepartmentAnnouncement = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/department/announcments/create " ,
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






export const fetchDepartmentList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/all"
        })
        .then(result => {
            
            dispatch({
                // 'type'      : 'FETCH_DEPARTMENT_LIST_LOAD_SUCCESS',
                'list'      : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const deleteDepartment = (id) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/department/"+id+"/"
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}