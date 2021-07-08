/**
 *  A dedicated Reducer for My Team List
 */

const initState = {
    list : null,
    team_list : [],
    team_schedule: { data: [], date_list: [], week_list: [] },
    month : { data: [], date_list: [] , week_list: []},
    filters : {},
    current_page : 0,
    last_page : 0
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
            result.current_page = action.team_schedule.current_page;
            result.last_page = action.team_schedule.last_page;
            if(action.team_schedule.current_page == 1){
                result.team_schedule.data = [];
                result.team_schedule.data.push(action.team_schedule.data);
                return result;
            }else if(action.team_schedule.current_page > 1 && action.team_schedule.current_page <= action.team_schedule.last_page ){
                result.team_schedule.push(action.team_schedule.data);
                return result;
            }
            break;
        case "FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS":
            result.current_page = action.team_schedule.current_page;
            result.last_page = action.team_schedule.last_page;
            if(action.team_schedule.current_page == 1){
                result.team_schedule.data = [];
                result.team_schedule.date_list = [];
                result.team_schedule.data.push(action.team_schedule.data); 
                result.team_schedule.date_list = action.team_schedule.date_list;
                return result;
            }else if(action.week.current_page > 1 && action.week.current_page <= action.week.last_page ){
                result.team_schedule.data.push(action.team_schedule.data);
                result.team_schedule.date_list = result.team_schedule.date_list.concat(action.team_schedule.date_list);
                return result;
            }
            break;
        case "FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS":
            result.current_page = action.team_schedule.current_page;
            result.last_page = action.team_schedule.last_page;
            if(action.team_schedule.current_page == 1){
                result.team_schedule.data = [];
                result.team_schedule.date_list = [];
                result.team_schedule.week_list = [];

                result.team_schedule.data.push(action.team_schedule.data);
                result.team_schedule.date_list = action.team_schedule.date_list;
                result.team_schedule.week_list = action.team_schedule.week_list;
            }else if(action.team_schedule.current_page > 1 && action.team_schedule.current_page <= action.team_schedule.last_page ){
                result.team_schedule.data.push(action.team_schedule.data);
                result.team_schedule.date_list = result.team_schedule.date_list.concat(action.team_schedule.date_list);
                result.team_schedule.week_list = result.team_schedule.week_list.concat(action.team_schedule.week_list);
            }
            return result;

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