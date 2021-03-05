import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Fetch DPA List
export const fetchDpaList = ( params = null ) => {
    
    return (dispatch, getState) => {

        dispatch({
            'type'     : 'SET_DPA_LIST_FILTERS', 
            'filters'  : params
        })

        API.call({
            method: "get",
            url: "/user/get_dpa_list",
            params : params
        })
        .then(result => {
            
            dispatch({
                'type'      : 'FETCH_DPA_LIST_SUCCESS', 
                'list'      : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

