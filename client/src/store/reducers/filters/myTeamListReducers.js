/**
 *  A dedicated Reducer for My Team List
 */

const initState = {
    list : null,
    team_list : [],
    week : { data: [], date_list: [] },
    month : { data: [], date_list: [] , week_list: []},
    day : [],
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
            result.current_page = action.day.current_page;
            result.last_page = action.day.last_page;
            if(action.day.current_page == 1){
                result.day = [];
                result.day.push(action.day.data);
                return result;
            }else if(action.day.current_page > 1 && action.day.current_page <= action.day.last_page ){
                result.day.push(action.day.data);
                return result;
            }

            break;
        case "FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS":
            result.current_page = action.week.current_page;
            result.last_page = action.week.last_page;
            if(action.week.current_page == 1){
                result.week.data = [];
                result.week.data.push(action.week.data); 
                result.week.date_list = action.week.date_list;
                return result;
            }else if(action.week.current_page > 1 && action.week.current_page <= action.week.last_page ){
                result.week.data.push(action.week.data);
                result.week.date_list = result.week.date_list.concat(action.week.date_list);
                return result;
            }
            break;
        case "FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS":
            result.current_page = action.month.current_page;
            result.last_page = action.month.last_page;
            if(action.month.current_page == 1){
                result.month.data = [];
                result.month.date_list = [];
                result.month.week_list = [];

                result.month.data.push(action.month.data);
                result.month.date_list = action.month.date_list;
                result.month.week_list = action.month.week_list;
            }else if(action.month.current_page > 1 && action.month.current_page <= action.month.last_page ){
                result.month.data.push(action.month.data);
                result.month.date_list = result.month.date_list.concat(action.month.date_list);
                result.month.week_list = result.month.week_list.concat(action.month.week_list);
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