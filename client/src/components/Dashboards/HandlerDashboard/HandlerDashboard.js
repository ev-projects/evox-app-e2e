import React, { Component } from "react";
import "./HandlerDashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { fetchUser } from '../../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import Wrapper from "../../Template/Wrapper";
import ReactPlayer from 'react-player/lazy';
import * as yup from "yup";
import BirthdayAnniversary from "../../../container/BirthdayAnniversary";
import TeamAttendance from "../../../container/TeamAttendance";
import Holiday from "../../../container/Holiday";
import TeamAttendanceSummary from "../../../container/TeamAttendanceSummary";
import Authenticator from "../../../services/Authenticator";
import * as Yup from 'yup';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { teamAttendanceStatus,birthdayAnniv } from '../../../store/actions/client/clientActions'


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

    this.props.teamAttendanceStatus( formData  );
    this.props.birthdayAnniv( formData  );
  }

  componentWillMount(){
  }


  departmentSelected = (departmentId) => {
  }
  
  render = () => {  
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
                <div className="col-7">
                    <Row className="team-attendance">  
                        <Content title="Today's attendance" col="12"><TeamAttendance/></Content>                
                    </Row>
                </div>    
                <div className="birthday-anniv col-5"> 
                  {Authenticator.checkRole('client') ? 
                          <Row>
                          <Content title="Upcoming holidays" col="12">
                              <Holiday/>
                              </Content>   
                              </Row>
                          :
                          (null)
                      }
                    <Row>
                        <Content title="Celebrations" col="10"><BirthdayAnniversary/></Content>  
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
      data: state.client
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() ),
    teamAttendanceStatus  : ( params ) => dispatch( teamAttendanceStatus( params ) ),
    birthdayAnniv         : ( params ) => dispatch( birthdayAnniv( params ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(HandlerDashboard);
