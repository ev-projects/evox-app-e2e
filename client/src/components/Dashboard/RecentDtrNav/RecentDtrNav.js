import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js'
import "./RecentDtrNav.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { biometrixLog } from '../../../store/actions/dtr/quickpunchActions'
import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import DtrFormatter from '../../../services/DtrFormatter';
import { fetchUser } from '../../../store/actions/userActions' ;

class RecentDtrNav extends Component {
	constructor(props){
    	super(props);
      this.timer = 0;
    	this.state = {
        compare_to_clock_in: new Date(),
        NavHasLoaded: false
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

componentWillMount = async()=>{
  
  // var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
  // var to = moment().format("YYYY-MM-DD");

  // if (this.props.user !=null && this.props.user.id !=null){
  //   this.props.getRecentDtr(this.props.user.id, from , to );
   
  // }

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
  // console.log(new Date(clock_in));
  // console.log(this.state.compare_to_clock_in);
  if (!clock_in && !this.state.compare_to_clock_in)
  return 0;
  var diff =(this.state.compare_to_clock_in.getTime() - new Date(clock_in)) / 1000;
  diff /= 60;
  diff /= 60;
  // console.log(Math.abs(Math.round(diff)));
  return Math.abs(Math.round(diff));
}

	render = () => {
    var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
    var to = moment().format("YYYY-MM-DD");
  
    // if (this.props.user !=null && this.props.user.id !=null && this.state.NavHasLoaded == false){
    //   this.props.getRecentDtr(this.props.user.id, from , to );
    //   this.state.NavHasLoaded = true
     
    // }
    const initialValue = {
      quickpunch : null
    }
		const { recent_dtr } = this.props.dashboard;
    
    let dtr_warning =  recent_dtr.length > 0  ? 
                      recent_dtr[1]?.start_datetime === null &  recent_dtr[1]?.time_in !== null &  recent_dtr[1]?.is_rest_day  === 0? true : 
                      recent_dtr[0].start_datetime === null &  recent_dtr[0].time_in !== null &  recent_dtr[0]?.is_rest_day  === 0 ? true : false : false;

    let restDay_notice = recent_dtr.length > 0  ? 
                          recent_dtr[1]?.is_rest_day  === 1? true : 
                          false : false;
                   
    return(
      <div >
      
      <div >
        { recent_dtr.length > 0  ? 
        
         <div>
                                      { dtr_warning   ?   
                                                <>
                                                  
                                                            <div  class="alert-container alert alert-danger show dtr-warning" >
                                                              You <u>clocked in</u> on a day with no <b>default</b> schedule assigned to you, this could affect quickpunch/DTR with night shifts 
                                                              or you would be recieving errors, missing overtimes and missing payout hours. Confirm with your supervisor about your schedule.
                                                            </div>
                                                </>                
                                       :null
                                      }
                                      { restDay_notice   ?   
                                                <>
                                                  
                                                            <div  class="alert-restday-notice" >
                                                            NOTE: You cannot clock-in on a <u>rest day</u>, please click <a href={global.links.rest_day_work}><span className="restday-notice-link badge">here</span></a> to request a "Rest Day Work". It will be Approved by your supervisor.
                                                            </div>
                                                </>                
                                       :null
                                      }
            
  {recent_dtr.length > 0 ?<>{recent_dtr.slice().reverse().map((dtr, index) => {
                  let dtr_type = dtr.attendance_status.slug;
                  let status =  <div>
                                  <div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div>
                                  <div>{DtrFormatter.displayHoliday(dtr.holidays)}</div>
                                </div>;

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

                  return<>
                  <div className={"card-body card-size "+dtr_type+"-bg-color"}>
                    {/* <h5 className="card-title">Status: {status} Jan 22, 2021</h5> */}

                    <div className="card-text">{DtrFormatter.displayDateBasic(dtr.date)}- {dtr.attendance_status.name}</div>
                    <div className=" schedule center">
                      <div>{DtrFormatter.displaySchedule(dtr)}</div>
            

                    </div>
                    <div className="in-out center">
                      <div>
                        <div>{DtrFormatter.displayLog(dtr.time_in)}</div>
                        <div>{
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
                                      <form onSubmit={handleSubmit} >
                                        <Button  className="recent-dtr-form"onClick={(e)=> { setFieldValue('quickpunch','out'); setFieldValue('dtr_id', dtr.id);   }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button>
                                      </form>
                                    )
                                  }
                                  </Formik>
                                </>
                              ) : (<></>)
                            )
                          }</div>
                      </div>
                    </div>
                    
                  </div>
                  </>
                })}</>: 
                <div  className="card">
                  <div className="card-body">loading</div>
                  </div>
                }
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
      biometrixLog    : ( post_data , id ) => dispatch( biometrixLog( post_data , id ) ),
      fetchUser : () => dispatch( fetchUser() )
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(RecentDtrNav);
  