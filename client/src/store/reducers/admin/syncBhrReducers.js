/**
 *  A dedicated Reducer for Register User
 */

const initState = {
    isSuccessful: false,
    data:[]
}

const syncBhrReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        case "SYNC_BHR_LEAVES":
            return {
                ...state,
                isSuccessful : true,
                data: action.content
            };
            break;
        case "SYNC_USER_UPDATES":
            return {
                ...state,
                isSuccessful : true,
                data: action.content
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default syncBhrReducers;