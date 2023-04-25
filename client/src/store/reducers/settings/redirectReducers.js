/**
 *  A dedicated Reducer for Redirect
 */

const initState = {
    run : false,
    link: null
}

const redirectReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        
        case "SET_REDIRECT":

            return {
                run : true,
                link : ( action.link != undefined ) ? action.link : null
            };
            break;
        case "CLEAR_REDIRECT":
            return initState;
            break;
        default:
            result = state;
    }
    return result;
}

export default redirectReducers;