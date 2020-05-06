
class DateFormatter {

  /** Gets the specific Datetime within the Parameter (The Datetime format of Javascript)
   * param | date |  ( a String with "Y-m-d" format as Date. If Null, gets the Date Today )
   * param | time |  ( a String with "H:i:s" format as Time. If Null, gets the 00:00:00 time )
   * return | String
  */
  get_specific_datetime( date, time ) {
      
    var default_date = new Date();

    date = ( (date || null) != null ) ? new Date(date) : default_date;
    time = (time || "00:00:00").split(':');

    date.setHours(time[0]);
    date.setMinutes(time[1]);
    date.setSeconds(time[2]);

    return date;
  }
}

export default new DateFormatter();