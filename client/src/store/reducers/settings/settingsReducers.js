/**
 *  A dedicated Reducer for Settings State
 */

const initState = {}

const settingsReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "RENDER_SETTINGS":
            return {
                ...action.settings,
            }
            break;
        /**  */
        
        default:
            result = state;
    }
    return result;
}

export default settingsReducers;