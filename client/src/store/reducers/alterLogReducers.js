/**
 *  A dedicated Reducer for Alter Log
 */

const initState = {
    isInstanceLoaded: false,
    instance: {},
}

const alterLogReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_ALTER_LOG_SUCCESS":
            return {
                instance : action.alterLog,
                isInstanceLoaded : true
            };
            break;
        case "STORE_ALTER_LOG_SUCCESS":
            return {
                // alterLogInstance : action.alterLog
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default alterLogReducers;