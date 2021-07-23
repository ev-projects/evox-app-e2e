/**
 *  A dedicated Reducer for My Team List
 */

 const initState = {
    list : null,
    team_list : [],
    team_schedule: { data: [], date_list: [], week_list: [], holiday_list: [] },
    filters : {},
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
        case "FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS":
            result.team_schedule.data[ action.date ] = action.team_schedule.data[ action.date ];
            result.team_schedule.date_list[ action.date ] =false;
            return result;
        case "FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                team_schedule: { 
                    data: action.team_schedule.data, 
                    date_list:  action.team_schedule.date_list, 
                    holiday_list: action.team_schedule.holiday_list,
                    week_list: [] ,
                },
            }
        case "FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS":
            return {
                ...state,
                team_schedule: { 
                    data: action.team_schedule.data, 
                    date_list:  action.team_schedule.date_list, 
                    holiday_list: action.team_schedule.holiday_list,
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