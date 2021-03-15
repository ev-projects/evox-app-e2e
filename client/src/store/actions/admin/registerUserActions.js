
import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


// Register User
export const registerUser = ( formData ) => {

    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/register",
            data: formData
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
 
            dispatch({
                'type': 'REGISTER_USER_SUCCESSFUL'
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}
