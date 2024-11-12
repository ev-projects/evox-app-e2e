/**
 *  A dedicated Reducer for Payroll Cutoff
 */

const initState = {
    isRolesLoaded: false,
    roles: null,

    isUserRolesPermissionsLoaded: false,
    userRole: null,
    payroll: "Novmber 2024",
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
            case "FETCH_PAYROLL_PERIOD":
                return {
                    payroll : action.payroll,
                };
                break;
        case "FETCH_USER_ROLE_AND_PERMISSION":
            return {
                userRole : action.userRole,
                userPermission : action.userPermission,
                isUserRolesPermissionsLoaded : true,
            };
            break;
        case "FETCH_USER_FEATURES":
            return {
                userLevel : action.userLevel,
                userFeatures : action.userFeatures,
                isUserRolesPermissionsLoaded : true,
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default assignRoleReducers;