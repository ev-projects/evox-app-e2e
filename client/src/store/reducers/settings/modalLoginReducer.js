/**
 *  A dedicated Reducer for Alerts State
 */

const initState = {
    onShow : false
}

const modalLoginReducer = (state = initState, action) => {
    let result = {...state};

    switch(action.type) {

        /**
         *  Login Actions
         */
        case "SHOW_MODAL_LOGIN":
            result = {
                onShow          : true
            }
            //console.trace('Modal Login', result)
            return result;
            break;
        
            case "HIDE_MODAL_LOGIN":
            result = initState;
            //console.trace('Modal Login', result);
            break;
        
        default:
            result = state; 
    }
    return result;
}

export default modalLoginReducer;