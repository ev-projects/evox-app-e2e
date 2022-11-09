import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Change Logs Actions
 */


// Add Change Log
export const addChangeLogs = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/changelogs" ,
            data: data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.dashboard
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



