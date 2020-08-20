/**
 *  A dedicated Reducer for Alter Log
 */

const initState = {
    isInstanceLoaded: false,
    instance: {}
}

const alterLogReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */

        // Apply the Instance that was recently fetched
        case "FETCH_ALTER_LOG_SUCCESS":
            return {
                instance : action.alterLog,
                isInstanceLoaded : true
            };
            break;

        // Resets the Instance of the Alter Log but retains the ID so it would be reused.
        case "RESET_ALTER_LOG_INSTANCE":
            return {
                instance : {
                    id   :    state.instance.id
                },
                isInstanceLoaded : true
            };
            break;

        // Clear the Instance totally for the Alter Log 
        case "CLEAR_ALTER_LOG_INSTANCE":
            return {
                instance : {},
                isInstanceLoaded : false
            };
            break;
            
        default:
            result = state;
    }
    return result;
}

export default alterLogReducers;