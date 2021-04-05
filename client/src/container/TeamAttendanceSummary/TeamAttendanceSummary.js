import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js'
import "./TeamAttendanceSummary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { teamAttendanceSummary } from '../../store/actions/client/clientActions'
import * as Yup from 'yup';
import Formatter from "../../services/Formatter";

class TeamAttendanceSummary extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {

	}

  componentWillMount(){ 
    this.props.teamAttendanceSummary( this.props.user.id );
	}
	
    componentWillUnmount(){
    }

    
	render = () => {  
		const { AttendanceSummary } = this.props;
    return(
          <div style={{ textAlign: "center" }}>
            <Row >
              <Col><h1>{AttendanceSummary.absent?AttendanceSummary.absent:"0"}</h1></Col><Col><h1>{AttendanceSummary.on_leave?AttendanceSummary.on_leave:"0"}</h1></Col>
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
      AttendanceSummary : state.client.teamAttendanceSummary,
    }
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      teamAttendanceSummary  : ( id ) => dispatch( teamAttendanceSummary( id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(TeamAttendanceSummary);
  