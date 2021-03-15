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
        case "UPDATE_USER_LIST":
                const user_index = state[action.role].findIndex((user) => user.id === action.user.id)

                state[action.role][user_index] = action.user;
                
                result = {
                    ...state
                }
            break;

        // Apply the List that was recently fetched
        case "FETCH_DEPARTMENT_LIST_SUCCESS":
            result = {
                ...state,
                department  : action.list
            }
            break;

        // Apply the List that was recently fetched
        case "FETCH_DEPARTMENT_HANDLERS_LIST_SUCCESS":
            result = {
                ...state,
                department_handlers  : action.list
            }
            break

        // Apply the List that was recently fetched
        case "FETCH_DEPARTMENT_USERS_LIST_SUCCESS":
            result = {
                ...state,
                department_users  : action.list
            }
            break

        // Apply the List that was recently fetched
        case "FETCH_ROLE_LIST_SUCCESS":
            result = {
                ...state,
                roles  : action.list
            }
            break

        // // Apply the List that was recently fetched
        // case "FETCH_DEPARTMENT_USER_LIST_SUCCESS":
        //     result = {
        //         ...state,
        //         department_users : {
        //             ...state.department_users
        //         }
        //     }
        //     result.department_users[action.department_id] = action.list;
            
        //     break;

            
            
    }
    return result;
}

export default lookupListReducers;