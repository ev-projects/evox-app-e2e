/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isDtrLoaded : false,
}

const dtrReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_DTR_SUCCESS":
            message = "Dtr Fetching Success!"
            return {
                list : action.list,
                isDtrLoaded : true,
            }
            break;
        case "FETCH_DTR_FAILED":
            message = "Fetching Dtr Failed!"
            return {
                ...action.error,
            }
            break;

        
        
        default:
            result = state;
    }
    return result;
}

export default dtrReducer;