import React, { Component }  from 'react';
import API from "./API";
import { Container,Row,Col,Table,Image,Card,Spinner } from 'react-bootstrap';

class DtrFormatter {
  /** Convert Date Str to Month and Day Format
    * param | String |  ( date that will be formatted for display)
   * return | String ( formatted data )
  */
    displayDate(dateStr){
        var date = '';
        var day = '';

        if(dateStr!=null){
            const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat","Sun"];
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var d = new Date(dateStr);
            day = dayName[d.getDay()];

            return (<div><div className="month">{monthNames[d.getMonth()].toUpperCase()}</div><div className="day">{d.getDate()}</div><div className="dayname">{day}</div></div>);
        }

        return '';
    }

  /** Convert Date Str to Month and Day Format
    * param | String |  ( date that will be formatted for display)
   * return | String ( formatted data )
  */
    displayLog(logStr){
        var time = '';
        var date = '';
        var centerClass = "justify-content-center";

        if(logStr!=null){
            var d = new Date(logStr);
            return (<div><Row className={centerClass}>{this.convertToTime(logStr)}</Row><Row className="month justify-content-center">{this.displayMonthDay(logStr)}</Row></div>);
        }
        return '';
    }

  	/** Convert Date Str to Month and Day Format
    * param | String |  ( date that will be formatted for display)
   	* return | String ( formatted data )
  	*/
    displayMonthDay(dateStr){
        var monthDay = '';

        if(dateStr!=null){
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var d = new Date(dateStr);
            monthDay = monthNames[d.getMonth()].toUpperCase() + ' ' + d.getDate();
        }

        return monthDay;
    }

  	/** This function is for the display of Schedule in Dtr
    * param | Object |  ( Dtr object for displaying the schedule )
   	* return | Jsx Object ( formatted data )
  	*/
    displaySchedule(dtrObject){
        var stdSchedule = '';
        var flxSchedule = '';
        var centerClass = "justify-content-center";

        /** Condition for the Standard Schedule */
        if(dtrObject.start_datetime!=null&&dtrObject.end_datetime!=null){
            stdSchedule = 
            <Row><Col>
            <Row className={centerClass}>{this.convertToTime(dtrObject.start_datetime)}</Row>
            <Row className={"month " + centerClass}>{this.displayMonthDay(dtrObject.start_datetime)}</Row></Col><Col>
            <Row className={centerClass}>{this.convertToTime(dtrObject.end_datetime)}</Row>
            <Row className={"month " + centerClass}>{this.displayMonthDay(dtrObject.end_datetime)}</Row></Col></Row> ;
        }

        /** Condition for the Flexible Schedule */
        if(dtrObject.start_flexy_datetime!=null&&dtrObject.end_flexy_datetime!=null){
            flxSchedule = 
            <Row><Col>
                <Row className={centerClass}>{this.convertToTime(dtrObject.start_flexy_datetime)}</Row>
                <Row className={"month " + centerClass}>{this.displayMonthDay(dtrObject.start_flexy_datetime)}</Row></Col><Col>
                <Row>{this.convertToTime(dtrObject.end_flexy_datetime)}</Row>
                <Row className={"month " + centerClass}>{this.displayMonthDay(dtrObject.end_flexy_datetime)}</Row>
            </Col></Row>;
        }


        return (<div>{stdSchedule}{flxSchedule}</div>);
    }

  /** Convert Date Str to 00:00:00
    * param | String |  ( date that will be formatted for display)
   * return | String ( formatted data )
  */
    convertToTime(dateStr){
        var time = '';

        if(dateStr!=null){
            var d = new Date(dateStr);
            time =   ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) +':'+   ('0' + d.getSeconds()).slice(-2) ;
        }
        return time;
    }

}

export default new DtrFormatter();