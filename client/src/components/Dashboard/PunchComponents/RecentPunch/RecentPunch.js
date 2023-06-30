import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../../components/GridComponent/AdminLte.js'
import "./RecentPunch.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { biometrixLog } from '../../../../store/actions/dtr/quickpunchActions'
import { getRecentPunches } from '../../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import DtrFormatter from '../../../../services/DtrFormatter';

class RecentPunch extends Component {
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

componentDidMount(){
  var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
  var to = moment().format("YYYY-MM-DD");
  this.props.getRecentPunches(this.props.user.id, from , to );

}

// componentWillUnmount(){
//   clearTimeout(this.timer);
//   //console.log("Timer cleared")
// }



	render = () => {
    const initialValue = {
      quickpunch : null
    }
    // console.log(this.props.recent_punches, this.props.dashboard);
		const { recent_punch, isRecentPunchLoaded } = this.props.dashboard;
    console.log(recent_punch, isRecentPunchLoaded);
    // console.log(recent_punch, recent_punches.length);

    if(isRecentPunchLoaded == true){

    
       

    return(
      <div >
      
      <div >
        { recent_punch.length > 0  ? 
        
        <div className="recent_punch-table">

            
              <Table className="responsive hover dtr-table ">
            <thead>
                <tr>
                    <th className="dtr-date">Date</th>
                     {/* <th className="dtr-schedule">Schedule</th> */}
                      <th className="dtr-log">Clock In</th>
                      <th className="dtr-log">Clock Out</th>
                      <th className="dtr-log">Hour Count</th>
                </tr>
            </thead>
            <tbody>
            {recent_punch.slice().reverse().map((punch, index) => {
                  //  let dtr_type = dtr.attendance_status.slug;
                  // let status = <div><div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></div>;

                   // If the attendance status is absent but has a holiday, set the dtr_type and status to holiday
                  //  if( dtr.holidays.length > 0){
                  //    dtr_type = dtr.holidays[0].type;
                  //    status = <div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></div>;
                  //  } else if ( dtr.is_rest_day == 1 ){
                  //      dtr_type = "rest_day";
                  //  }
                
                   // If the DTR date is beyond the current date, don't show the DTR row by returning null.
                  // if( moment().diff(moment(dtr.date)) < 0 ) {
                  //   return null;
                  // }

                  return <tr className={"center "}>
                          <td className="dtr-date">{(punch.date)}</td> 
                          
                           {/* <td className="dtr-schedule"><div className="dtr-status">{status}</div><div>{DtrFormatter.displaySchedule(dtr)}</div></td> */}
                          <td className="dtr-log"><div>{(punch.time_in)}</div></td>
                          <td className="dtr-log"><div>
                            { (punch.time_out)}
                            </div></td>

                            <td className="dtr-log"><div>
                            { (punch.hours)}
                            </div></td>
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
  return(
    <div >
    </div>);
	}
  }




  const validationSchema = Yup.object().shape({});
  
  const mapStateToProps = (state) => {
	return {
		user : state.user,
		dashboard : state.dashboard,

	}
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      getRecentPunches : (user_id,from,to) => dispatch( getRecentPunches(user_id,from,to) ),
      biometrixLog    : ( post_data , id ) => dispatch( biometrixLog( post_data , id ) )
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(RecentPunch);
  