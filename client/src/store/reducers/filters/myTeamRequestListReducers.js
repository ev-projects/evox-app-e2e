/**
 *  A dedicated Reducer for My Team Request List
 */

const initState = {
    isListLoaded: false,
    isNumbersLoaded: false,
    instance: {},
    statusNumbers: null,
    filters : {}
}

const myTeamRequestListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */


        case "FETCH_MY_TEAM_REQUEST_LIST_SUCCESS":
            return {
                ...state,
                instance : action.requestList,
                isListLoaded : true
            };
            break;
        case "FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS":
            return {
                ...state,
                isNumbersLoaded : true,
                statusNumbers:  action.statusNumbers,
            };
            break;

        case "SET_MY_TEAM_REQUEST_LIST_FILTERS":
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


export default myTeamRequestListReducers;