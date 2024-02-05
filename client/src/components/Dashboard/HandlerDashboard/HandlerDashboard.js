import React, { Component } from "react";
import "./HandlerDashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { fetchUser } from '../../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import moment from 'moment';
import BirthdayAnniversary from "../../../components/Dashboard/BirthdayAnniversary";
import TeamAttendance from "../../../components/Dashboard/TeamAttendance";
import Holiday from "../../../components/Dashboard/Holiday";
import Authenticator from "../../../services/Authenticator";
import * as Yup from 'yup';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { getTeamAttendanceStatus, getBirthdayAnniv } from '../../../store/actions/dashboard/dashboardActions'
import { getTeamAttendanceSummary } from '../../../store/actions/report/reportActions'
import TeamAttendanceSummaryPanel from "../../Report/TeamAttendanceSummaryPanel";
import Validator from "../../../services/Validator";


  class HandlerDashboard extends Component {

  
    constructor(props){
      super(props);

      this.initialState = {
          filters: {
            department_id:  this.props.myTeamList?.filters?.department_id,
            url:           'Dashboard'
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

    this.props.getTeamAttendanceStatus( formData  );
    this.props.getBirthdayAnniv( formData  );

    if( Authenticator.scanLevel("Client") ){
      this.props.getTeamAttendanceSummary( moment().startOf('week'), moment().endOf('week'), formData  );
    }
    
  }

  componentWillMount(){

    if( Authenticator.scanLevel("Client") ){
      this.props.getTeamAttendanceSummary( moment().startOf('week'), moment().endOf('week'), {} );
    }
  }


  departmentSelected = (departmentId) => {
  }
  
  render = () => {

    const { team_attendance_summary } = this.props.report;
    const { user } = this.props;
    var total = [];
    var validationSchema = Yup.object().shape({});

        return(<Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          validationSchema={validationSchema} 
          initialValues={this.state.filters}>
          {
          ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
            <div className="dashboard client">
            <Row>
              { user?.departments_handled.length > 1 ? 
                <div className="form-group select-dept">
                    <select
                      className="form-control" 
                      name="department_id"
                      value={values.department_id}
                      onChange={(e) => { setFieldValue('department_id', e.target.value); handleSubmit();  }}
                      style={{ display: 'block' }}
                    >
                    <option value="" label="Select Account" />
                    { user?.departments_handled.length > 0 ? 
                        user.departments_handled.map((value, index) => {
                            return <option value={value.id} >{value.department_name}</option>;
                        })
                      :
                      null
                    }
                    </select>
                </div>
                :
                null
              }
              </Row>
              <Row>
                <div className="col-lg-6 col-md-6 col-sm-12">
                    {Authenticator.scanLevel("Client") ? 
                          <Row>
                            <Content title="This Week's Attendance Summary" col="12">
                              { Validator.isValid(team_attendance_summary) && 
                                <TeamAttendanceSummaryPanel team_attendance_summary={team_attendance_summary} show_list={false} />
                              }
                            </Content>   
                          </Row>
                          :
                          (null)
                    }
                    <Row className="team-attendance">  
                        <Content title="Today's attendance" col="12"><TeamAttendance/></Content>                
                    </Row>
                </div>    
                <div className="birthday-anniv col-lg-6 col-md-6 col-sm-12"> 
                    {Authenticator.scanLevel("Client") ? 
                          <Row>
                            <Content title="Upcoming holidays" col="12">
                              <Holiday/>
                            </Content>   
                          </Row>
                          :
                          (null)
                    }
                    <Row>
                        <Content title="Celebrations" col="12"><BirthdayAnniversary/></Content>  
                    </Row> 

                </div>
              </Row>
                    </div>
            </form>
          )}
        
          </Formik>);
      }
  }



const mapStateToProps = (state) => {
  return {
      user : state.user,
      data: state.client,
      report : state.report,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() ),
    getTeamAttendanceStatus  : ( params ) => dispatch( getTeamAttendanceStatus( params ) ),
    getBirthdayAnniv         : ( params ) => dispatch( getBirthdayAnniv( params ) ),
    getTeamAttendanceSummary  : ( start_date, end_date, params ) => dispatch( getTeamAttendanceSummary( start_date, end_date, params ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(HandlerDashboard);
