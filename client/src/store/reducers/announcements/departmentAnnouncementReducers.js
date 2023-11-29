/**
 *  A dedicated Reducer for Syncing
 */

const initState = {
    department: [],
    isDepartmentAnnouncementListLoaded : false,
    hideShowMore : false,
}

const departmentAnnouncementReducers = (state = initState, action) => {

    let message = "";
    let result = {...state};
    switch(action.type) {


        case "FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS":

            return {
                ...state,
                depAnnouncementlist : action.list,
                isDepartmentAnnouncementListLoaded : true,
                hideShowMore : false
            };
        break;

        case "INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS":
            // concsole.log(action.list);
        return {
            ...state,
            depAnnouncementlist :  state.depAnnouncementlist.concat(action.list),
            isDepartmentAnnouncementListLoaded : true,
            hideShowMore : action.list.length == 0 ||action.list.length < 3,
        };
    break;
        
        case "FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS":
            return {
                instance : action.announcement,
                isInstanceLoaded : true
            };
        break;
        case "CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE":
            return {
                instance: {},
                isInstanceLoaded : false,
            };
        break;
        case "CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE":
            return {
                depAnnouncementlist : {},
                isDepartmentAnnouncementListLoaded : false,
                hideShowMore : false
                
            };
        break;
        default:
            result = state;
    }
    return result;
}

export default departmentAnnouncementReducers;