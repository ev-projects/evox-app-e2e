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

const TimeOff = ( props ) => {

   const { profile, user } = props;
   let { start_date, end_date }  = props;

   const [viewType, setViewType] = useState("month");

   const [customStartDate, setCustomStartDate] = useState( new Date() );
   const [customEndDate, setCustomEndDate] = useState( new Date() );

    // Handles the changing of the View Type 
   const handleChangeViewType = ( type ) => {
       
       // If the type is "custom", proceed on handling the Custom Filter function
       if( type === "custom" ){
            handleCustomFilter();
       } else {
            switch( type ){

                // Change the view type to "day" and set the current start_date as the basis of the start and end date.
                case "day":
                    start_date.set(moment().startOf('day').toObject());
                    end_date.set(start_date.toObject()).endOf('day');
                    break;

                // Change the view type to "week" and set the current start_date as the basis of the start and end date.
                case "week":
                    start_date.set(moment().startOf('week').toObject());
                    end_date.set(start_date.toObject()).endOf('week');
                    break;

                // Change the view type to "month" and set the current start_date as the basis of the start and end date.
                case "month":
                    start_date.set(moment().startOf('month').toObject());
                    end_date.set(start_date.toObject()).endOf('month');
                    break;
            }
            props.fetchTimeOff( profile.details.id, start_date, end_date )
       }
       setViewType(type);
    }

    // Handles the navigation of view "prev" & "next" depending on the view type selected
    const handleChangeNavigateAction = ( action ) => {
 
         switch( action ){
 
             // If the action type is "next"
             case "next":
                 switch( viewType ){
 
                     // If the viewType is "day", move 1 day forward.
                     case "day":
                         start_date.add(1, 'day').startOf('day');
                         end_date.set(start_date.toObject()).endOf('day');
                         break;
 
                     // If the viewType is "week", move 1 week forward.
                     case "week":
                         start_date.add(1, 'week').startOf('week');
                         end_date.set(start_date.toObject()).endOf('week');
                         break;
 
                     // If the viewType is "month", move 1 month forward.
                     case "month":
                         start_date.add(1, 'month').startOf('month');
                         end_date.set(start_date.toObject()).endOf('month');
                         break;
                 }
                 break;
 
             // If the action type is "next"
             case "prev":
                 switch( viewType ){
 
                     // If the viewType is "day", move 1 day backward.
                     case "day":
                         start_date.subtract(1, 'day').startOf('day');
                         end_date.set(start_date.toObject()).endOf('day');
                         break;
 
                     // If the viewType is "week", move 1 week backward.
                     case "week":
                         start_date.subtract(1, 'week').startOf('week');
                         end_date.set(start_date.toObject()).endOf('week');
                         break;
 
                     // If the viewType is "month", move 1 month backward.
                     case "month":
                         start_date.subtract(1, 'month').startOf('month');
                         end_date.set(start_date.toObject()).endOf('month');
                         break;
                 }
                 break;
         }
         props.fetchTimeOff( profile.details.id, start_date, end_date )
    }

    // Handles the fetching of Customized filter
    const handleCustomFilter = () => {
        
        start_date.set( moment(customStartDate).toObject())
        end_date.set( moment(customEndDate).toObject())
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
                <Row className="leaves-list">
                    <div className="view-type-tabs">
                        <Tabs defaultActiveKey="home" 
                            id="uncontrolled-tab-example"
                            defaultActiveKey={viewType}
                            onSelect={key => handleChangeViewType(key) }
                        >
                            <Tab eventKey="day" title="Today" type="submit"></Tab>
                            <Tab eventKey="week" title="Weekly" type="submit"></Tab>
                            <Tab eventKey="month" title="Monthly" type="submit"></Tab>
                            <Tab eventKey="custom" title="Custom" type="submit"></Tab>
                        </Tabs>
                    </div> 
                    { viewType == "custom" ? 
                        <React.Fragment>
                            <DatePicker 
                                className="custom-date"                      
                                showDateSelect
                                showDateSelectOnly
                                timeCaption="Time"
                                dateFormat="MMMM d, yyyy"
                                timeFormat="MMMM d, yyyy"
                                placeholder="Start Date"
                                selected={customStartDate}   
                                onChange={date => setCustomStartDate(date)} 
                            />
                             <span style={{marginTop: "5px"}}>to</span>
                            <DatePicker 
                                className="custom-date"                      
                                showDateSelect
                                showDateSelectOnly
                                timeCaption="Time"
                                dateFormat="MMMM d, yyyy"
                                timeFormat="MMMM d, yyyy"
                                placeholder="End Date"
                                selected={customEndDate}       
                                onChange={date => setCustomEndDate(date)} 
                            />                        
                            <Button className="custom-filter-btn" variant="primary" onClick={handleCustomFilter} >
                                <i className="fa fa-filter" />
                            </Button>
                        </React.Fragment>
                        :
                        <React.Fragment>
                            <div className="navigator">
                                <i className="fa fa-angle-left view-navigate" onClick={(e) => handleChangeNavigateAction("prev")} /> 
                                <i className="fa fa-angle-right view-navigate"  onClick={(e) => handleChangeNavigateAction("next")} />
                            </div>
                            <div className="dates-label">{ Validator.isValid( start_date ) && Validator.isValid( end_date ) ? (start_date.format("LL") === end_date.format("LL") ? start_date.format("LL") : start_date.format("LL") + " - " + end_date.format("LL") )  : null }</div>
                        </React.Fragment>
                    }

                </Row>
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
                <div className="no-leaves-row">You don't have any leaves { viewType === "custom" ? "within this date range" : "this " + viewType}.</div>
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
            status = <i className="fa fa-ban" style={{"color": '#bd2130'}} /> 
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
