import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";



// Fetch Request List
export const fetchDtrSummary = ( data = null ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/dtr_summary/team",
            params : data
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_DTR_SUMMARY_SUCCESS', 
                'dtrSummary'  : result.data.content,
            })
            if (result.data.content.has_next_page) {
                var btnGenerate = document.getElementById('btn-generate');
                btnGenerate.click();
            }
        })
        .catch(e => {
            dispatch( {
                'type'      : 'FETCH_DTR_SUMMARY_BATCH_ERROR', 
                'e'  : e,
            } ) 
        });
    }
}





export const exportDtrSummary = ( data = null ) => {
    console.log('Params', data)
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/dtr_summary/export",
            params : data
        })
        .then(result => {
            console.log(result.data.content)
            if (result.data.content) {
                dispatch({
                    'type'      : 'FETCH_DTR_EXPORT_BACTH_SUCCESS', 
                    'dtrSummary'  : result.data.content,
                })
                //generate next page and append to the previous result
                if (result.data.content.has_next_page) {
                    var btnExport = document.getElementById('btn-export-' + (data?.export ? data.export : (data?.department_id ? 'department' : 'all')));
                    btnExport.click();
                }
            } else {
                dispatch({
                    'type'      : 'FETCH_DTR_EXPORT_SUCCESS',
                    'data'      : result.data
                })
            }
        })
        .catch(e => {
            dispatch( {
                'type'      : 'FETCH_DTR_SUMMARY_BATCH_ERROR', 
                'e'  : e,
            } )
        });
    }
}




