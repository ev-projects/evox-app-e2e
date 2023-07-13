import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";
import moment from 'moment';
import $ from 'jquery';

// Action for Biometrixlog
export const biometrixLog = ( post_data, id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/dtr/quickpunch/",
            data: post_data
        })
        .then(result => {
            var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
            var to = moment().format("YYYY-MM-DD");
            $(".nav-clock.dropdown-toggle.btn.btn-primary").click();
            API.call({
                method: "get",
                url: "/dtr/"+id+"/"+from+"/"+to,
            })
            .then(result => {
                dispatch({
                    'type'      : 'FETCH_RECENT_DTR', 
                    'data'      : result.data,
                })
            })
            .catch(e => {
                // console.log(e);
                dispatch( Formatter.alert_error( e ) ) 
            });
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Action for Biometrixlog for Multi
export const biometrixLogMulti = ( post_data, id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/dtr/quickpunch_multi/",
            data: post_data
        })
        .then(result => {
            var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
            var to = moment().format("YYYY-MM-DD");
            API.call({
                method: "get",
                url: "/dtr/punch/"+id+"/"+from+"/"+to,
            })
            .then(result => {
                dispatch({
                    'type'      : 'FETCH_RECENT_PUNCH', 
                    'data'      : result.data,
                })
            })
            .catch(e => {
                // console.log(e);
                dispatch( Formatter.alert_error( e ) ) 
            });
            dispatch( Formatter.alert_success( result ));
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


