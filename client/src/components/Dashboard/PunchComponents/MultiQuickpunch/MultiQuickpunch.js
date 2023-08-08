import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button, Badge  } from 'react-bootstrap';
import "./MultiQuickpunch.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { biometrixLogMulti } from '../../../../store/actions/dtr/quickpunchActions'
import * as Yup from 'yup';
import Dropdown from 'react-bootstrap/Dropdown';
// import { getRecentDtr } from '../../../../store/actions/dashboard/dashboardActions';

class MultiQuickpunch extends Component {
	constructor(props){
    	super(props);
        this.timer = 0;
    	this.state = {
        	time: new Date()
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
	
		if( values['on_date'] == true){
			if (window.confirm("Are you sure you want Update or create record on seleceted date")) {

				this.props.biometrixLogMulti(  formData , this.props.user.id );
			  }
		}else{
				this.props.biometrixLogMulti(  formData , this.props.user.id );

		}
	}
	addSeconds(date, seconds) {
		date.setSeconds(date.getSeconds() + seconds);
		return date;
	  }
    componentWillMount(){
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
	}
	
    componentWillUnmount(){
    	clearTimeout(this.timer);
    }

	render = () => {
	

	const { recent_punch, isRecentPunchLoaded } = this.props.dashboard;
	var isLogIn = false;
	var isContinue = false;
	var islogOut = false;
	var latest = null;
	var use_previous = false;
	var disable_day = false;
	var prev_disable_day = false;

	if(isRecentPunchLoaded == true){

		

		if(recent_punch.length > 0){

			latest = recent_punch[recent_punch.length - 1];

			if(latest.recent_log == "Pause"){
				isContinue = true;
			}

			if(latest.recent_log == "Log_out"  ){
				isLogIn = true;
			}

			if(latest.recent_log == "Log_in" || latest.recent_log == "Continue"  ){
				islogOut = true;
			}

		}

		if(recent_punch.length > 0){

			latest = recent_punch[recent_punch.length - 1];

			var time = new Date(latest.date_time_out);
			var formatted = moment(time);

			if(formatted.format("Y-MM-DD") == moment(this.state.time).format("Y-MM-DD") && latest.completed_today == true){
			
				disable_day = true;
				if(latest.log_in_type == "rest_day_work" && !(moment(this.state.time).isBetween(moment(this.state.time).startOf('day'),moment(new Date(latest.date_time_out)).add(1, 'hours')))){
					disable_day = false;
				}
			}
			if( latest.completed_today == true){
				if(formatted.format("Y-MM-DD") == moment(this.state.time).subtract(1,"day").format("Y-MM-DD") ){
					prev_disable_day = true;
				}
			
			}
			if(latest.recent_log == "Log_out"  && latest.date != moment(this.state.time).format("Y-MM-DD")){
				// isLogIn = true;
				
				if(moment(this.state.time).isBetween(moment(this.state.time).startOf('day'), moment(this.state.time).startOf('day').add(5, 'hours'))){
					
					use_previous = true;
						if(latest.time_out != null && latest.recent_log == "Log_out"){
							var time = new Date(latest.date_time_out);
							var formatted = moment(time);
							if(formatted.isBetween(moment(this.state.time).startOf('day'), moment(this.state.time).startOf('day').add(3, 'hours'))){
								use_previous = false;
							}
							
							if(latest.time_out != null && latest.recent_log == "Log_out" && latest.log_in_type == "rest_day_work"){
								if(moment(this.state.time).isBetween(moment(this.state.time).startOf('day'),moment(new Date(latest.date_time_out)))){
									use_previous = false;
								}
							}
						}
				}
			}
			
		}
	

		if(recent_punch.length == 0 ){
			isLogIn = true;
			if(moment(this.state.time).isBetween(moment(this.state.time).startOf('day'), moment(this.state.time).startOf('day').add(3, 'hours'))){
				
				use_previous = true;
				
			}
		}


	
	}
	

	
	const initialValue = {
		quickpunch : null,
		date : "today",
		on_date : use_previous,
	}
	

	// console.log(isLogIn , disable_day, !isLogIn || disable_day);
    return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={initialValue}>
	  {
	  ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		<div className="card">
		<div className="card-body quickpunch">
			<h3>QUICK PUNCH</h3>
			<Row>
	  <Col className="date" >{ moment(this.state.time).format("dddd, MMMM Do")}</Col>
			</Row>
			<Row className="time">
				<Col>{moment(this.state.time).format("HH")}</Col>
				<Col>{moment(this.state.time).format("mm")}</Col>
				<Col>{moment(this.state.time).format("ss")}</Col>
			</Row>
			<Row className="label">
				<Col>Hours</Col>
				<Col>Minutes</Col>
				<Col>Seconds </Col>
			</Row>
			{
				isRecentPunchLoaded == true? 

				<>
				{!use_previous? 
					<>
						<Button  type="submit"  disabled={!isLogIn || disable_day}   onClick={(e)=> { setFieldValue('quickpunch','in');   }} ><i className="fa fa-clock-o" /> Clock In</Button>
					</>
				
				:<>
				
				<label className=" select-date-multi">Select Date:
				<select className="form-control-sm" style={{ display: 'block' }} onChange={(e)=> {  setFieldValue('date',e.target.value); }}>
							{/* <option value="" label="" /> */}
                            <option value="today" label={moment().format("Y-MM-DD")} onClick={(e)=> { setFieldValue('date',"today");   }} />
                            <option value="yesterday"  disabled={prev_disable_day} label={moment().subtract(1, 'day').format("Y-MM-DD")} onClick={(e)=> { setFieldValue('date',"yesterday");  }}  />
                          </select>
				</label>
                         
				<br />
				<Button  type="submit"  disabled={!isLogIn}   onClick={(e)=> { setFieldValue('quickpunch','in');   }} ><i className="fa fa-clock-o" /> Clock In</Button>
				
				</>}
				
			
				{!isLogIn? 
					<>
						{isContinue ?
						<Button onClick={(e)=> { setFieldValue('quickpunch','continue');   }}  type="submit" ><i className="fa fa-play" /> Continue</Button>:
							<Button onClick={(e)=> { setFieldValue('quickpunch','pause');   }}  type="submit" ><i className="fa fa-pause" /> Pause</Button>
							
						}
					</>
				
				:<></>}
{/* 
<Button onClick={(e)=> { setFieldValue('quickpunch','pause');   }}  type="submit" >--Pause</Button>:
					<Button onClick={(e)=> { setFieldValue('quickpunch','continue');   }}  type="submit" >--Continue</Button> */}

				<Button disabled={!islogOut}  onClick={(e)=> { setFieldValue('quickpunch','out');   }}  type="submit"  ><i className="fa fa-history" /> Clock Out</Button>
				</>:<></>
			}
			

		
		</div>
	</div>
	</form>
	)}
  
	</Formik>);
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
		biometrixLogMulti    : ( post_data , id ) => dispatch( biometrixLogMulti( post_data , id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(MultiQuickpunch);
  