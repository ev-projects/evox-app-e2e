import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Fetch Request List
export const fetchMyTeamList = ( user_id, params = null ) => {
    console.log(params);
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/user/" + user_id + "/my_team_list",
            params : params
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_MY_TEAM_LIST_SUCCESS', 
                'myTeamList'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

