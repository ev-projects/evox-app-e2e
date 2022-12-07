/**
 *  A dedicated Reducer for My Team List
 */

const initState = {
    list : null,
    team_list : [],
    team_schedule: { data: [], date_list: [], week_list: [] },
    filters : {},
    current_page : 0,
    last_page : 0
}

const myDepartmentsTeamsListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        case "FETCH_MY_DEPS_TEAM_LIST_SUCCESS":
            return {
                ...state,
                list : action.list
            }
            break;
        case "FETCH_DEPS_TEAM_LIST_SUCCESS":
            return {
                ...state,
                team_list : action.list
            }
            break;
        case "SET_MY_DEPS_TEAM_LIST_FILTERS":
            return {
                ...state,
                filters : action.filters
            } 
            break;
        case "FETCH_DEPS_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS":
            return {
                ...state,
                team_list : action.list
            } 
        /**  */
        
        
        default:
            result = state;
    }
    return result;
}

export default myDepartmentsTeamsListReducers;