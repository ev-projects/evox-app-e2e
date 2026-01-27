
import moment from 'moment';
/**
 *  A dedicated Reducer for User State
 */

const initState = {
    error_message : ""
}

const userReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "LOGIN_SUCCESS":
            message = "Login Success!"
            //console.log(action.user);
            localStorage.setItem("user_server_timestamp", action.user.user_server_timestamp);//based on code from API code, "user_server_timestamp" was already converted to User Local Time
            localStorage.setItem("user_server_timestamp_mils", action.user.user_server_timestamp_mils);//based on code from API code, "user_server_timestamp_mils" was already converted to User Local Time
            localStorage.setItem("user_local_offset_mils", action.user.user_offset_seconds * 1000);
            localStorage.setItem("user_local_timestamp_mils", action.user.user_server_timestamp_mils);//based on code from API code, "user_server_timestamp_mils" was already converted to User Local Time
            //console.log('Server TS', new Date(action.user.user_server_timestamp_mils));
            //console.log('Local TS', new Date(action.user.user_server_timestamp_mils + (action.user.user_offset_seconds * 1000)));
            return {
                ...action.user,
                payload : action.payload
            }
            break;
        /**  */

        /**
         *  Logout Actions
         */
        case "LOGOUT_SUCCESS":
            message = "Login Success!"
            localStorage.removeItem("user_server_timestamp");
            localStorage.removeItem("user_server_timestamp_mils");
            localStorage.removeItem("browser_timestamp_mils");
            return {
                ...initState,
                clearLoginParameters : true
            };
            break;
        case "LOGOUT_FAILED":
            message = "Login Failed!"
            return {
                ...action.error,
            }
            break;
        /**  */

        case "FETCH_USER_SUCCESS":
            message = "Reload User Success!";
            localStorage.setItem("user_server_timestamp", action.user.user_server_timestamp);//based on code from API code, "user_server_timestamp" was already converted to User Local Time
            localStorage.setItem("user_server_timestamp_mils", action.user.user_server_timestamp_mils);//based on code from API code, "user_server_timestamp_mils" was already converted to User Local Time
            localStorage.setItem("user_local_offset_mils", action.user.user_offset_seconds * 1000);
            localStorage.setItem("user_local_timestamp_mils", action.user.user_server_timestamp_mils);//based on code from API code, "user_server_timestamp_mils" was already converted to User Local Time
            return {
                ...action.user,
                payload : action.payload,
            }
            break;

        case "TOGGLE_FORCE_CHANGE_PASSWORD":

            return {
                ...state,
                force_change_password : false,
            }
            break;

        case "TICK_DPA":

            return {
                ...state,
                dpa_ticked_at : moment().format("YYYY-MM-DD HH:mm:ss"),
            }
            break;

        case "UPDATE_USER":
            // Update the User if the currently logged user is the one being updated.
            if( state.id == action.user?.id ) {
                return {
                    ...state,
                    ...action.user
                }
            }
            break;

        case "UPDATE_USER":
            const user_index = action.department.department_handlers.findIndex((user) => user.emp_num === state.emp_num)
            const department_index = state.departments_handled.findIndex((department) => department.id === action.department.id)

            // If User exist in the Department Handlers 
            if( user_index >= 0 ){
                
                // If the Department is not yet on the Current User's Departments Handled state, proceed on pushing the new Department on the Current User's Departments Handled state
                if( department_index == -1 ){   
                    state.departments_handled.push(action.department);
                    state.departments_handled.sort(function(a,b) {return (a.department_name > b.department_name) ? 1 : ((b.department_name > a.department_name) ? -1 : 0);} );
                    
                } 
            } else {

                // If the Department is already on the Current User's Departments Handled state, proceed on removing th Department on the Current User's Departments Handled state
                if( department_index >= 0 ){
                    state.departments_handled = state.departments_handled.filter(department => department.id != action.department.id)
                }
            }
            return {
                ...state
            }
            break;

        case "FETCH_USER_ASSET":
            return {
                ...state,
                user_asset: action.data,
                is_asset_loaded: action.is_asset_loaded
            }
            break;

        case "FETCH_USER_ASSETS":
            return {
                ...state,
                user_assets: action.data,
                is_asset_loaded: action.is_asset_loaded
            }
            break;

        case "CLEAR_USER_ASSET_LOAD":
            return {
                ...state,
                is_asset_loaded: action.is_asset_loaded
            }
            break;
            

        case "FETCH_USER_FAILED":
            message = "Reload User Failed!"
            return {
                ...action.error,
            }
            break;

        case "FETCH_ALL_ASSETS":
            return {
                ...state,
                all_assets: action.data,
                is_all_asset_loaded: action.is_all_asset_loaded,
                asset_reports_filter: action.filters
            }
            break;

        case "FETCH_ALL_ASSETS":
            return {
                ...state,
                all_assets: action.data,
                is_all_asset_loaded: action.is_all_asset_loaded,
                asset_reports_filter: action.filters
            }
            break;

        case "FETCH_USER_EVA":
            return {
                ...state,
                user_eva: action.data,
                is_eva_loaded: action.is_eva_loaded
            }
            break;

        case "CLEAR_USER_EVA":
            return {
                ...state,
                is_eva_loaded: action.is_eva_loaded
            }
            break;

        case "FETCH_USER_COC":
            return {
                ...state,
                user_coc: action.data,
                is_coc_loaded: action.is_coc_loaded
            }
            break;

        case "CLEAR_USER_COC":
            return {
                ...state,
                is_coc_loaded: action.is_coc_loaded
            }
            break;

        case "FETCH_USER_EVA_REG":
            return {
                ...state,
                user_eva_reg: action.data,
                is_eva_reg_loaded: action.is_eva_reg_loaded
            }
            break;

        case "CLEAR_USER_EVA_REG":
            return {
                ...state,
                is_eva_reg_loaded: action.is_eva_reg_loaded
            }
            break;

        case "FETCH_USER_HAPPINESS_SURVEY":
            return {
                ...state,
                user_happiness_survey: action.data,
                is_happiness_survey_loaded: action.is_happiness_survey_loaded
            }
            break;

        case "CLEAR_USER_HAPPINESS_SURVEY":
            return {
                ...state,
                is_happiness_survey_loaded: action.is_happiness_survey_loaded
            }
            break;
        /**  */
        
        
        
        default:
            result = state;
    }
    return result;
}

export default userReducer;