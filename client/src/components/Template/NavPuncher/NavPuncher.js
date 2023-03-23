import React, { Component } from "react";
import "./NavPuncher.css";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import Validator from "../../../services/Validator";
import { Link } from "react-router-dom";
import { logOut } from '../../../store/actions/userActions'
import { Container,Row,Col,Table,Image, Spinner,Button, Badge, Tab, Tabs , Dropdown  } from 'react-bootstrap';
import moment from 'moment';
import { biometrixLog } from '../../../store/actions/dtr/quickpunchActions'
import $ from 'jquery';

import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions'
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';



class NavPuncher extends Component {
  constructor(props) {
    super(props);
    this.timer = 0;
    this.state = {
        time: new Date(),
        compare_to_clock_in: new Date(),
        NavHasLoaded : false,
        offsetHasLoaded : false
      };
  }

  onSubmitHandler = async (values) => {
    // this.onUIHandler();
    console.log('onSubmitHand');
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
   addSeconds(date, seconds) {
    date.setSeconds(date.getSeconds() + seconds);
    return date;
  }
  componentWillMount= async () => {
    const date = new Date();
    // const { user, constant, dashboard } = this.props;
    this.timer = setTimeout(() => {
      this.setState({
        time: this.props.user?.user_server_timestamp_mils != null ||  this.props.user?.user_server_timestamp_mils != undefined? 
        this.state.offsetHasLoaded?   this.addSeconds(this.state.time, 1) :(new Date(this.props.user?.user_server_timestamp_mils+ (date.getTimezoneOffset() * 60*1000)))
        
        : new Date(),
        // time: this.props.user?.user_server_timestamp_mils != null ||  this.props.user?.user_server_timestamp_mils != undefined? new Date(this.props.user?.user_server_timestamp_mils- (date.getTimezoneOffset() * 3600*1000)): new Date(),

      });

      this.setState({
        offsetHasLoaded:  this.props.user?.user_server_timestamp_mils != null ||  this.props.user?.user_server_timestamp_mils != undefined? true :false,

      });

      this.componentWillMount();
  }, Math.floor(Date.now() / 1000) * 1000 + 1000 - Date.now());

  


  var from =  moment().subtract(1, 'days').format("YYYY-MM-DD") ;
  var to = moment().format("YYYY-MM-DD");
  
  // }

  }
  onUIHandler = async () =>{
    $(document).on('click', 'nav-clock-dropdown .dropdown .dropdown-menu', function (e) { 
      e.stopPropagation();
    });
      
  }
  componentWillUnmount() {
    clearTimeout(this.timer);
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
    const initialValue = {
      quickpunch : null
    }

  const { recent_dtr } = this.props.dashboard;
    
  let showErr =  recent_dtr.length > 0  ? 
                    recent_dtr[1]?.start_datetime === null &  recent_dtr[1]?.time_in !== null &  recent_dtr[1]?.is_rest_day  === 0? true : 
                    recent_dtr[0].start_datetime === null &  recent_dtr[0].time_in !== null &  recent_dtr[0]?.is_rest_day  === 0 ? true : false : false;

 
    const user = this.props.user;
    return (
      <div className="nav-puncher">


     
  <div className="div-col ">
  <Formik 
		enableReinitialize
		onSubmit={
      this.onSubmitHandler
    } 
		validationSchema={validationSchema} 
		initialValues={initialValue}>
	  {
	  ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        <form onSubmit={handleSubmit}> 
        {this.props.dashboard?.recent_dtr.length > 1 ? (
				this.props.dashboard?.recent_dtr[1]?.is_rest_day == 1 ? (
					this.props.dashboard?.recent_dtr[0]?.is_rest_day == 1 ? (
						<>
							<br />
              <Button  type="submit"  className="nav-clock-button dropdown neutral"><i className=" fa fa-clock-o" /> Clock Loading</Button>
						</>
					) : (
					<>
            <Button className="nav-clock-button dropdown" onClick={(e)=> { setFieldValue('quickpunch','out'); setFieldValue('dtr_id', this.props.dashboard?.recent_dtr[0]?.id);  }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button>
					</>
					)
				) : (
					<>
          {!(this.props.dashboard?.recent_dtr[1]?.time_in)? (
            <Button className="nav-clock-button dropdown"  type="submit" disabled={this.props.dashboard?.recent_dtr[1]?.time_in? true : false} onClick={(e)=> { setFieldValue('quickpunch','in');   }} ><i className="fa fa-clock-o" /> Clock In</Button>
          ) : (
            (this.props.dashboard?.recent_dtr[1]?.time_in && this.props.dashboard?.recent_dtr[1]?.time_out) ?
            (<><Button  type="submit"  className="nav-clock-button dropdown  btn-secondary" disabled> <i className="fa fa-sun-o" /> Day Completed</Button></>) : 
            
            (<><Button className="nav-clock-button dropdown" onClick={(e)=> { setFieldValue('quickpunch','out');   }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button></>)
            // <Button className="nav-clock-button dropdown" onClick={(e)=> { setFieldValue('quickpunch','out');   }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button>
          )}
			
					</>
				)
			) : 
      this.props.dashboard?.isNavDtrLoaded == true  ? (
        <>
        		

          <Button className="nav-clock-button dropdown"  type="submit" disabled={this.props.dashboard?.recent_dtr[1]?.time_in? true : false} onClick={(e)=> { setFieldValue('quickpunch','in');   }} ><i className="fa fa-clock-o" /> Clock In and Generate</Button>

      
        </>)
        : (
        <>
        	

            <Button  type="submit"  className="nav-clock-button dropdown neutral"><i className=" fa fa-clock-o" /> Clock Loading</Button>

        </>)

            
			}
    </form>
	)}
  
	</Formik>
 

  </div>

   <Dropdown.Toggle className="nav-clock" >
        <div className = "nav-clock-dropdown nav-clock div-col">
        <div className=" time-info " >
              <div>
                    <div className="nav-date">	{ moment(this.state.time).format("dddd, Do MMMM")} </div>
              </div>
              <div>
                    <div className="nav-time">		{moment(this.state.time).format("hh")} : {moment(this.state.time).format("mm")} : {moment(this.state.time).format("ss")}  {moment(this.state.time).format("A")} </div>
              </div>
              
        </div>

        </div>
     </Dropdown.Toggle  >
      </div>
   

    
      
    );
  };
}

const validationSchema = Yup.object().shape({});

const mapStateToProps = (state) => {
  return {
    user: state.user,
    settings: state.settings,
    dashboard : state.dashboard,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    getRecentDtr : (user_id,from,to) => dispatch( getRecentDtr(user_id,from,to) ),
    biometrixLog    : ( post_data , id ) => dispatch( biometrixLog( post_data , id ) ),

  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NavPuncher);

// export default (NavPuncher);
