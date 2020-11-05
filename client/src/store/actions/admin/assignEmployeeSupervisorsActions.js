
import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Assign Department Actions
 */


// Add PayrollCutoff
export const assignEmployeeSupervisorsActions = ( user_id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/" + user_id + "/assign_employees/",
            data: post_data
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

            
            dispatch({
                'type'    : 'UPDATE_USER_LIST',
                'user'    : result.data.content,
                'role'    : 'supervisor',
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}



