/**
 *  A dedicated Reducer for Profile State
 */

const initState = {
    details: {},
    profile_picture: "",
    personal_information: [],
    job_information: [],
    time_off: [],
    closeAllForm: false,
    schedule: [],
    temporary_schedule: [],
    date_list:[],
    week_list:[],
    dates:[],
    scope:"week",
    emp_sched:[]
}

const profileReducer = (state = initState, action) => {
    let message = "";
    let result = { ...state };
    switch (action.type) {

        case "FETCH_PROFILE":
            return {
                ...state,
                details: action.user,
                profile_picture: action.profile_picture
            }
            break;

        case "FETCH_PERSONAL_INFORMATION":
            return {
                ...state,
                personal_information: action.personal_information
            }
            break;

        case "FETCH_JOB_INFORMATION":
            return {
                ...state,
                job_information: action.job_information,
                employment_status: action.employment_status
            }
            break;
        /**  */

        case "FETCH_TIME_OFF":
            return {
                ...state,
                leaves_list: action.leaves_list
            }
            break;
        /**  */

        case "FETCH_LEAVE_CREDITS":
            return {
                ...state,
                leave_credits: action.leave_credits
            }
            break;
        /**  */

        case "FETCH_SCHEDULE":
            return {
                ...state,
                schedule: action.schedule
            }
            break;
        /**  */

        case "FETCH_TEMPORARY_SCHEDULE":
            return {
                ...state,
                temporary_schedule: action.schedule
            }
            break;
        /**  */

        case "SET_DATE_LIST":
            return {
                ...state,
                date_list: action.date_list
            }
            break;
        /**  */

        case "SET_EMP_SCHEDULE":
            return {
                ...state,
                emp_sched: action.emp_sched
            }
            break;
        /**  */

        case "SET_WEEK_LIST":
            return {
                ...state,
                week_list: action.data.week_list,
                dates: action.data.dates_list
            }
            break;
        /**  */

        case "SET_SCOPE":
            return {
                ...state,
                scope: action.scope,
            }
            break;
        /**  */

        case "CLOSE_ALL_FORM":
            return {
                ...state,
                closeAllForm: true
            };
            break;

        /**  */


        default:
            result = state;
    }
    return result;
}

export default profileReducer;