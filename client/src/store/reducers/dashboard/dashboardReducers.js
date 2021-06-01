/**
 *  A dedicated Reducer for User State
 */

const initState = {
    my_dtr_notifications : [],
    birthday_and_anniv : [],
    team_attendance : [],
    recent_dtr : [],
    holidays:[]
}

const dashboardReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        
        case "FETCH_MY_DTR_NOTIFICATIONS":
            result = {
                ...state,
                my_dtr_notifications : action.data,
            }
            break;
        case "FETCH_BIRTHDAY_ANNIVERSARY":
            result = {
                ...state,
                birthday_and_anniv : action.data,
            }
            break;
        case "FETCH_TEAM_ATTENDANCE_STATUS":
            result = {
                ...state,
                team_attendance : action.data,
            }
            break;
        case "FETCH_RECENT_DTR":
            result = {
                ...state,
                recent_dtr : action.data.content,
            }
            break;      
        case "FETCH_HOLIDAYS":
            result = {
                ...state,
                holidays : action.data,
            }
            break;   
        default:
            result = state;
    }
    return result;
}

export default dashboardReducers;