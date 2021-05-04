/**
 *  A dedicated Reducer for User State
 */

const initState = {
    birthday_and_anniv : [],
    team_attendance : [],
    team_attendance_summary : [],
    holidays:[]
}

const dashboardtReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_DTR_NOTIFICATIONS":
            result = {
                ...state,
                dtr_notifications : action.data.content,
            }
            break;
        case "FETCH_BIRTHDAY_ANNIVERSARY":
            result = {
                ...state,
                birthday_and_anniv : action.data.content,
            }
            break;
        case "FETCH_TEAM_ATTENDANCE_STATUS":
            result = {
                ...state,
                team_attendance : action.data.content,
            }
            break;
        case "FETCH_TEAM_ATTENDANCE_SUMMARY":
            result = {
                ...state,
                team_attendance_summary : action.data.content,
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