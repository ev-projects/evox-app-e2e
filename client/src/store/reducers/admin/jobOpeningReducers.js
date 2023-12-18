/**
 *  A dedicated Reducer for Syncing
 */

const initState = {
    careers: [],
    isCareerListLoaded : false,
}

const jobOpeningReducers = (state = initState, action) => {

    let message = "";
    let result = {...state};
    switch(action.type) {
      
        case "FETCH_CAREERS_SUCCESS":
            return {
                ...state,
                careerlist : action.list
            };
            break;
        default:
            result = state;
    }
    return result;
}

export default jobOpeningReducers;