/**
 *  A dedicated Reducer for Syncing
 */

const initState = {
    department: [],
    isDepartmentAnnouncementListLoaded : false,
}

const departmentAnnouncementReducers = (state = initState, action) => {

    let message = "";
    let result = {...state};
    switch(action.type) {


        case "FETCH_DEPARTMENT_ANNOUNCMENT_INDEX_LOAD_SUCCESS":

            return {
                ...state,
                depAnnouncementlist : action.list,
                isDepartmentAnnouncementListLoaded : true
            };
        break;
        case "FETCH_DEPARTMENT_ANNOUNCMENT_SUCCESS":
            return {
                instance : action.announcement,
                isInstanceLoaded : true
            };
        break;
      
        default:
            result = state;
    }
    return result;
}

export default departmentAnnouncementReducers;