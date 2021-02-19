/**
 *  A dedicated Reducer for DTR Logs
 */

const initState = {
    isListLoaded: false,
    instance: {},
}

const dtrLogs = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        // Apply the Instance that was recently fetched
        case "FETCH_DTR_LOGS_SUCCESS":
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

export default dtrLogs;