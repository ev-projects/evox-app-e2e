/**
 *  A dedicated Reducer for Constant State
 */

const initState = {}

const constantReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "RENDER_CONSTANT":
            return {
                ...action.constant,
            }
            break;
        /**  */
        
        default:
            result = state;
    }
    return result;
}

export default constantReducers;