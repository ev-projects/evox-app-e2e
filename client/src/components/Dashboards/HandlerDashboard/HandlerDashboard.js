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
      <div className="dashboard">
      <Row>
                       
                      <div className="form-group">
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
                      <Row>
                          <Content title="This Week's attendance summary" col="12"><TeamAttendanceSummary/></Content>                 
                      </Row>
                        <Row>
                            <Content title="Today's attendance" col="12"><TeamAttendance/></Content>                
                        </Row>
                  </div>    
                  <div className="birthday-anniv col-5"> 
                      <Row>
                          <Content title="Celebrations" col="12"><BirthdayAnniversary/></Content>  
                      </Row>
                      <Row>
                          <Content title="Incoming holidays" col="12"></Content>                  
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
