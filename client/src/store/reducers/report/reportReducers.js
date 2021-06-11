/**
 *  A dedicated Reducer for Report State
 */

const initState = {
    team_attendance_summary : [],
}

const reportReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "FETCH_TEAM_ATTENDANCE_SUMMARY":
            result = {
                ...state,
                team_attendance_summary : action.data,
            }
            break;    
        default:
            result = state;
    }
    return result;
}

export default reportReducers;