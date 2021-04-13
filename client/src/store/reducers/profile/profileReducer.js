/**
 *  A dedicated Reducer for Profile State
 */

const initState = {
    details : {},
    profilePicture : [],
    job_information: [],
    closeAllForm: false,
    mobile_phone : '',
    job_title : ''
}

const profileReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "FETCH_PROFILE":
            return {
                ...state,
                details : action.user,
                profilePicture : action.profilePicture,
                mobile_phone : action.mobile_phone,
                job_title : action.job_title
            }
            break;

        case "FETCH_JOB_INFORMATION":
            return {
                ...state,
                details : action.user,
                profilePicture : action.profilePicture,
                job_information : action.job_information,
                employment_status : action.employment_status,
                job_title : action.job_title
            }
                break;
        /**  */

        case "FETCH_TIME_OFF":
            return {
                ...state,
                details : action.user,
                profilePicture : action.profilePicture,
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