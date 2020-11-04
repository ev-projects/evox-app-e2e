/**
 *  A dedicated Reducer for Change Schedule
 */

const initState = {
    isListLoaded: false,
    isNumbersLoaded: false,
    instance: {},
    statusNumbers: null,
}

const requestListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */

        // Apply the Instance that was recently fetched
        case "FETCH_REQUEST_LIST_SUCCESS_INITIALLY":

            return {
                instance : action.requestList,
                isListLoaded : true,
                isNumbersLoaded : false,
                statusNumbers: null,
            };
            break;

        case "FETCH_REQUEST_LIST_SUCCESS":
                return {
                    instance : action.requestList,
                    isListLoaded : true,
                    isNumbersLoaded : true,
                    statusNumbers: action.statusNumbers
                };
                break;
        case "FETCH_REQUEST_STATUS_NUMBERS":
            return {
                instance : action.requestList,
                isListLoaded : true,
                isNumbersLoaded : true,
                statusNumbers:  action.statusNumbers
            };
        break;
        default:
            result = state;
    }
    return result;
}

export default requestListReducers;