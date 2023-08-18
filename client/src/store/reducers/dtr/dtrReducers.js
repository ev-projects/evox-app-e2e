/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isDtrLoaded : false,
    isFilterLoaded : false,
    isDtrSummaryLoaded : false,
    dtrSummary : { column : null , data : null},
    column_name : null,
    employeeInfo : null,
    list: [],
    filter: [],
    selectedPayrollCutoff: {},
    incompleteDtr: {},
    punch_list: [],
    isListPunchLoaded : false,
    single_punch_list: [],
    isSingleListPunchLoaded: false,
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
        case "FETCH_PUNCH_SUCCESS":
            result = {
                ...state,
                punch_list : action.list,
                isListPunchLoaded : true,
            }
            break;

        case "FETCH_SINGLE_PUNCH_SUCCESS":
            console.log(action);
            result = {
                ...state,
                single_punch_list :  action.data.content,
                isSingleListPunchLoaded : true,
            }
            break;

        case "FETCH_DTR_FILTER_SUCCESS":
            result = {
                ...state,
                filter : action.filter,
                isFilterLoaded : true,
            }
            break;

   
            case "FETCH_USER_DTR_SUMMARY_SUCCESS":
            result = {
                ...state,
                dtrSummary : action.dtrSummary,
                isDtrSummaryLoaded : true,
                column_name : action.column_names,
                employeeInfo : action.employeeInfo
                
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
        
        case "FETCH_INCOMPLETE_DTR":
            return {
                ...state,
                incompleteDtr : action.data.data
            };
            break;
        
        
        default:
            result = state;
    }
    return result;
}

export default dtrReducer;