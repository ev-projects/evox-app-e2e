/**
 *  A dedicated Reducer for User State
 */

const initState = {
    birthdayAndAnniv : [],
    teamAttendance : [],
    teamAttendanceSummary : [],
    holidays:[]
}

const dashboardtReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_BIRTHDAY_ANNIVERSARY":
            result = {
                ...state,
                birthdayAndAnniv : action.data.content,
            }
            break;
        case "FETCH_TEAM_ATTENDANCE_STATUS":
            result = {
                ...state,
                teamAttendance : action.data.content,
            }
            break;
        case "FETCH_TEAM_ATTENDANCE_SUMMARY":
            result = {
                ...state,
                teamAttendanceSummary : action.data.content,
            }
            break;       
        case "FETCH_HOLIDAYS":
            result = {
                ...state,
                holidays : action.data.content,
            }
            break;   
        default:
            result = state;
    }
    return result;
}

export default dashboardtReducers;