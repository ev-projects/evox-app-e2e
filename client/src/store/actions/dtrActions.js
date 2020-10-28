import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

export const viewEmployeeDtr = (user_id,from,to) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_DTR_SUCCESS', 
                'list'   : result.data.content
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const getFilterForDtr = (user_id) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/payroll/cutoff/get_filter_for_dtr/"+user_id,
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_DTR_FILTER_SUCCESS', 
                'filter'   : result.data.content
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

