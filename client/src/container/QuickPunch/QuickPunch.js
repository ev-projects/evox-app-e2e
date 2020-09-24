import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import "./QuickPunch.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { biometrixLog } from '../../store/actions/quickpunchActions'
import * as Yup from 'yup';


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
		  console.log(values);
	
			if( values[key] != null ) {
				switch( key ) {
					default:
						formData.set(key, values[key]);
						break;
				}
			}
		}
		this.props.biometrixLog(  formData );
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
			<h2>QUICK PUNCH</h2>
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
			<Button  type="submit" onClick={(e)=> { setFieldValue('quickpunch','in');   }} >Clock In</Button><Button onClick={(e)=> { setFieldValue('quickpunch','out');   }}  type="submit" >Clock Out</Button>
			<p class="note" >NOTE: Please make sure that the schedule that is assigned to your account is correct, especially for Night Shift Employees</p>
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
	 
	}
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
		biometrixLog    : ( post_data ) => dispatch( biometrixLog( post_data ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(QuickPunch);
  