/**
 *  A dedicated Reducer for Change Schedule
 */

import Formatter from "../../../services/Formatter";

const initState = {
    isListLoaded: false,
    instance: {},
    pagination: {current_page: 1, last_page: 1, has_next_page: false},
    dtrItems: [],
}

const dtrConflict = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  1. Trigger error event
         *  2. Paginate DTR export
         *  3. Paginate DTR Summary
         */
         case "FETCH_DTR_CONFLICT_REPORT_SUCCESS":
                    return {
                        instance : action.dtrConflict,
                        isListLoaded : true,
                        pagination: {
                            current_page: action.dtrConflict.current_page < action.dtrConflict.last_page ? action.dtrConflict.current_page : 1,
                            last_page: action.dtrConflict.current_page < action.dtrConflict.last_page ? action.dtrConflict.last_page : 1,
                            has_next_page: action.dtrConflict.current_page < action.dtrConflict.last_page ? action.dtrConflict.has_next_page : false,
                        },
                        dtrItems:  action.dtrConflict.dtrItems
                    };
                    break;
        default:
            result = state;
    }
    return result;
}


export default dtrConflict;