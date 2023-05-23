/**
 *  A dedicated Reducer for Syncing
 */

const initState = {
    leaves      : [],
    users       : [],
    biometrics  : [],
}

const syncReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        case "SYNC_BHR_LEAVES":
            return {
                ...state,
                leaves: action.content
            };
            break;

        case "SYNC_UTC_ADJUST":
                return {
                    ...state,
                    leaves: action.content
                };
                break;
        case "SYNC_USER_UPDATES":
            return {
                ...state,
                users: action.content
            };
            break;
        case "SYNC_BIOMETRICS":
            return {
                ...state,
                biometrics: action.content
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default syncReducers;