/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isScheduleLoaded : false
}

const scheduleReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_DEFAULT_SCHEDULE_SUCCESS":
            message = "Default Schedule"
            return {
                ...action.schedule,
                isScheduleLoaded : true
            };
            break;
        case "FETCH_TEMPLATE_SCHEDULE_SUCCESS":
            message = "Template Schedule"
            return {
                ...action.template,
                isScheduleLoaded : true
            };
            break;
        case "FETCH_DEFAULT_SCHEDULE_FAILED":
            message = "Login Failed!"
            return {
                ...action.error,
            }
            break;

        
        
        default:
            result = state;
    }
    return result;
}

export default scheduleReducer;