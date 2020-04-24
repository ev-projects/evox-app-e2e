import React, { Component }  from 'react';
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

  /** Convert Schedule Details for the API
    * param | Object |  ( schedules that will be formatted for passing api)
   * return | Object ( formatted data )
  */
  format_schedule_details = (values) => {
    if(values.schedule_type=='standard'){
      var schedule_details = {};

      var start_time = this.convert_time(values.std_schedule_details[0].start_time);
      var end_time = this.convert_time(values.std_schedule_details[0].end_time);
      var break_time =this.convert_time(values.std_schedule_details[0].break_time);
      schedule_details = { all : {start_time : start_time,end_time : end_time,break_time : break_time}  };
    }else if (values.schedule_type=='flexible') {
      var schedule_details = {};

      var start_time = this.convert_time(values.flx_schedule_details[0].start_time);
      var end_time = this.convert_time(values.flx_schedule_details[0].end_time);
      var start_flexy_time = this.convert_time(values.flx_schedule_details[0].start_flexy_time);
      var end_flexy_time = this.convert_time(values.flx_schedule_details[0].end_flexy_time);
      var break_time = this.convert_time(values.flx_schedule_details[0].break_time) ;
      schedule_details = { all : {start_time : start_time,end_time : end_time, start_flexy_time : start_flexy_time, end_flexy_time : end_flexy_time, break_time : break_time}};
    }else if (values.schedule_type=='customize'){
      var  schedule_details = {};
      values.work_days.forEach((day,index) => {
        var start_time = this.convert_time(values.cst_schedule_details[index].start_time);
        var end_time = this.convert_time(values.cst_schedule_details[index].end_time);
        var start_flexy_time = this.convert_time(values.cst_schedule_details[index].start_flexy_time);
        var end_flexy_time = this.convert_time(values.cst_schedule_details[index].end_flexy_time);
        var break_time = this.convert_time(values.cst_schedule_details[index].break_time);
        schedule_details[day] = {start_time : start_time,end_time : end_time, start_flexy_time : start_flexy_time, end_flexy_time : end_flexy_time, break_time : break_time} ;
      })
    }
    return schedule_details;
  }
}

export default new Formatter();
