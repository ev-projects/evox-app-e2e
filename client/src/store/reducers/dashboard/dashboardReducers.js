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
    approval:null,
    announcement:null,
    celebration:null,
    missingdtr:null,
    alldata:null,
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
            case "FETCH_MY_NOTIFICATIONS":
            result = {
                ...state,
                my_notifications : action.data,
            }
            break;
            case "FETCH_MY_COUNTRY":
            result = {
                ...state,
                my_country : action.data,
            }
            break;
            case "FETCH_PAYROLL_CUTOFF":
                result = {
                    ...state,
                    payroll_cutoff : action.data,
                }
                break;
            case "FETCH_MY_POLICIES_DOC":
            result = {
                ...state,
                my_doc : action.data,
            }
            break;
            case "FETCH_MY_POLICY_DOC":
            result = {
                ...state,
                my_doc_file : action.data,
            }
            break;
            case "CLEAR_MY_POLICY_DOC":
            result = {
                ...state,
                my_doc_file : [],
            }
            break;
            case "FETCH_MY_DEPT":
                result = {
                    ...state,
                    my_department : action.data,
                }
                break;
                case "FETCH_DISPUTE_LIST":
                    result = {
                        ...state,
                        dispute_list : action.data,
                    }
                    break;
                    case "FETCH_DEP_USER_LIST":
                        result = {
                            ...state,
                            user_list : action.data,
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
                recent_dtr : action.recent_dtr,
                nav_recent_dtr : action.recent_dtr,
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
                            case "FETCH_MY_NOTIFICATIONS_COUNT":
                                result = {
                                    ...state,
                                    approval : action.approval,
                                    announcement : action.announcement,
                                    celebration : action.celebration,
                                    missingdtr : action.missingdtr,
                                    alldata : action.alldata,
                                }
                                break;
                case "FETCH_MOROCCO_PAYROLL_PARAMS":
                    result = {
                        ...state,
                        morocco_payroll_params : action.data,
                    }
                    break;
            
        default:
            result = state;
    }
    return result;
}

export default dashboardReducers;