import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./RecentDtr.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { biometrixLog } from '../../../store/actions/dtr/quickpunchActions'
import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import DtrFormatter from '../../../services/DtrFormatter';

class RecentDtr extends Component {
	constructor(props){
    	super(props);
      this.timer = 0;
    	this.state = {
        compare_to_clock_in: new Date()
      };
	}
	
	onSubmitHandler = (values) => {
		// Setting of Form Data to be passed in the submission
		var formData = new FormData();
	
		for (var key in values) {
	
			if( values[key] != null ) {
				switch( key ) {
					default:
						formData.set(key, values[key]);
						break;
				}
			}
		}
		this.props.biometrixLog(  formData , this.props.user.id );
	}

componentWillMount(){
  var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
  var to = moment().format("YYYY-MM-DD");
  this.props.getRecentDtr(this.props.user.id, from , to );

  this.timer = setInterval(() => {
    this.setState({
      compare_to_clock_in: new Date()
    });
    //console.log(  this.state.compare_to_clock_in)
    //this.componentWillMount();
  }, 1000);
}

componentWillUnmount(){
  clearTimeout(this.timer);
  //console.log("Timer cleared")
}

canClockOut(clock_in) {
  console.log(new Date(clock_in));
  console.log(this.state.compare_to_clock_in);
  if (!clock_in && !this.state.compare_to_clock_in)
  return 0;
  var diff =(this.state.compare_to_clock_in.getTime() - new Date(clock_in)) / 1000;
  diff /= 60;
  diff /= 60;
  console.log(Math.abs(Math.round(diff)));
  return Math.abs(Math.round(diff));
}

	render = () => {
    const initialValue = {
      quickpunch : null
    }
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
                           <td className="dtr-log"><div>{
                            dtr.time_out ? (
                              DtrFormatter.displayLog(dtr.time_out)
                            ) : (
                              dtr.time_in && (this.canClockOut(dtr.time_in) < 22) ? (
                                <>
                                <Formik 
                                  enableReinitialize
                                  onSubmit={this.onSubmitHandler} 
                                  validationSchema={validationSchema} 
                                  initialValues={initialValue}>
                                  {
                                    ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                                      <form onSubmit={handleSubmit}>
                                        <Button onClick={(e)=> { setFieldValue('quickpunch','out'); setFieldValue('dtr_id', dtr.id);   }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button>
                                      </form>
                                    )
                                  }
                                  </Formik>
                                </>
                              ) : (<></>)
                            )
                           }</div></td>
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
      getRecentDtr : (user_id,from,to) => dispatch( getRecentDtr(user_id,from,to) ),
      biometrixLog    : ( post_data , id ) => dispatch( biometrixLog( post_data , id ) )
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(RecentDtr);
  