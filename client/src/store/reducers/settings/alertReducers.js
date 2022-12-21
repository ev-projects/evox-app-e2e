/**
 *  A dedicated Reducer for Alerts State
 */

const initState = {
    onShow : false,
    error : {},
    variant : "",
    header : "",
    body : "",
    isTimeOutActive : false,
    timeOut: 0,
}

const alertReducer = (state = initState, action) => {
    let result = {...state};

    switch(action.type) {

        /**
         *  Login Actions
         */
        case "SHOW_ALERT":
            result = {};
            if( action.error ) {
                result = {
                    onShow          : true,
                    variant         : 'danger',
                    header          : ( action.header ? action.header : "An error has occured:"),
                    body            : ( action.error?.data?.error?.message ? action.error.data.error.message : ( action.error?.content ? action.error.content : action.error.statusText ) ),
                    timeOut         : ( action.timeOut ?  action.timeOut : 0 ),
                    isTimeOutActive : ( action.timeOut != 0 ?  true : false )
                }
            } else {
                result = {
                    onShow          : true,
                    variant         : 'success',
                    header          : ( action.header ? action.header : ""),
                    body            : ( action.body ? action.body : ""),
                    timeOut         : ( action.timeOut ?  action.timeOut : 4500 ),
                    isTimeOutActive : ( action.timeOut != 0 ?  true : false )
                }
            }
            return result;
            break;
        case "HIDE_ALERT":
            return initState;
            break;
        case "TOGGLE_TIMEOUT":
            return  {
                ...state,
                isTimeOutActive : !state.isTimeOutActive,
            };
            break;
        /**  */
        
        default:
            result = state;
    }
    return result;
}

export default alertReducer;