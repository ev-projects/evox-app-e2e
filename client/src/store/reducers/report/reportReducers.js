/**
 *  A dedicated Reducer for Report State
 */

const initState = {
    team_attendance_summary: [],
    selected_summary: "scheduled_employees",
}

const reportReducers = (state = initState, action) => {
    let message = "";
    let result = { ...state };
    switch (action.type) {

        case "FETCH_TEAM_ATTENDANCE_SUMMARY":
            result = {
                ...state,
                team_attendance_summary: action.data,
            }
            break;
        case "SET_SELECTED_ATTENDACE_SUMMARY":
            result = {
                ...state,
                selected_summary: action.payload
            }
            break;
        default:
            result = state;
    }
    return result;
}

export default reportReducers;