
import API from "./API";

class Formatter {

  /** Merge the 2nd JSON Parameter to the 1st JSON Parameter 
   * param | JSON | first_obj
   * param | JSON | second_obj
   * return | JSON | first_obj
  */
  merge_json( first_obj, second_obj) {
    for (var key in second_obj) {
      first_obj[key] = second_obj[key];
    }
    return first_obj;
  }

  
  /** Formats the success response that would be interpretted by the Dispatch of Alert Reducer 
   * param | Object | call_result ( The parameter indicated on the 'then' )
   * param | Integer | time_out ( The time where the alert would fade out. 0 by default if not instantiated. )
   * return | Object ( will be the parameter for the Dispatch from the caller. )
  */
  alert_success( call_result, time_out ) {
    time_out = time_out || 0;
    return {
      'type'      : 'SHOW_ALERT',
      'header'    : call_result.data.message,
      'timeOut'   : time_out
    }
  }
  
  /** Formats the error response that would be interpretted by the Dispatch of Alert Reducer 
   * param | Object | call_result ( The parameter indicated on the 'then' )
   * param | Integer | time_out ( The time where the alert would fade out. 0 by default if not instantiated. )
   * return | Object ( will be the parameter for the Dispatch from the caller. )
  */
  alert_error( error_result, time_out ) {
    time_out = time_out || 0;
    return {
      'type'      : 'SHOW_ALERT',
      'error'     : error_result,
      'timeOut'   : time_out
    }
  }

    /** Convert Date Object to String  
   * param | Object |  ( date that will be converted to string )
   * return | String ( will be the parameter for the Dispatch from the caller. )
  */
  convert_time( date ) {
    date = String("00" +date.getHours()).slice(-2) + ":" + String("00" +date.getMinutes()).slice(-2)
    return date.toString();
  }
}

export default new Formatter();
