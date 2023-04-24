/**
 *  A dedicated Reducer for Settings State
 */

const initState = {}

const currentActionReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "EVENT_CLICK":
            return {
                ...action.requesttype,
            }
            break;
        /**  */
        
        default:
            result = state;
    }
    return result;
}

export default currentActionReducers;