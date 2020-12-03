
import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Assign Department Actions
 */


// Add PayrollCutoff
export const assignDepartmentHandlers = ( department_id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/department/assign_handlers/" + department_id,
            data: post_data
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

            
            dispatch({
                'type'          : 'UPDATE_DEPARTMENT_LIST',
                'department'    : result.data.content,
            })

            
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



