import API from "../../../services/API";
import Formatter from "../../../services/Formatter";

// Fetch Workspaces
let workspacesFetched = false;

export const fetchWorkSpaces = () => {
  return async (dispatch, getState) => {
    if (workspacesFetched) {
      console.log("⚠️ Already fetched, skipping API call");
      return;
    }

    workspacesFetched = true; // set before the API call

    console.log("🎯 Fetching workspaces from API");
    try {
      const result = await API.call({
        method: 'get',
        url: '/freshservice/workspaces/',
      });

      console.log("✅ API call success");
      dispatch({
        type: 'FETCH_WORKSPACES_SUCCESS',
        workspaces: result.data.content[0],
        categories: result.data.content[1],
        sub_categories: result.data.content[2],
        isLoaded: true
      });
    } catch (e) {
      console.error('❌ Error during API call:', e);
      dispatch(Formatter.alert_error(e));
    }
  };
};
