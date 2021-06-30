import React, { Component, useState, useEffect  } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Tabs,Tab,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./TeamAttendanceSummary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { getTeamAttendanceSummary } from '../../../store/actions/report/reportActions'
import { fetchTeamUnderDepartment } from '../../../store/actions/filters/myTeamActions';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import ReportNavigator from "../../../components/Template/ReportNavigator/ReportNavigator.js";
import Validator from "../../../services/Validator.js";
import TeamAttendanceSummaryPanel from "../../../components/Report/TeamAttendanceSummaryPanel";

class TeamAttendanceSummary extends Component {
    constructor(props){
        super(props);

        this.initialState = {
          start_date:       moment().startOf('week'),
          end_date:         moment().endOf('week'),
          department_id:    this.props.user.departments_handled.length > 0 ? this.props.user.departments_handled[0].id : "",
          team_id:          "",
          name:             "",
        }
        this.state = this.initialState;
    }

    handleSubmit = () => {
      var formData = {};

      for ( var key in this.state) {
        // console.log(this.state, key, this.state[key]);
        if( this.state[key] != null && this.state[key] != ""  ) {
          switch( key ) {
            case "start_date":
            case "end_date": 
              break;
            default:
              formData[key] = this.state[key];
              break;
          }
        } 
      }
      this.props.getTeamAttendanceSummary( this.state.start_date, this.state.end_date, formData )
    }

    // Handles the change of date that'll be triggered by the ReportNavigator
    handleChangeDate = ( start_date, end_date, scope_type ) => {
      this.setState({
        start_date : start_date,
        end_date : end_date,
      });
      this.handleSubmit();
    }


    handleSelectDepartment = (department_id) => {
      if( department_id != '' ) {
        this.setState({
          department_id : department_id
        });
        this.props.fetchTeamUnderDepartment(this.props.user.id, department_id);
      }
    }

    handleFilterChange = (e) => {
      this.setState({ [e.target.name]: e.target.value })
    }

    componentWillMount(){ 
      // this.handleChangeDate( this.state.start_date, this.state.end_date );
      this.handleSubmit();
    }
      
    render = () => {  

      const { team_attendance_summary } = this.props.report;
      const { start_date, end_date } = this.state; 
      const { user } = this.props; 
      const { team_list } = this.props.myTeamList;

      return(
          <Wrapper {...this.props} >
            <ContainerWrapper> 
              <h2>Team Attendance Summary</h2> 
                <div className="navigator-bar">
                  <ReportNavigator start_date={this.state.start_date} end_date={this.state.end_date} handleChangeDate={this.handleChangeDate}  default_view_type={"week"} hide_filter_button={true}/>
                  {/* { Validator.isValid( start_date ) && Validator.isValid( end_date ) ? (start_date.format("LL") === end_date.format("LL") ? start_date.format("LL") : start_date.format("LL") + " - " + end_date.format("LL") )  : null } */}
                </div>
                <ContainerBody>        
                  <Content col="12">
                    <Row className="filters filter-dtr">  
                      <Col size="2"> 
                        <div className="form-group">
                            <select
                            className="form-control" 
                              name="department_id"
                              value={this.state.department_id}
                              onChange={(e) => { 
                                this.handleSelectDepartment(e.target.value)
                              }}
                              style={{ display: 'block' }}
                            >
                            <option label="Select Department" value=''/>
                            {user.departments_handled.map(function(item){
                              return <option key={item.id} value={item.id} label={item.department_name} />;
                            })}
                            </select>
                        </div>
                      </Col> 
                      <Col size="2"> 
                        <div className="form-group">
                            <select
                            className="form-control" 
                              name="team_id"
                              value={this.state.team_id}
                              onChange={this.handleFilterChange}
                              style={{ display: 'block' }}
                            >
                            <option label="Select Team" />
                            {team_list.length > 0 && team_list.map(function(item){
                              return <option key={item.id} value={item.id} label={item.name} />;
                            })}
                            </select>
                        </div>
                      </Col> 
                      <Col size="2"> 
                        <div className="form-group">
                            <input type="textfield" className="form-control" variant="primary" placeholder="Enter Name" name="name" onChange={this.handleFilterChange} value={this.state.name} />
                        </div>
                      </Col> 
                      <Col size="2"> 
                          <Button variant="primary" type="submit" onClick={this.handleSubmit}>
                            <i className="fa fa-filter" /> Filter
                          </Button>
                      </Col> 
                    </Row>
                    <Row> 
                      { Validator.isValid(team_attendance_summary) && 
                        <TeamAttendanceSummaryPanel team_attendance_summary={team_attendance_summary} selected_summary={this.props.report.selected_summary}/>
                      }
                    </Row>
                  </Content>
                </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
      );
    }
}

  const validationSchema = Yup.object().shape({});
  
  const mapStateToProps = (state) => {

    return {
      user : state.user,
      report : state.report,
      myTeamList  : state.myTeamList
    }
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      getTeamAttendanceSummary  : ( start_date, end_date, params ) => dispatch( getTeamAttendanceSummary( start_date, end_date, params ) ),
      fetchTeamUnderDepartment : ( user_id, department_id ) => dispatch( fetchTeamUnderDepartment( user_id, department_id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(TeamAttendanceSummary);
  