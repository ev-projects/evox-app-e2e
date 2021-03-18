
import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


// Fetch User Role
export const syncBhrLeaves = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/cron/sync_leaves/"+ data.valid_from +"/"+ data.valid_to+"",
        })
        .then(result => {
            dispatch({
                'type'     : 'SYNC_BHR_LEAVES', 
                'content'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch User Role
export const syncBhrUsers = ( data ) => {

    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/cron/sync_users/"+ data.valid_from + "T00:00:00-00:00",
        })
        .then(result => {
            dispatch({
                'type'      : 'SYNC_USER_UPDATES', 
                'content'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


