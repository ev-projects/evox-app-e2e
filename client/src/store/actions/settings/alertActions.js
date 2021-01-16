import axios from "axios";
import { trackPromise } from "react-promise-tracker";

export const showAlert = ( message, timeout) => {
    return (dispatch, getState) => {
        
        dispatch({
            'type'      : 'SHOW_ALERT',
            'header'    : message,
            'timeOut'   : timeout
        });
    }
}
