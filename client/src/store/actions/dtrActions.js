import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

export const viewEmployeeDtr = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/1/2020-03-01/2020-03-31",
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

