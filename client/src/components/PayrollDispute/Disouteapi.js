import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const fecthdepartment=  () =>{


    return async (dispatch, getState) => {

      await API.call({
          method: "get",
          url: `/department/get_department_all`,
        })
          .then((result) => {
            console.log(result.data.content);
            dispatch({
              type: 'FETCH_MY_DEPT',
              data: result.data.content, // Ensure you're dispatching the correct data structure
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}

export const fecthdispute=  (params) =>{


    return async (dispatch, getState) => {

      await API.call({
          method: "get",
          url: "/getdispute",
          params: params
        })
          .then((result) => {
            dispatch({
              type: 'FETCH_DISPUTE_LIST',
              data: result.data.content, // Ensure you're dispatching the correct data structure
            });
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
    
    };
}