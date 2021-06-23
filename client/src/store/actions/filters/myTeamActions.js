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
                'type'  : 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', 
                'list'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch Team Request
export const fetchTeamSchedule = ( params = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/team_schedule?link=team_schedule",
            params : params
        })
        .then(result => {
            if(params.scope_type=="day"){
                dispatch({
                    'type'      : 'FETCH_DAILY_TEAM_SCHEDULE_SUCCESS', 
                    'day'  : result.data.content.data,
                })
            }else if(params.scope_type=="week"){
                dispatch({
                    'type'      : 'FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS', 
                    'week'  : result.data.content,
                })
            }else if(params.scope_type=="month"||params.scope_type=="custom"){
                dispatch({
                    'type'      : 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS', 
                    'month'  : result.data.content,
                })
            }
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}