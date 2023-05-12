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

        // Apply the Instance that was recently fetched
        case "FETCH_HR_ANNOUNCEMENT_SUCCESS":
            return {
                instance: action.list,
                isListInstanceLoaded : true,
            };
            break;

        // Clear the Instance totally for the HR Announcement
        case "CLEAR_HR_ANNOUNCEMENT_INSTANCE":
            return {
                instance: {},
                isListInstanceLoaded : false,
            };

        default:
            result = state;
    }
    return result;
}

export default hrAnnouncementReducers;