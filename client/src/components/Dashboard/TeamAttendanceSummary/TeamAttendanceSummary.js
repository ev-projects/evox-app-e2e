import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./TeamAttendanceSummary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { getTeamAttendanceSummary } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import Formatter from "../../../services/Formatter";

class TeamAttendanceSummary extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {

	}

  componentWillMount(){ 
    this.props.getTeamAttendanceSummary( this.props.user.id );
	}
	
    componentWillUnmount(){
    }

    
	render = () => {  
		const { team_attendance } = this.props.dashboard;
    return(
          <div style={{ textAlign: "center" }}>
            <Row >
              <Col><h1>{team_attendance.absent?team_attendance.absent:"0"}</h1></Col><Col><h1>{team_attendance.on_leave?team_attendance.on_leave:"0"}</h1></Col>
              </Row>
              <Row>
              <Col><h4>Absent</h4></Col><Col><h4>On Leave</h4></Col>
              </Row>
          </div>
         );
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
      getTeamAttendanceSummary  : ( id ) => dispatch( getTeamAttendanceSummary( id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(TeamAttendanceSummary);
  