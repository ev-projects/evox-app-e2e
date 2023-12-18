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

const dtrSummary = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  1. Trigger error event
         *  2. Paginate DTR export
         *  3. Paginate DTR Summary
         */
        case "FETCH_DTR_SUMMARY_BATCH_ERROR":
            Formatter.alert_error( action.e );
            return {
                instance : {},
                isListLoaded : false,
                pagination: {
                    current_page: 1,
                    last_page: 1,
                    has_next_page: false,
                },
                dtrItems: []
            };
            break;
        case "FETCH_DTR_EXPORT_BACTH_SUCCESS":
            return {
                instance : {},
                isListLoaded : false,
                pagination: {
                    current_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.current_page : 1,
                    last_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.last_page : 1,
                    has_next_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.has_next_page : false,
                },
                dtrItems: []
            };
            break;
        case "FETCH_DTR_EXPORT_SUCCESS":
            var fileURL = window.URL.createObjectURL(new Blob([action.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', 'dtr_summary.csv');
            document.body.appendChild(fileLink);
            fileLink.click();
            return {
                instance : {},
                isListLoaded : false,
                pagination: {
                    current_page: 1,
                    last_page: 1,
                    has_next_page: false,
                },
                dtrItems: []
            };
            case "FETCH_DTR_CONFLICT_EXPORT_SUCCESS":
                var fileURL = window.URL.createObjectURL(new Blob([action.data]));
                var fileLink = document.createElement('a');
                fileLink.href = fileURL;
                fileLink.setAttribute('download', 'dtr_conflict_data.csv');
                document.body.appendChild(fileLink);
                fileLink.click();
                return {
                    instance : {},
                    isListLoaded : false,
                    pagination: {
                        current_page: 1,
                        last_page: 1,
                        has_next_page: false,
                    },
                    dtrItems: []
                };
                break;
            break;
        // Apply the Instance that was recently fetched
        case "FETCH_DTR_SUMMARY_SUCCESS":
            return {
                instance : action.dtrSummary,
                isListLoaded : action.dtrSummary.has_next_page == false,
                pagination: {
                    current_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.current_page : 1,
                    last_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.last_page : 1,
                    has_next_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.has_next_page : false,
                },
                dtrItems: processItems(action.dtrSummary.current_page, result.dtrItems, action.dtrSummary.summary)
            };
            break;
            case "FETCH_NEW_DTR_SUMMARY_SUCCESS":
                return {
                    instance : action.dtrSummary,
                    isListLoaded : true,
                    pagination: {
                        current_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.current_page : 1,
                        last_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.last_page : 1,
                        has_next_page: action.dtrSummary.current_page < action.dtrSummary.last_page ? action.dtrSummary.has_next_page : false,
                    },
                    dtrItems:  action.dtrSummary.dtrItems
                };
                break;
        default:
            result = state;
    }
    return result;
}

function processItems(current_page, dtrItems, items) {
    var dtr_items = [];
    if (current_page == 1) {
        dtr_items = items;
    } else {
        dtr_items = dtrItems.concat(items);
    }
    //console.log(dtr_items);
    return dtr_items;
}

export default dtrSummary;