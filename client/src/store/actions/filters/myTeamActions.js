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
export const fetchSubDepartmentUnderDepartment = ( user_id, department_id) => {
    return (dispatch, getState) => {
        
        API.call({
            method: "get",
            url: "/user/" + user_id + "/sub_department/" + department_id 
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS', 
                'list'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const fetchDepartmentsTeams = ( user_id, params = null) => {
    return (dispatch, getState) => {


        API.call({
            method: "post",
            url: "/user/" + user_id + "/team_list_all/",
            data : params
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', 
                'list'  : result.data.content,
                
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
            if(params.export=="all"){
            var fileURL = window.URL.createObjectURL(new Blob([result.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', 'team_schedule.csv');
            document.body.appendChild(fileLink);
            fileLink.click();
            }else{
                if(params.show_more==true){
                    dispatch({
                        'type'          : 'FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS', 
                        'team_schedule' :  result.data.content,
                        'date' :  params.start_date,
                    })
                }else{
                    if(params.scope_type=="day"){
                        dispatch({
                            'type'          : 'FETCH_DAILY_TEAM_SCHEDULE_SUCCESS', 
                            'team_schedule' :  result.data.content,
                        })
                    }else if(params.scope_type=="week"){
                        dispatch({
                            'type'          : 'FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS', 
                            'team_schedule' :  result.data.content,
                        })
                    }else if(params.scope_type=="month" || params.scope_type=="custom"){
                        dispatch({
                            'type'          : 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS', 
                            'team_schedule' :  result.data.content,
                        })
                    }
                }

            }
        })
        .catch(e => {
            console.log(e);
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const exportDtrSummary = ( data = null ) => {
    return (dispatch, getState) => {
        API.export({
            method: "get",
            url: "/report/dtr_summary/export",
            params : data
        })
        .then(result => {
            var fileURL = window.URL.createObjectURL(new Blob([result.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', 'dtr_summary.csv');
            document.body.appendChild(fileLink);
            fileLink.click();
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}