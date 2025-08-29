/**
 *  A dedicated Reducer for Fresh Service State
 */

const initState = {
    isInstanceLoaded: false,
    instance: {},
}

const freshServiceReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
      /**
       *  Fresh Service Actions
       */
      case "FETCH_WORKSPACES_SUCCESS":
        return {
          ...state,
          workspaces : action.workspaces,
          categories : action.categories,
          sub_categories : action.sub_categories,
          isInstanceLoaded : action.isLoaded,
        };
        break;

      // Clear the Instance totally for the FreshService
      case "CLEAR_FRESHSERVICE_INSTANCE":
        return {
          instance : {},
          isInstanceLoaded : false
        };
        break;
      default:
        result = state;
    }
    return result;
}

export default freshServiceReducers;