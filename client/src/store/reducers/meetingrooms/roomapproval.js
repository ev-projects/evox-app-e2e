const initState = {
   roomname:"",
   startdate:"",
   enddate:"",
   note:"",
   username:"",
   userid:"",
   status:"",
   approvernote:"",
   itrequirement:"",
   location:"",
   newlocation:"",
   roomlist:[],
   total_page_count:1,
   current_page_count:1,
   roomname:"",
   locationname:"",
   description:"",
   noofseats:"",
   locationlist:[],
   itrequirementlist:[],
   totalpage_count_itrequirement:1,
   currentpage_count_itrequirement:1,
   dropdownlocation:[],
   dropdownrooms:[],
   itrequirementmaster:[],
}

const meetingroomReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        
        case "MEETING_ROOM_APPROVAL":
            result = {
                ...state,
                roomname : action.roomname,
                startdate : action.startdate,
                enddate : action.enddate,
                note : action.note,
                username : action.username,
                userid : action.userid,
                status : action.status,
                approvernote : action.approvernote,
                itrequirement : action.itrequirement,
            }
            break;
            case "UPDATE_LOCATION":
                result = {
                    ...state,
                    location : action.location,
                    newlocation:action.newlocation,
                }
                break;
                case "FECTH_ROOM_LIST":
                result = {
                    ...state,
                    roomlist : action.roomlist,
                    locationname:action.locationname,
                    total_page_count:action.total_page_count,
                    current_page_count:action.current_page_count,
                }
                break;
                case "UPDATE_ROOM":
                result = {
                    ...state,
                    roomname : action.roomname,
                    locationname:action.locationname,
                    description:action.description,
                    noofseats:action.noofseats,
                }
                break;
                case "FECTH_LOCATION_LIST":
                    result = {
                        ...state,
                        locationlist:action.locationlist,
                    }
                    break;
                    case "FECTH_ITREQUIREMENT_LIST":
                    result = {
                        ...state,
                        itrequirementlist:action.itrequirementlist,
                        totalpage_count_itrequirement:action.totalpage_count_itrequirement,
                        currentpage_count_itrequirement:action.currentpage_count_itrequirement,
                    }
                    break;
                    case "FETCH_DROPDOWN_LOCATION":
                        result = {
                            ...state,
                            dropdownlocation:action.dropdownlocation,
                        
                        }
                        break;
                        case "FETCH_DROPDOWN_ROOMS":
                            result = {
                                ...state,
                                dropdownrooms:action.dropdownrooms,
                            }
                            break;
                        case "FETCH_IT_REQUIREMENT_MASTER":
                                result = {
                                    ...state,
                                    itrequirementmaster:action.itrequirementmaster,
                                }
                                break;
       
        default:
            result = state;
    }
    return result;
}

export default meetingroomReducers;