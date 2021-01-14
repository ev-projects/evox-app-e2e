/**
 *  A dedicated Reducer for Request Approval
 */

const initState = {
    instance: null,
    isInstanceValid : null
    
}

const requestApprovalReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        // Apply the Instance that was recently fetched
        case "FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE":
            return {
                instance : action.instance,
                isInstanceValid : true
            };
            break;
        case "FAILED_FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE":
            return {
                ...state,
                isInstanceValid : false
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default requestApprovalReducers;