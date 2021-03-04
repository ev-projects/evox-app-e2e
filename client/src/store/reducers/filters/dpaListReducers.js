/**
 *  A dedicated Reducer for DPA List
 */

const initState = {
    list : null,
    filters : {}
}

const dpaListReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        case "FETCH_DPA_LIST_SUCCESS":
            return {
                ...state,
                list : action.list
            }
            break;
        
        case "SET_DPA_LIST_FILTERS":
            return {
                ...state,
                filters : action.filters
            }
            break;
        /**  */
        
        
        default:
            result = state;
    }
    return result;
}

export default dpaListReducers;