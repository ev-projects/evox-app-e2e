import React, { Component }  from 'react';
import API from "./API";
import { Container,Row,Col,Table,Image,Card,Spinner } from 'react-bootstrap';
import moment from 'moment';

class DtrFormatter {
  /** Convert Date Str to Month and Day Format
    * param | String |  ( date that will be formatted for display)
   * return | String ( formatted data )
  */
    displayDate(dateStr){
        var date = '';
        var day = '';

        if(dateStr!=null){
            date = moment(dateStr);
            return (<div><div className="month">{date.format('MMM')}</div><div className="day">{date.format('DD')}</div><div className="dayname">{date.format('ddd')}</div></div>);
        }

        return '';
    }
    displayDateBasic(dateStr){
        var date = '';
        var day = '';

        if(dateStr!=null){
            date = moment(dateStr);
            return (<div>{date.format('MMM')} {date.format('DD')}, {date.format('ddd')}</div>);
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
            return moment(dateStr).format('MMM DD');
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
            <Row className={centerClass}>{this.convertToTime(dtrObject.end_flexy_datetime)}</Row>
            <Row className={"month " + centerClass}>{this.displayMonthDay(dtrObject.end_flexy_datetime)}</Row></Col></Row> ;
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
            return moment(dateStr).format('H:mm:ss');
        }
        return time;
    }

    /** Display List of Holiday */
    displayHoliday(holiday){ 
        var holidayList = []; 

        if(holiday!=undefined){
            holiday.map((day, index) => { 
                holidayList.push(<div className={day.type}>{day.name}</div>);
            }); 
        }
            return (<div>{holidayList}</div>);
        
    }

      /** Display List of Holiday */
      displayHolidayType(holiday){ 
        var holidayList = []; 

        if(holiday!=undefined){
            holiday.map((day, index) => { 
                holidayList.push(<div className={"log-"+day.type}>{day.type}</div>);
            }); 
        }
            return (<div>{holidayList}</div>);
        
    }

    /** Display the regular and previous day */
    displayOverlap(payroll_policies){ 
        if(payroll_policies!=undefined){
            var regular =  0;
            var overlapped =  0;

            if(payroll_policies.night_diff!=undefined){
                regular = this.convertToSeconds(payroll_policies.night_diff);
            }

            if(payroll_policies.night_diff!=undefined){
                overlapped = this.convertToSeconds(payroll_policies.night_diff_overlapped);
            }

            var total = regular + overlapped;
            return this.formatSeconds(total)    ;
        }
        return '';
    }

    /** Convert 00:00:00 to seconds */
    convertToSeconds(time){
        var his = time;   // your input string
        var a = his.split(':'); // split it at the colons
        var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
        return seconds;
    }

    /** Convert Seconds to 00:00:00  */
    formatSeconds(seconds){
        var date = new Date(1970,0,1);
        date.setSeconds(seconds);
        return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
    }

}

export default new DtrFormatter();