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
import TeamAttendanceSummary from "../../../container/TeamAttendanceSummary";

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
                      <TeamAttendanceSummary/>
                          {/* <Content title="This Week's attendance summary" col="12">
                          <div classname="date">Date covered: April 5 - April 11</div>
                            <div class="content-table bdr0">
                                <table class="table ">
                                    <thead>
                                        <tr>
                                            <td colspan="4"><div className="total">30</div><h4 className="desc">Total Headcount</h4></td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><h4>Scheduled Headcount</h4>
                                                <div className="scheduled-hc">
                                                    <span className="total up">96.57%</span><span className="number">(144)</span>
                                                </div>
                                                <h5>TARGET: 95%</h5>
                                                
                                            </td>
                                            <td>
                                                <h4>Unplanned Leaves</h4>
                                                <div className="unplanned-leaves">
                                                    <span className="total down">3.43%</span><span className="number">(4)</span>
                                                </div>
                                                <h5>TARGET: 3%</h5>
                                                
                                            </td>
                                            <td>
                                            <h4>Planned Leaves</h4>
                                                <div className="planned-leaves">
                                                    <span className="total down">8.93%</span><span className="number">(13)</span>
                                                </div>
                                                <h5>TARGET: 7%</h5>
                                                
                                            </td>
                                                                                    </tr>

                                    </tbody>
                                    </table>
                            </div>
                          </Content>                  */}
                      </Row>
                      <Row className="team-attendance">  
                          <Content title="Today's attendance" col="12"><TeamAttendance/></Content>                
                      </Row>
                  </div>    
                  <div className="birthday-anniv col-5"> 
                      <Row>
                          <Content title="Celebrations" col="12"><BirthdayAnniversary/></Content>  
                      </Row>
                      
  
                     
                  </div>
                </Row>
              </div>
          );
  };
const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(HandlerDashboard);
