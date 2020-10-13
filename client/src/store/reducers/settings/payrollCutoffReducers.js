/**
 *  A dedicated Reducer for Payroll Cutoff
 */

const initState = {
    isListInstanceLoaded: false,
    listInstance: {},
    isInstanceLoaded: false,
    instance: {}
}

const payrollCutoffReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        // Apply the Instance that was recently fetched
        case "FETCH_PAYROLL_CUTOFF_LIST_SUCCESS":
            return {
                ...state,
                listInstance : action.list,
                isListInstanceLoaded : true
            };
            break;
            
        // Apply the Instance that was recently fetched
        case "FETCH_PAYROLL_CUTOFF_SUCCESS":
            return {
                ...state,
                instance : action.payrollCutoff,
                isInstanceLoaded : true
            };
            break;

        // Clear the Instance totally for the Payroll Cutoff
        case "CLEAR_PAYROLL_CUTOFF_INSTANCE":
            return {
                ...state,
                instance : {},
                isInstanceLoaded : false
            };
            break;

        // Clear the Instance totally for the Payroll Cutoff 
        case "CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE":
            return {
                ...state,
                listInstance : {},
                isListInstanceLoaded : false
            };
            break;
            
        default:
            result = state;
    }
    return result;
}

export default payrollCutoffReducers;