/**
 *  A dedicated Reducer for Payroll Cutoff
 */

const initState = {
    isRolesLoaded: false,
    roles: null,

    isUserRolesLoaded: false,
    userRole: null,

    isUserListLoaded: false,
    userLists: {},
}

const assignRoleReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        // Apply the Instance that was recently fetched
        case "FETCH_ROLES":

            return {
                roles : action.roles,
                isRolesLoaded : true,
            };
            break;
        case "FETCH_USER":
            return {
                userLists : action.userLists,
                isUserListLoaded : true,
            };
            break;
        case "FETCH_USER_ROLE":
            return {
                userRole : action.userRole,
                isUserRolesLoaded : true,
            };

          
                break;
        default:
            result = state;
    }
    return result;
}

export default assignRoleReducers;