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

const teamSchedule = (state = initState, action) => {
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
                team_schedule: { 
                    data: action.team_schedule.data, 
                    date_list: [], 
                    week_list: [] 
                },
            }
        case "FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                team_schedule: { 
                    data: action.team_schedule.data, 
                    date_list:  action.team_schedule.date_list, 
                    week_list: [] 
                },
            }
        case "FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                team_schedule: { 
                    data: action.team_schedule.data, 
                    date_list:  action.team_schedule.date_list, 
                    week_list: action.team_schedule.week_list, 
                },
            }
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

export default teamSchedule;