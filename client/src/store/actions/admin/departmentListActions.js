import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';

export const fetchDepartmentList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/department/all"
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DEPARTMENT_LIST_LOAD_SUCCESS',
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