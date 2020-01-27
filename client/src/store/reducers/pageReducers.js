/**
 *  A dedicated Reducer for manually checking of isReloading state.
 */

const initState = {
    isReloading : false,
    isRequesting : false
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

        /**
         *  Login Actions
         */
        case "REQUEST_START":
            message = "Request Start"
            return {
                isRequesting : true,
            }
            break;
        case "REQUEST_END":
            message = "Request End"
            return  {
                isRequesting : false,
            }
            break;
        /**  */
        
        default:
            result = state;
    }
    return result;
}

export default pageReducer;