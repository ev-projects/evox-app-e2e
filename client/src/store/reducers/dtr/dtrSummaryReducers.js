/**
 *  A dedicated Reducer for Change Schedule
 */

const initState = {
    isListLoaded: false,
    instance: {},
}

const dtrSummary = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */

        // Apply the Instance that was recently fetched
        case "FETCH_DTR_SUMMARY_SUCCESS":
            return {
                instance : action.dtrSummary,
                isListLoaded : true,
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default dtrSummary;