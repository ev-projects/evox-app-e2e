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

const HandlerDashboard = ( props ) => {

    
    
    const { user } = props;
    const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

    return (
      <div className="dashboard client">
      <Row>
                       
                      <div className="form-group select-dept">
                          <select
                              name="department_id"
                              className="form-control"
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
                       
                      
                </Row>
  
                <Row>
                  <div className="col-7">
                      <Row className="team-summary">
                      <Content title="This Week's attendance summary" col="12">
                      <TeamAttendanceSummary/>
                      </Content>
                          
                      </Row>
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
          );
  };
const mapStateToProps = (state) => {
  return {
      user : state.user,
      data: state.client
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(HandlerDashboard);
