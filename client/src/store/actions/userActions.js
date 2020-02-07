import axios from "axios";
import API from "../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../services/Formatter";

/**
 *  A dedicated repository of Actions for Users
 */

// Actions for the Login
export const logIn = (credentials) => {

    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise(axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/login",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: credentials
        }))
        .then(result => {

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token);

            // Dispatch Login Success
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            // Dispatch Alert of Login Success
            dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Actions for the Logout
export const logOut = () => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/auth/logout"
        })
        .then(result => {

            // Remove the Token from the localStorage
            localStorage.removeItem("access_token");
            
            dispatch({'type': 'LOGOUT_SUCCESS'})

            // Dispatch Alert of Login Success
            dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Action for Fetching the current User Instance
export const fetchUser = () => {
    
    return (dispatch, getState) => {

        // Sets the isReloading to True to current state while reloading the page.
        dispatch({'type': 'RELOAD_START'});

        API.call({
            method: "post",
            url: "/auth/payload",
        })
        .then(result => {

            // Dispatch Login Success
            dispatch({
                'type'      : 'FETCH_USER_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            dispatch( Formatter.alert_success( result, 3000 )  );

            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}
