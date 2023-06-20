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

        trackPromise( axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/login",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: credentials
        }) )
        .then(result => {

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token); 

            // Dispatch Login Success
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })
            

            // Dispatch Alert of Login Success
            //dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            dispatch( Formatter.alert_error(  e.response )  ) 
        });
    }
}

export const authenticateClient = (token) => {
    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise( axios({
            method: "get",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/authenticate-client",
            headers: { 
                "Content-Type": "application/json",
                "Authorization"   : "Bearer " + token,
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            }
        }) )
        .then(result => {

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token);
            // Dispatch Login Success
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })
            

            // Dispatch Alert of Login Success
            //dispatch( Formatter.alert_success( result, 3000 )  );
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            //dispatch( Formatter.alert_error(  e.response ) ) 
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
            dispatch({'type': 'CLEAR_RECENT_DTR_INSTANCE'})
            dispatch({'type': 'LOGOUT_SUCCESS'})
            window.location.reload();
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

            // Render the Constant Variables on React
            dispatch({
                'type'      : 'RENDER_CONSTANT', 
                'constant'   : result.data.content.constant
            })

            // Render the Settings that will be used on React
            dispatch({
                'type'      : 'RENDER_SETTINGS', 
                'settings'   : result.data.content.settings
            })

            // dispatch( Formatter.alert_success( result, 3000 )  );

            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Get User Info ( Name and Department )
export const getUserInfo = ( id ) => {
    return (dispatch, getState) => {

        API.call({
            method: "get",
            url: "/user/" + id + "/info",
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_USER_INFO', 
                'userInfo'   : result.data.content
            })

            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error(  e.response )  ) 
        });
    }
}


// Actions for the Login
export const forgotPasswordRequest = ( email ) => {

    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});

        trackPromise( axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/forgot_password_request",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: { email : email }
        }) )
        .then(result => {

            dispatch( Formatter.alert_success( result, 5000 )  );

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.login
            })
            
        })
        .catch(e => {
            // Please take note that I used e.response here since I am not using the API.call function. That function already handles the 'e' to get it's response.
            // I'm doing it manually for the manual AXIOS calls only.
            dispatch( Formatter.alert_error(  e.response )  ) 
        });
    }
}



