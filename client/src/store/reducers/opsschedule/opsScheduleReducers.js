/**
 *  A dedicated Reducer for Ops Schedule State
 */

const initState = {
    isInstanceLoaded: false,
    instance: {},
}

const opsScheduleReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  OpsSchedule Actions
         */
        case "FETCH_OPSSCHEDULES_SUCCESS":
            return {
                ...state,
                listInstance : action.list,
                isListInstanceLoaded : action.list.length >= 1 ? true : false,
            };
            break;
        case "FETCH_OPSSCHEDULE_SUCCESS":
            return {
                ...state,
                instance : action.data,
                isInstanceLoaded : true,
            };
            break;
        case "STORE_OPSSCHEDULE_SUCCESS":
            return {
                // opsscheduleInstance : action.opsschedule
            };
            break;

             // Clear the Instance totally for the Alter Log 
        case "CLEAR_OPSSCHEDULE_INSTANCE":
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

export default opsScheduleReducers;