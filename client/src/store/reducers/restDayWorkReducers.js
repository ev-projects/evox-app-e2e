/**
 *  A dedicated Reducer for Rest Day Work
 */

const initState = {
    isInstanceLoaded: false,
    instance: {}
}

const restDayWorkReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        // Apply the Instance that was recently fetched
        case "FETCH_REST_DAY_WORK_SUCCESS":
            return {
                instance : action.restDayWork,
                isInstanceLoaded : true
            };
            break;

        // Resets the Instance of the Rest Day Work but retains the ID so it would be reused.
        case "RESET_REST_DAY_WORK_INSTANCE":
            return {
                instance : {
                    id   :    state.instance.id
                },
                isInstanceLoaded : true
            };
            break;

        // Clear the Instance totally for the Rest Day Work
        case "CLEAR_REST_DAY_WORK_INSTANCE":
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

export default restDayWorkReducers;