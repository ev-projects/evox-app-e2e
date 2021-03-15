/**
 *  A dedicated Reducer for Register User
 */

const initState = {
    isSuccessful: false,
}

const registerUserReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "REGISTER_USER_SUCCESSFUL":
            return {
                isSuccessful : true,
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default registerUserReducers;