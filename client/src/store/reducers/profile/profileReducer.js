/**
 *  A dedicated Reducer for Profile State
 */

const initState = {
    details : {},
    closeAllForm: false
}

const profileReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "FETCH_PROFILE":
            return {
                ...state,
                details : action.user,
                profilePicture : action.profilePicture
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