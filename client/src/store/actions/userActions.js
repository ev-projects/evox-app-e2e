import axios from "axios";
import API from "../../services/API";

/**
 *  A dedicated repository of Actions for Users
 */

// Actions for the Login
export const logIn = (credentials) => {

    return (dispatch, getState) => {

        dispatch({'type': 'REQUEST_START'});
        
        axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/auth/login",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: credentials
        })
        .then(result => {
            
            dispatch({'type': 'REQUEST_END'});

            // Set the Returned token on localStorage
            localStorage.setItem("access_token", result.data.content.access_token);

            // Dispatch Login Success
            dispatch({
                'type'      : 'LOGIN_SUCCESS', 
                'payload'   : result.data.content.payload,
                'user'      : result.data.content.user
            })
        })
        .catch(e => {
            dispatch({'type': 'REQUEST_END'});
            dispatch({
                'type'      : 'LOGIN_FAILED', 
                'error'     : API.format(e.response)
            })
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
        })
        .catch(e => {
            dispatch({
                'type'      : 'LOGOUT_FAILED', 
                'error'     : API.format(e.response)
            })
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

            // Sets the Reloading to False
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch({
                'type'      : 'FETCH_USER_FAILED', 
                'error'     : API.format(e.response)
            })
        });
    }
}
