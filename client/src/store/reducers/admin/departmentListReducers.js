/**
 *  A dedicated Reducer for Syncing
 */

const initState = {
    department: [],
    isDepartmentListLoaded : false,
}

const departmentListReducers = (state = initState, action) => {

    let message = "";
    let result = {...state};
    switch(action.type) {
      
        case "FETCH_DEPARTMENT_LIST_LOAD_SUCCESS":

        return {
            ...state,
            Deplist : action.list,
            isDepartmentListLoaded : true
        };
            break;
        // case "SYNC_BIOMETRICS":
        //     return {
        //         ...state,
        //         biometrics: action.content
        //     };
        //     break;
        default:
            result = state;
    }
    return result;
}

export default departmentListReducers;