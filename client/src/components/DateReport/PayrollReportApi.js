import API from "../../services/API";
import Formatter from "../../services/Formatter";

export const fecthUserContry =  (setCountry) =>{


    return async (dispatch, getState) => {

      await API.call({
          method: "get",
          url: `/user/getusercountry`,
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

export const fecthMoroccoPayrollParams =  (setCountry) =>{


  return async (dispatch, getState) => {

    await API.call({
        method: "get",
        url: `/report/get_morocco_payroll_params`,
      })
        .then((result) => {
          dispatch({
            type: 'FETCH_MOROCCO_PAYROLL_PARAMS',
            data: result.data, // Ensure you're dispatching the correct data structure
          });
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });

  };
}