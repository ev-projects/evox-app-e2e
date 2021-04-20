import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Fetch Request List
export const fetchMyTeamList = ( user_id, params = null ) => {
    
    return (dispatch, getState) => {

        dispatch({
            'type'     : 'SET_MY_TEAM_LIST_FILTERS', 
            'filters'  : params
        })

        API.call({
            method: "get",
            url: "/user/" + user_id + "/my_team_list",
            params : params
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_MY_TEAM_LIST_SUCCESS', 
                'list'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// THIS FILTER 
export const fetchTeamUnderDepartment = ( user_id, department_id) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/" + user_id + "/team_list/" + department_id 
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_TEAM_LIST_SUCCESS', 
                'list'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

