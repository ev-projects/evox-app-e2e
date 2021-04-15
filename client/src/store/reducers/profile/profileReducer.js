/**
 *  A dedicated Reducer for Profile State
 */

const initState = {
    details : {},
    profile_picture : "",
    personal_information : [],
    job_information: [],
    time_off: [],
    closeAllForm: false,
}

const profileReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "FETCH_PROFILE":
            return {
                ...state,
                details : action.user,
                profile_picture : action.profile_picture
            }
            break;

        case "FETCH_PERSONAL_INFORMATION":
            return {
                ...state,
                personal_information : action.personal_information
            }
            break;

        case "FETCH_JOB_INFORMATION":
            return {
                ...state,
                job_information : action.job_information,
                employment_status : action.employment_status
            }
                break;
        /**  */

        case "FETCH_TIME_OFF":
            return {
                ...state,
                leaves_list : action.leaves_list
            }
                break;
        /**  */

        case "CLOSE_ALL_FORM":
            return {
                ...state,
                closeAllForm : true
            };
            break;

        /**  */
        
        
        default:
            result = state;
    }
    return result;
}

export default profileReducer;