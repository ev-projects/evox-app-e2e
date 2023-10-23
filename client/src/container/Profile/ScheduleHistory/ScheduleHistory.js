import React, { Component, useState } from "react";
import "./ScheduleHistory.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl, Tabs, Tab  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import {fetchScheduleHistory } from '../../../store/actions/profile/profileActions';

import Paginate from '../../../components/Template/Paginate'
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
import { C } from "@fullcalendar/core/internal-common";
class ScheduleHistory extends Component {


    constructor(props){
    super(props);

    this.initialState = {
        filters: {
            status:         1,
        
            page:          1,
            // order_by:       this.props.myTeamList?.filters?.order_by,
            url:           'MyTeam'
        }
    }
    
    this.state = this.initialState; 
    }

onSubmitHandler = (values) => {

    var formData = {};

    for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
            switch( key ) {
                default:
                formData[key] = values[key];
                break;
            }
        } 
    }
    console.log(  formData);
    this.props.fetchScheduleHistory( this.props.profile.details.id, formData );
    
    } 

    componentWillMount(){
    // Fetch the my Team List upon mounting of the component if the My Team List is not yet initially loaded.
    // if( ! Validator.isValid( this.props.myTeamList.list ) ) {
    //   this.props.fetchMyTeamList( this.props.user.id, this.state.filters);
    // }

    }
    render = (  ) => {

    const { profile, user } = this.props;
 
    console.log();
        console.log(profile);
    return ( 
            Validator.isValid( profile ) && Validator.isValid( profile.schedule_history )  ?
            
                <Wrapper>
                     <ContainerWrapper>
                        <ContainerBody>
                            <Content col="12">
                                <>  
                                    <Formik 
                        enableReinitialize
                        onSubmit={this.onSubmitHandler} 
                        //   validationSchema={validationSchema} 
                        initialValues={this.state.filters}
                        >
                        {
                        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                        <form onSubmit={handleSubmit}>
                            
                            Total: { profile.schedule_history != null && profile.schedule_history.data.length > 0  ? profile.schedule_history.pagination.total : 0 }
                            <Table className="responsive schedule-info" striped bordered hover>
                            <thead>
                                <tr>
                                {/* <th>id</th> */}
                                <th>Type</th>
                                <th>Work Days</th>
                                <th>Valid From</th>
                                <th>Valid to</th>
                                <th>Created</th>
                                <th>Updated</th>
                                <th>Action</th>
                                
                            
                                
                                </tr>
                            </thead>
                            <tbody>
                                { profile.schedule_history.data.map((item) => {
                                    return <tr>
                                    {/* <td>{item.id}</td> */}
                                    <td>{item.source_type.toUpperCase()}</td>
                                    <td>{item.work_days.join(", ")}</td>
                                    <td>{ item.valid_from}</td>
                                    <td>{item.valid_to !=null || item.valid_to !="" ? item.valid_to : "ONWARDS"}</td>
                                    {/* <td> <Link to={{ pathname: global.links.profile+ profile.details.id+"/schedule/"+item.id  }} className="nav-link" >Details <i className="fa fa-eye" aria-hidden="true"></i></Link></td> */}
                                    <td>{item.created_at}</td>
                                    <td>{item.updated_at}</td>
                                    <td>  <a href={ global.links.profile+ profile.details.id+"/schedule/"+item.id} target={ "_blank"}>Details <i className="fa fa-eye" aria-hidden="true"></i></a></td>
                                </tr>         
                                })}
                            </tbody>
                            </Table>
                            <Paginate pagination={profile.schedule_history.pagination} />
                            </form>
                            )}
                            
                                    </Formik> 
                                </>
                            </Content>
                        </ContainerBody>
                    </ContainerWrapper>
                </Wrapper>
               
               
           
            :
            null
        );

    };


    }



    const mapStateToProps = (state) => {
    return {
        profile : state.profile,
        user : state.user
        
    }
    } 
    const mapDispatchToProps = (dispatch) => {

    return {
        fetchScheduleHistory: (id ,params) => dispatch(fetchScheduleHistory(id ,params)),

    }
    }
    export default connect(mapStateToProps, mapDispatchToProps)(ScheduleHistory);
