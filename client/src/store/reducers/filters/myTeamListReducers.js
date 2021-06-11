/**
 *  A dedicated Reducer for My Team List
 */

const initState = {
    list : null,
    team_list : [],
    weekly : { data: [], date_list: [] },
    monthly : { data: [], date_list: [] },
    daily : [],
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
        case "FETCH_TEAM_LIST_SUCCESS":
            return {
                ...state,
                team_list : action.list
            }
            break;
        case "FETCH_DAILY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                daily : action.daily.data
            }
            break;
        case "FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                weekly : action.weekly
            }
            break;
        case "FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                monthly : action.monthly
            }
            break;
        case "SET_MY_TEAM_LIST_FILTERS":
            return {
                ...state,
                filters : action.filters
            } 
            break;
        case "FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS":
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

export default myTeamListReducers;