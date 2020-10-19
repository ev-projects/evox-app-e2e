/**
 *  A dedicated Reducer for Lookup Lists 
 */

const initState = {
    
}

const lookupListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        // Apply the List that was recently fetched
        case "FETCH_USER_LIST_SUCCESS":
            result = {
                ...state
            }

            result[action.role] = action.list;
            break;

        // Apply the List that was recently fetched
        case "FETCH_DEPARTMENT_LIST_SUCCESS":
            result = {
                ...state,
                department  : action.list
            }
            break;

        // Apply the List that was recently fetched
        case "UPDATE_DEPARTMENT_LIST":
                const index = state.department.findIndex((department) => department.id === action.department.id)

                state.department[index] = action.department;
                
                result = {
                    ...state
                }
            break;

            
    }
    return result;
}

export default lookupListReducers;