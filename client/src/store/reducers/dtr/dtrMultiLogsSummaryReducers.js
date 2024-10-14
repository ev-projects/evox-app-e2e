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

const dtrMultiLogsSummary = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        case "FETCH_DTR_MULTI_LOGS_SUMMARY_SUCCESS":
            return {
                instance : action.dtrMultiLogsSummary,
                isListLoaded : true,
                dtrItems:  action.dtrMultiLogsSummary.dtrItems
            };
            break;
        case "FETCH_DTR_MULTI_LOGS_EXPORT_SUCCESS":
            var fileURL = window.URL.createObjectURL(new Blob([action.data]));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', 'dtr_multi_logs_summary.csv');
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

export default dtrMultiLogsSummary;