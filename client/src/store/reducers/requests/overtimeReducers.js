/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isInstanceLoaded: false,
    instance: {},
}

const overtimeReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_OVERTIME_SUCCESS":
            return {
                instance : action.overtime,
                isInstanceLoaded : true
            };
            break;
        case "STORE_OVERTIME_SUCCESS":
            return {
                // overtimeInstance : action.overtime
            };
            break;

             // Clear the Instance totally for the Alter Log 
        case "CLEAR_OVERTIME_INSTANCE":
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

export default overtimeReducers;