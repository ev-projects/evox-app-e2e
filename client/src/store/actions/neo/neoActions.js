import API from "../../../services/API";
import Formatter from "../../../services/Formatter";

/**
 *  A dedicated repository of Actions for NEO
 */

// Fetch Neo Onboarding Users
export const fetchNeoOnboardingUsers = ( country ) => {
    return async (dispatch, getState) => {
      API.call({
        method: "get",
        url: "/get_neo_onboarding_users/",
        params: {
          country: country
        }
      })
      .then((result) => {
        if (result.status === 200) {
          dispatch({
            'type'      : 'FETCH_NEO_ONBOARDING_SUCCESS', 
            'list'      : result.data.data.users,
            'isLoaded'  : true
          })
        }
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
    }
}

// Send Neo Onboarding Link to User
export const sendNeoOnboardingLink = ( guid, user_id, country ) => {
  return async (dispatch, getState) => {
    API.call({
      method: "post",
      url: "/send_onboarding_link/",
      params: {
        guid: guid,
        user_id: user_id,
        country: country
      }
    })
    .then((result) => {
      if (result.status === 200) {
        dispatch(Formatter.alert_success(result, 3000));
      }
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
  }
}

// Fetch Neo Submission Users
export const fetchNeoSubmissionUsers = ( country ) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: "/get_users_pending_submissions/",
      params: {
        country: country
      }
    })
    .then((result) => {
      if (result.status === 200) {
        dispatch({
          'type'      : 'FETCH_NEO_SUBMISSION_SUCCESS', 
          'list'      : result.data.data.submissions,
          'isLoaded'  : true
        })
      }
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
  }
}

// Fetch Neo Submission Data
export const fetchNeoSubmissionData = ( guid ) => {
  return (dispatch, getState) => {
    API.call({
      method: "get",
      url: "/get_user_submissions_data/",
      params: {
        guid: guid
      }
    })
    .then((result) => {
      if (result.status === 200) {
        dispatch({
          'type'      : 'FETCH_NEO_SUBMISSION_DATA_SUCCESS', 
          'data'      : result.data.data.submissions,
          'isLoaded'  : true,
          'bhr_num'   : result.data.data.bhrNumber
        })
      }
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
  }
}