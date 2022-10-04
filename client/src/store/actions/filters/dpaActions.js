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

export const exportDpaList = ( data = null ) => {
    return (dispatch, getState) => {
        API.export({
            method: "get",
            url: "/user/export_dpa_list",
            params : data
        })
        .then(result => {
            var fileURL = window.URL.createObjectURL(new Blob([result.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', 'dpa_list.csv');
            document.body.appendChild(fileLink);
            fileLink.click();
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

