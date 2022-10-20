import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button, Badge  } from 'react-bootstrap';
import "./QuickPunch.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { biometrixLog } from '../../../store/actions/dtr/quickpunchActions'
import * as Yup from 'yup';
import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions';

class QuickPunch extends Component {
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
		this.props.biometrixLog(  formData , this.props.user.id );
	}

    componentWillMount(){
    	this.timer = setTimeout(() => {
            this.setState({
            	time: new Date()
            });
            this.componentWillMount();
        }, Math.floor(Date.now() / 1000) * 1000 + 1000 - Date.now());
	}
	
    componentWillUnmount(){
    	clearTimeout(this.timer);
    }

	render = () => {  
	const initialValue = {
		quickpunch : null
	}

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
			{this.props.dashboard?.recent_dtr[1] ? (
				this.props.dashboard?.recent_dtr[1]?.is_rest_day == 1 ? (
					<div>
						<br />
						<p class="note" >NOTE: You can not clock in on a rest day, please click <a href={global.links.rest_day_work}><span className="request-rest-day-link badge">here</span></a> to request a "Rest Day Work".</p>
					</div>
				) : (
					<div>
						<Button  type="submit" disabled={this.props.dashboard?.recent_dtr[1]?.time_in? true : false} onClick={(e)=> { setFieldValue('quickpunch','in');   }} ><i className="fa fa-clock-o" /> Clock In</Button><Button onClick={(e)=> { setFieldValue('quickpunch','out');   }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button>
						<p class="note" >NOTE: Please make sure that the schedule that is assigned to your account is correct, especially for Night Shift Employees</p>
					</div>
				)
			) : (
				<div>
					<Button  type="submit" disabled={this.props.dashboard?.recent_dtr[1]?.time_in? true : false} onClick={(e)=> { setFieldValue('quickpunch','in');   }} ><i className="fa fa-clock-o" /> Clock In</Button><Button onClick={(e)=> { setFieldValue('quickpunch','out');   }}  type="submit" ><i className="fa fa-history" /> Clock Out</Button>
					<p class="note" >NOTE: Please make sure that the schedule that is assigned to your account is correct, especially for Night Shift Employees</p>
				</div>
			)}
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
		biometrixLog    : ( post_data , id ) => dispatch( biometrixLog( post_data , id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(QuickPunch);
  