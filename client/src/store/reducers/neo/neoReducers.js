/**
 *  A dedicated Reducer for NEO State
 */

const initState = {
  isInstanceLoaded: false,
  instance: {},
}

const neoReducers = (state = initState, action) => {
  let message = "";
  let result = {...state};
  switch(action.type) {
    /**
     *  NEO Actions
     */
    case "FETCH_NEO_ONBOARDING_SUCCESS":
      return {
        ...state,
        neo_onboarding : action.list,
        neo_onboarding_loaded : action.isLoaded,
      };
      break;

    case "FETCH_NEO_SUBMISSION_SUCCESS":
      return {
        ...state,
        neo_submissions : action.list,
        neo_submissions_loaded : action.isLoaded,
      };
      break;

    case "FETCH_NEO_SUBMISSION_DATA_SUCCESS":
      return {
        ...state,
        neo_submission_data : action.data,
        neo_submission_data_loaded : action.isLoaded,
        neo_bhr_num : action.bhr_num,
      };
      break;

    default:
      result = state;
  }
  return result;
}

export default neoReducers;