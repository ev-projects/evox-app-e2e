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
            message = "Reload User Success!"
            return {
                ...action.user,
                payload : action.test,
            }
            break;

        case "UPDATE_USER_DEPARTMENT_HANDLED":
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
            

        case "FETCH_USER_FAILED":
            message = "Reload User Failed!"
            return {
                ...action.error,
            }
            break;
        /**  */
        
        
        
        default:
            result = state;
    }
    return result;
}

export default userReducer;