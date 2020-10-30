/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isDtrLoaded : false,
    isFilterLoaded : false,
    list: [],
    filter: [],
    selectedPayrollCutoff: {}
}

const dtrReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_DTR_SUCCESS":
            result = {
                ...state,
                list : action.list,
                isDtrLoaded : true,
            }
            break;

        case "FETCH_DTR_FILTER_SUCCESS":
            result = {
                ...state,
                filter : action.filter,
                isFilterLoaded : true,
            }
            break;
            
        case "FETCH_DTR_FAILED":
            message = "Fetching Dtr Failed!"
            return {
                ...action.error,
            }
            break;
        
        case "SET_SELECTED_PAYROLL_CUTOFF":
            return {
                ...state,
                selectedPayrollCutoff : action.payrollCutoff
            };
            break;
        
        
        default:
            result = state;
    }
    return result;
}

export default dtrReducer;