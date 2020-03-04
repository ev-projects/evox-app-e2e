/**
 *  A dedicated Reducer for User State
 */

const initState = {
    error_message : ""
}

const userReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "LOGIN_SUCCESS":
            message = "Login Success!"
            return {
                ...action.user,
                payload : action.payload
            }
            break;
        /**  */

        /**
         *  Logout Actions
         */
        case "LOGOUT_SUCCESS":
            message = "Login Success!"
            return initState;
            break;
        case "LOGOUT_FAILED":
            message = "Login Failed!"
            return {
                ...action.error,
            }
            break;
        /**  */

        /**
         *  Reload Actions
         */
        case "FETCH_USER_SUCCESS":
            message = "Reload User Success!"
            return {
                ...action.user,
                payload : action.test,
            }
            break;

        case "FETCH_USER_FAILED":
            message = "Reload User Failed!"
            return {
                ...action.error,
            }
            break;
        /**  */
        
        
        
        default:
            result = state;
    }
    return result;
}

export default userReducer;