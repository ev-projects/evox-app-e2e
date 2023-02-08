/**
 *  A dedicated Reducer for HR Announcement
 */

const initState = {
    isListInstanceLoaded: false,
    listInstance: {},
    isInstanceLoaded: false,
    instance: {},
}

const hrAnnouncementReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {

        // Apply the Instance that was recently fetched
        case "FETCH_HR_ANNOUNCEMENTS_LIST_SUCCESS":
            return {
                ...state,
                listInstance : action.list,
                isListInstanceLoaded : true,
            };
            break;
            
        default:
            result = state;
    }
    return result;
}

export default hrAnnouncementReducers;