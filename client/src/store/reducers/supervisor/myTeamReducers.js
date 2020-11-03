/**
 *  A dedicated Reducer for My Team Reducers
 */

const initState = {
    myTeamList : null
}

const myTeamReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        /**
         *  Login Actions
         */
        case "FETCH_MY_TEAM_LIST_SUCCESS":
            return {
                ...state,
                myTeamList : action.myTeamList
            }
            break;
        /**  */
        
        
        default:
            result = state;
    }
    return result;
}

export default myTeamReducers;