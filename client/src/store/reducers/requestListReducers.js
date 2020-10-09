/**
 *  A dedicated Reducer for Change Schedule
 */

const initState = {
    isListLoaded: false,
    instance: {},
    isPageLoaded: false
}

const requestListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */

        // Apply the Instance that was recently fetched
        case "FETCH_REQUEST_LIST_SUCCESS":
            return {
                instance : action.requestList,
                isListLoaded : true,
                isPageLoaded: true
            };
            break;
        case "RESET_REQUEST_LIST":
            return {
                instance : action.requestList,
                isListLoaded : true,
                isPageLoaded: true
            };
        break;
        default:
            result = state;
    }
    return result;
}

export default requestListReducers;