/**
 *  A dedicated Reducer for manually checking of isReloading state.
 */

const initState = {
    isReloading : false
}

const pageReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "RELOAD_START":
            message = "Reload Start"
            return {
                isReloading : true,
            }
            break;
        case "RELOAD_END":
            message = "Reload End"
            return  {
                isReloading : false,
            }
            break;
        /**  */
        
        default:
            result = state;
    }
    return result;
}

export default pageReducer;