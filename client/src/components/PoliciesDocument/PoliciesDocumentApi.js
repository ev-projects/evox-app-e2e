import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const fecthUserContry =  (id) =>{

  let endpoint = ""

  if(id === 0){
      endpoint= "/user/getusercountry";
  }else{
    endpoint= "/user/getcountry";
  }

    return async (dispatch, getState) => {

      await API.call({
          method: "get",
          url: endpoint,
        })
          .then((result) => {
            dispatch({
              type: 'FETCH_MY_COUNTRY',
              data: result.data, // Ensure you're dispatching the correct data structure
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}

export const fecthUserDepartment =  (Gtype,CountryId,UserId) =>{

  let endpoint = ""

    endpoint= `/get_user_departments?GlobalType=${Gtype}&CountryId=${CountryId}&UserId=${UserId}`;
  

    return async (dispatch, getState) => {

      await API.call({
          method: "get",
          url: endpoint,
        })
          .then((result) => {
            dispatch({
              type: 'FETCH_MY_DEPT',
              data: result.data, // Ensure you're dispatching the correct data structure
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}

export const fetchPolicyDocument = (Id) =>{

  let endpoint = ""

    endpoint= `/download_policy/${Id}`;
  

    return async (dispatch, getState) => {

      await API.call({
          method: "get",
          url: endpoint,
        })
          .then((result) => {
            dispatch({
              type: 'FETCH_MY_POLICY_DOC',
              data: result.data[0], // Ensure you're dispatching the correct data structure
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}