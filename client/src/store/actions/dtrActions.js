import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

export const viewEmployeeDtr = (id,from,to) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/"+id+"/"+from+"/"+to,
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

