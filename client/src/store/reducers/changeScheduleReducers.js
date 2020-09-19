/**
 *  A dedicated Reducer for Change Schedule
 */

const initState = {
    isInstanceLoaded: false,
    instance: {}
}

const changeScheduleReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */

        // Apply the Instance that was recently fetched
        case "FETCH_CHANGE_SCHEDULE_SUCCESS":
            return {
                instance : action.changeSchedule,
                isInstanceLoaded : true
            };
            break;

        // Resets the Instance of the Change Schedule but retains the ID so it would be reused.
        case "RESET_CHANGE_SCHEDULE_INSTANCE":
            return {
                instance : {
                    id   :    state.instance.id
                },
                isInstanceLoaded : true
            };
            break;

        // Clear the Instance totally for the Change Schedule 
        case "CLEAR_CHANGE_SCHEDULE_INSTANCE":
            return {
                instance : {},
                isInstanceLoaded : false
            };
            break;
            
        default:
            result = state;
    }
    return result;
}

export default changeScheduleReducers;