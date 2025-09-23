
/**
 *  A dedicated Reducer for My Dispute Request List
 */

const initState = {
  isListLoaded: false,
  isNumbersLoaded: false,
  instance: {},
  statusNumbers: null,
  filters : {}
}

const myDisputeRequestListReducers = (state = initState, action) => {
  let message = "";
  let result = {...state};
  switch(action.type) {
    case "FETCH_MY_DISPUTE_REQUEST_LIST_SUCCESS":
      return {
        ...state,
        instance : action.disputeRequestList,
        instanceCount: action.disputeRequestCount,
        isListLoaded : true
      };
      break;

    default:
      result = state;
  }
  return result;
}


export default myDisputeRequestListReducers;