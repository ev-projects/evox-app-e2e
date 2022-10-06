import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./RecentDtr.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import DtrFormatter from '../../../services/DtrFormatter';

class RecentDtr extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {
	}

  componentWillMount(){
    var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
    var to = moment().format("YYYY-MM-DD");
    this.props.getRecentDtr(this.props.user.id, from , to );
	}
	
    componentWillUnmount(){
    }

	render = () => {  
		const { recent_dtr } = this.props.dashboard;
    
    let showErr =  recent_dtr.length > 0  ? 
                      recent_dtr[1]?.start_datetime === null &  recent_dtr[1]?.time_in !== null &  recent_dtr[1]?.is_rest_day  === 0? true : 
                      recent_dtr[0].start_datetime === null &  recent_dtr[0].time_in !== null &  recent_dtr[0]?.is_rest_day  === 0 ? true : false : false;
    return(
      <div >
      
      <div >
        { recent_dtr.length > 0  ? 
        
         <div>
                                      { showErr   ?   
                                                <>
                                                  
                                                            <div  class="fade alert-container alert alert-danger alert-dismissible show" >
                                                              You <u>clocked in</u> on a day with no <b>default</b> schedule assigned to you, this could affect quickpunch/DTR with night shifts 
                                                              or you would be recieving errors, missing overtimes and missing payout hours. Confirm with your supervisor about your schedule.
                                                            </div>
                                                </>                
                                       :null
                                      }
            
              <Table className="responsive hover dtr-table">
             <thead>
                 <tr>
                     <th className="dtr-date">Date</th>
                     <th className="dtr-schedule">Schedule</th>
                     <th className="dtr-log">Clock In</th>
                     <th className="dtr-log">Clock Out</th>
                 </tr>
             </thead>
             <tbody>
             {recent_dtr.slice().reverse().map((dtr, index) => {
                   let dtr_type = dtr.attendance_status.slug;
                   let status = <div><div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></div>;

                   // If the attendance status is absent but has a holiday, set the dtr_type and status to holiday
                   if( dtr.holidays.length > 0){
                     dtr_type = dtr.holidays[0].type;
                     status = <div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></div>;
                   } else if ( dtr.is_rest_day == 1 ){
                       dtr_type = "rest_day";
                   }
                 
                   // If the DTR date is beyond the current date, don't show the DTR row by returning null.
                   if( moment().diff(moment(dtr.date)) < 0 ) {
                     return null;
                   }

                   return <tr className={"center "+dtr_type+"-bg-color"}>
                           <td className="dtr-date">{DtrFormatter.displayDate(dtr.date)}</td> 
                           
                           <td className="dtr-schedule"><div className="dtr-status">{status}</div><div>{DtrFormatter.displaySchedule(dtr)}</div></td>
                           <td className="dtr-log"><div>{DtrFormatter.displayLog(dtr.time_in)}</div></td>
                           <td className="dtr-log"><div>{DtrFormatter.displayLog(dtr.time_out)}</div></td>
                         </tr>
             })}
             </tbody>
         </Table>
         </div>
              :
              <div className="no-previous-dtr">No Previous DTR</div>
              } 
              </div>
     
  </div>);
	}
  }




  const validationSchema = Yup.object().shape({});
  
  const mapStateToProps = (state) => {
	return {
		user : state.user,
		dashboard : state.dashboard
	}
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      getRecentDtr : (user_id,from,to) => dispatch( getRecentDtr(user_id,from,to) )
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(RecentDtr);
  