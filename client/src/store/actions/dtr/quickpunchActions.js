import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Action for Biometrixlog
export const biometrixLog = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/dtr/quickpunch/",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

