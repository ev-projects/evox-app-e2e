/**
 *  A dedicated Reducer for User State
 */

const initState = {
    my_dtr_notifications : [],
    birthday_and_anniv : [],
    team_attendance : [],
    recent_dtr : [],
    nav_recent_dtr : [],
    holidays:[],
    changelogs:[],
    todayleaves:[],
    recent_punch:[],
    tommorowleaves:[],
    dashboardholiday:[],
    alterrequest:null,
    overtimerequest:null,
    restdayrequest:null,
    changeschedulerequest:null,
    myalterrequest:null,
    myovertimerequest:null,
    myrestdayrequest:null,
    mychangeschedulerequest:null,
    worktour:true,
    isRecentPunchLoaded: false,
}

const dashboardReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        
        case "FETCH_MY_DTR_NOTIFICATIONS":
            result = {
                ...state,
                my_dtr_notifications : action.data,
            }
            break;
        case "FETCH_BIRTHDAY_ANNIVERSARY":
            result = {
                ...state,
                birthday_and_anniv : action.data,
            }
            break;
        case "FETCH_TEAM_ATTENDANCE_STATUS":
            result = {
                ...state,
                team_attendance : action.data,
            }
            break;
        case "FETCH_RECENT_DTR":
            result = {
                ...state,
                recent_dtr : action.data.content,
                nav_recent_dtr : action.data.content,
                isNavDtrLoaded : true,
            }
            break;     

        case "FETCH_RECENT_PUNCH":
            result = {
                ...state,
                recent_punch : action.data.content,
                // nav_recent_dtr : action.data.content,
                isRecentPunchLoaded : true,
            }
            break;    
            
        case "CLEAR_RECENT_DTR_INSTANCE":
            result = {
                ...state,
                recent_dtr : {},
                nav_recent_dtr : {},
                isNavDtrLoaded : false,
            }
                break;
        case "FETCH_HOLIDAYS":
            result = {
                ...state,
                holidays : action.data,
            }
            break;
        case "FETCH_CHANGE_LOGS":
            result = {
                ...state,
                changelogs : action.data,
            }
            break;
            case "ALTER_LOG_PENDING":
            result = {
                ...state,
                alterrequest : action.alterrequest,
                overtimerequest : action.overtimerequest,
                restdayrequest : action.restdayrequest,
                changeschedulerequest : action.changeschedulerequest,

                myalterrequest : action.myalterrequest,
                myovertimerequest : action.myovertimerequest,
                myrestdayrequest : action.myrestdayrequest,
                mychangeschedulerequest : action.mychangeschedulerequest,
            }
            break;
            case "MY_ALTER_LOG_PENDING":
                result = {
                    ...state,
                    myalterrequest : action.myalterrequest,
                    myovertimerequest : action.myovertimerequest,
                    myrestdayrequest : action.myrestdayrequest,
                    mychangeschedulerequest : action.mychangeschedulerequest,
                }
                break;
                case "TODAY_LEAVES":
                    result = {
                        ...state,
                        todayleaves : action.todayleaves,
                    }
                    break;
                    case "TOMMOROW_LEAVES":
                    result = {
                        ...state,
                        tommorowleaves : action.tommorowleaves,
                    }
                    break;
                    case "WORK_TOUR":
                        result = {
                            ...state,
                            worktour : action.worktour,
                        }
                        break;
                        case "DASHBOARD_HOLIDAY":
                            result = {
                                ...state,
                                dashboardholiday : action.dashboardholiday,
                            }
                            break;
            
        default:
            result = state;
    }
    return result;
}

export default dashboardReducers;