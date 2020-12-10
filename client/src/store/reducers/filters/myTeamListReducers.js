/**
 *  A dedicated Reducer for My Team List
 */

const initState = {
    list : null,
    filters : {}
}

const myTeamListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "FETCH_MY_TEAM_LIST_SUCCESS":
            return {
                ...state,
                list : action.list
            }
            break;
        
        case "SET_MY_TEAM_LIST_FILTERS":
            return {
                ...state,
                filters : action.filters
            }
            break;
        /**  */
        
        
        default:
            result = state;
    }
    return result;
}

export default myTeamListReducers;