import React, { Component, useState } from "react";
import "./TimeOff.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl, Tabs, Tab  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchTimeOff } from '../../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import Formatter from "../../../services/Formatter";
import { InputDate } from '../../../components/DatePickerComponent/DatePicker.js';
import LeaveCredits from "../LeaveCredits";
import DatePicker from "react-datepicker";
import ReportNavigator from "../../../components/Template/ReportNavigator";

const TimeOff = ( props ) => {

   const { profile, user } = props;
   let { start_date, end_date }  = props;

    // Handles the change of date that'll be triggered by the ReportNavigator
    const handleChangeDate = ( start_date, end_date, scope_type ) => {
        props.fetchTimeOff( profile.details.id, start_date, end_date )
    }

   return ( 
        Validator.isValid( profile ) ?
        <Row>   
            
            <div className="col-lg-4 leaves-col" >
            { profile.leave_credits != [] ? 
                <LeaveCredits  />
                :
                null
            }    
            </div>     
            <div className="col-lg-8" >
            <ReportNavigator start_date={start_date} end_date={end_date} handleChangeDate={handleChangeDate} />
            { profile.leaves_list?.length > 0 ? 
                <div>
                { profile.leaves_list.slice().reverse().map(function (leave, i) {

                        return  (<Row className="leave-row">
                            <div className="icon-column"> 
                                <LeaveIcon type={leave.type}/>
                            </div>                  
                            <div className="details-column"> 
                                <b className="time-off-date">{moment(leave.date).format("ll")}</b><br/>
                                <LeaveStatus status={leave.status}/> {parseFloat(leave.amount)} day of <b>{leave.type}</b>
                            </div>                  
                            <div className="note-column"> 
                               <small><strong>Note:</strong><br/></small> {leave.employee_note}
                            </div>
                        
                        </Row>)
                    })
                }
                </div>
                :
                <div className="no-leaves-row">You don't have any leaves within this date range.</div>
            } 
            </div>
        </Row>
        :
        null
    );

};



// Component for the Leave Icon
export const LeaveIcon = ( props ) => { 

    let icon = "";
    switch( Formatter.title_to_slug( props.type )  ) {
        case "vacation_leave":
            icon = <i class="fa fa-plane fa-icon" /> 
            break;
        case "sick_leave":
            icon = <i className="fa fa-medkit fa-icon" /> 
            break;
        case "magna_carta_leave_for_woman":
            icon = <i className="fa fa-female fa-icon" /> 
            break;
        case "maternity_leave":
        case "paternity_leave":
            icon = <i className="fa fa-child fa-icon" /> 
            break;
        case "birthday_leave":
            icon = <i className="fa fa-birthday-cake fa-icon" /> 
            break;
        case "bereavement_leave":
            icon = <i className="fa fa-handshake-o fa-icon" /> 
            break;
        default:
            icon = <i className="fa fa-user fa-icon" /> 
            break;
    }
    return icon;
}

// Component for the Leave Status
export const LeaveStatus = ( props ) => { 

    let status = "";
    switch( props.status ) {
        case "requested":
            status = <i className="fa fa-hourglass" style={{"color": '#ffc84d'}} /> 
            break;
        case "approved":
            status = <i className="fa fa-check-circle" style={{"color": '#82af13'}} /> 
            break;
        case "denied":
            status = <i className="fa fa-times-circle" style={{"color": '#bd2130'}} /> 
            break;
        case "canceled":
            status = <i className="fa fa-ban" style={{"color": '#999'}} /> 
            break;
    }
    return status;
}


const mapStateToProps = (state) => {
  return {
      profile : state.profile,
      user : state.user
  }
} 
const mapDispatchToProps = (dispatch) => {

  return {
    fetchTimeOff : ( id, start_date, end_date ) => dispatch( fetchTimeOff( id, start_date, end_date ) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(TimeOff);
