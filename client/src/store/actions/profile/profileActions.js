import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";

/**
 *  A dedicated repository of Actions for Profile
 */

export const fetchProfile = ( id ) => {
    return (dispatch, getState) => {
        
        // Sets the Reloading to True
        dispatch({'type': 'RELOAD_START'});

        API.call({
            method: "get",
            url: "/user/" + id + "/profile"
        })
        .then(result => {
            
            dispatch({
                'type'              : 'FETCH_PROFILE',
                'user'              : result.data.content.user,
                'profilePicture'    : result.data.content.profile_picture
            })

            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const changePassword = ( id, formData ) => {

    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/user/" + id + "/change_password",
            data: formData
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));
            
            dispatch({
                'type'              : 'CLOSE_ALL_FORM'
            })

            if( formData.reset_password ){

                dispatch({
                    'type'      : 'TOGGLE_FORCE_CHANGE_PASSWORD'
                })
                
            }
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

