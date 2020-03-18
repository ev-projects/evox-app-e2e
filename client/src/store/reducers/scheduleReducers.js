/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isScheduleLoaded : false,
    isTemplateListLoaded : false,
    isTemplateDataLoaded: false,
    templateSched: '',
    templateList : [],
    defaultSchedule: [],
}

const scheduleReducer = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_DEFAULT_SCHEDULE_SUCCESS":
            message = "Default Schedule"
            return {
                defaultSchedule : action.schedule,
                templateList : state.templateList,
                isScheduleLoaded : true,
            };
            break;
        case "FETCH_TEMPLATE_DEFAULT_SCHEDULE_SUCCESS":
            message = "Template Schedule"
            return {
                defaultSchedule : state.defaultSchedule,
                templateList : state.templateList,
                templateData : action.templatedata,
                isTemplateDataLoaded : true,
                isScheduleLoaded : true,
            };
            break;
        case "FETCH_TEMPLATE_SCHEDULE_SUCCESS":
            message = "Template Schedule"
            return {
                ...action.templatedata,
                isScheduleLoaded : true
            };
            break;
        case "FETCH_TEMPLATES_SCHEDULE_SUCCESS":
            message = "List of Template Schedule"
            return {
                templateList : action.template,
                isTemplateListLoaded : true
            };
            break;

        case "FETCH_DEFAULT_SCHEDULE_FAILED":
            message = "Login Failed!"
            return {
                ...action.error,
            }
            break;

        
        
        default:
            result = state;
    }
    return result;
}

export default scheduleReducer;