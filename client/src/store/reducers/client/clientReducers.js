/**
 *  A dedicated Reducer for User State
 */

const initState = {
    data : []
}

const clientReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_BIRTHDAY_ANNIVERSARY":
            result = {
                ...state,
                data : action.data
            }
            break;

        
        default:
            result = state;
    }
    return result;
}

export default clientReducers;