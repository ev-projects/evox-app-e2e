import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Assign Department Actions
 */


// Add PayrollCutoff
export const generateDtrDate = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/generate/dtr/" ,
            data: data
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));


        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



