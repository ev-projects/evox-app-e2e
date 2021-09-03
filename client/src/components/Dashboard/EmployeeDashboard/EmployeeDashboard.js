import React, { Component } from "react";
import "./EmployeeDashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { fetchUser } from '../../../store/actions/userActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import Wrapper from "../../Template/Wrapper";
import ReactPlayer from 'react-player/lazy';
import * as yup from "yup";
import QuickPunch from "../../../components/Dashboard/QuickPunch";
import Holiday from "../../../components/Dashboard/Holiday";
import Authenticator from "../../../services/Authenticator";
import DtrNotifications from "../../../components/Dashboard/DtrNotifications";
import RecentDtr from "../../../components/Dashboard/RecentDtr";
import moment from 'moment';

const EmployeeDashboard = ( props ) => {

  let state = {
        url: 'https://www.eastvantage.com/newsletter/2020/october/EVSafe.mp4',
        pip: false,
        playing:  false,
        controls: true,
        light: false,
        volume: 0.35,
        muted: false,
        played: 0,
        loaded: 0,
        duration: 0,
        config: { 
          file: { 
            attributes: {
              onContextMenu: e => e.preventDefault(),
              controlsList: 'nodownload' 
            } 
          } 
        },
        playbackRate: 1.0,
        loop: false,
        width: '100%',
        height: '65%'
    } 
    
    const { width, height, url, playing, controls, light, volume, muted, config, loop, playbackRate, pip, showSubmitForm } = state
    
    const { user } = props;
    const { current_payroll_cutoff } = props.settings;
		const { my_dtr_notifications } = props.dashboard;
    
    const payload = user.payload ? JSON.stringify(user.payload): "No Payload Yet!";

    return (<div className="dashboard">
              <Row>

              <div className="col-lg-4 col-md-6 col-12">
                
                    <Row>
                      <Col size="12">
                          <QuickPunch />
                      </Col>
                    </Row>

                    <Row className="dtr-teaser">
                        <Content title="Daily Time Record" col="12">
                          <RecentDtr/>
                        </Content>     
                    </Row>

                    <Row className="dtr-notifications">
                        <Content  col="12" title={<span>DTR Notifications <small>({my_dtr_notifications?.filter(data => moment().diff(moment(data.date)) > 0).length})</small></span>} subtitle={<small> Payroll Cut-off: <br /> {moment( current_payroll_cutoff?.start_date ).format("MMM D")  +" - "+ moment( current_payroll_cutoff?.end_date ).format("MMM D")} </small>}>
                          <DtrNotifications/>
                        </Content>       
                    </Row> 

                </div>

                <div className="col-lg-4 col-md-6 col-12">
                     
                       <Row>
                  <div className="col-lg-12">
                  <a href="https://careers.eastvantage.com/tech4tech" target="_blank"><img width="100%" src="https://eastvantage.com/evox/icn/Tech4Tech_EVOX.jpg" /></a>
                  <div className="card">
                    <div className="card-header">
                        <h3 align="center" className="card-title">TECH 4 TECH QUALIFIED JOB OPENINGS</h3>
                    </div>
                    <div className="card-body evbuddy">
                    <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                    <br />
                    <ul>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/senior-python-backendapi-developer-bgc-taguig">Senior Python Backend/API Developer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/senior-frontend-developer-reactjs"> Senior Frontend (ReactJS/PHP) Developer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/qa-engineer-0"> QA Engineer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/etl-engineer-bgc-taguig">ETL Engineer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/software-development-manager-bgc-taguig">Software Development Manager</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/devops-engineer-bgc"> DevOps Engineer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/php-backend-wordpress-developer"> Wordpress Developer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/senior-test-automation-engineer-0">Senior Test Automation Engineer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/senior-test-engineer">Senior Test Engineer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-lead-automation-selenium-knowledge">Test Lead Automation (With - Selenium Knowledge)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-lead-automation-selenium-knowledge-0">Automation Test Lead (with Mobile and Web knowledge)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-automation-engineer-selenium"> Test Automation Engineer</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-engineer-banking-knowledge">Test Engineer (with Banking knowledge)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/senior-test-engineer-data-warehouse-experience">Senior Test Engineer (Data Warehouse experience)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/senior-test-engineer-banking-knowledge">Senior Test Engineer (with Banking Loan knowledge)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-lead-finacle-experience"> Test Lead (with Finacle Experience)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-engineer-treasury-experience">Test Engineer (with Treasury Experience)</a></li>
<li><a target="_blank" href="https://careers.eastvantage.com/jobs/test-engineer-finacle-experience-0">Test Engineer (with Finacle Experience)</a></li>

</ul>
                    
                  </div>
                  </div>
                  </div>
                    </Row>
                     { !Authenticator.checkRole('client')  ? 
                            <Row>
                            <Content title="Upcoming holidays" col="12">
                                <Holiday/>
                                </Content>   
                                </Row>
                            :
                            (null)
                      }
                </div>
                <div className="col-lg-4 col-md-6 col-sm-12">
                  <Row className="company-announcement">
                      <Content title="Company Announcements" col="12">
                        <Row>
                          { <ReactPlayer 
                              width={width}
                              height={height}
                              url={url}
                              pip={pip}
                              playing={playing}
                              controls={controls}
                              light={light}
                              loop={loop}
                              playbackRate={playbackRate}
                              volume={volume}
                              muted={muted}
                              config={config}
                          /> }
                            
                            <p>All returning employees are advised to complete a Covid Safety Declaration and acknowledgement of understanding EV&nbsp;Training. <br /> Click the link below to fill out the form </p>
                            <a class="btn-primary" href="https://docs.google.com/forms/d/1BEACQ8tcxKOwDW2uttmAAqytAuDGgWd1ML-oBk4JTyQ/viewform?gxids=7628&amp;edit_requested=true">Covid Safety Declaration form</a>
                          </Row>
                            
                      </Content> 

                  </Row>
                   
                   <Row className="ITsched">
                    <Content title="ICT Schedule" col="12">
                      <img src="https://eastvantage.com/evox/ITSched.jpg" width="100%" />
                        <ul>
                           <li>For IT concerns please send an email to helpdesk@eastvantage.com</li>
                          <li>You may chat us via zoom or google chat at helpdesk@eastvantage.com</li>
                          <li>For urgent emergency concerns reach out to: James (+63 917 8102 593)</li>
                        </ul>
                    </Content>   
                  </Row>
                  
                 
                </div>
                
                                        
              </Row>
            </div>
        );
};


const mapStateToProps = (state) => {
  return {
      user : state.user,
      settings : state.settings,
      dashboard : state.dashboard,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(EmployeeDashboard);
