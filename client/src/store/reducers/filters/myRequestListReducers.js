
/**
 *  A dedicated Reducer for My Request List
 */

const initState = {
    isListLoaded: false,
    isNumbersLoaded: false,
    instance: {},
    statusNumbers: null,
    filters : {}
}

const myRequestListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */

        // Apply the Instance that was recently fetched
        case "FETCH_MY_REQUEST_LIST_SUCCESS_INITIALLY":

            return {
                ...state,
                instance : action.requestList,
                isListLoaded : true,
                isNumbersLoaded : false,
                statusNumbers: null,
            };
            break;

        case "FETCH_MY_REQUEST_LIST_SUCCESS":
            return {
                ...state,
                instance : action.requestList,
                isListLoaded : true,
                isNumbersLoaded : true,
                statusNumbers: action.statusNumbers,
            };
            break;
        case "FETCH_MY_REQUEST_STATUS_NUMBERS":
            return {
                ...state,
                instance : action.requestList,
                isListLoaded : true,
                isNumbersLoaded : true,
                statusNumbers:  action.statusNumbers,
            };
            break;

        case "SET_MY_REQUEST_LIST_FILTERS":
            return {
                ...state,
                filters : action.filters
            }
            break;

        default:
            result = state;
    }
    return result;
}


export default myRequestListReducers;