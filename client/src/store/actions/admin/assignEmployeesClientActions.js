import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Assign Department Actions
 */


// Add PayrollCutoff
export const assignEmployeesClient = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/client/assign/",
            data: post_data
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'          : 'UPDATE_USER_DEPARTMENT_HANDLED',
                'department'    : result.data.content,
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



