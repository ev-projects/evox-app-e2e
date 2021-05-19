/**
 *  A dedicated Reducer for My Team List
 */

const initState = {
    list : null,
    team_list : [],
    team_schedule : { data: [], date_list: [] },
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
        case "FETCH_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                team_schedule : action.list
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