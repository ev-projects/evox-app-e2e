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
                      { !Authenticator.checkRole('client')  ? 
                            <Row>
                            <Content title="Upcoming holidays" col="12">
                                <Holiday/>
                                </Content>   
                                </Row>
                            :
                            (null)
                      }
                   <Row>
                    <Content title="ICT Schedule" col="12">
                      <img src="https://eastvantage.com/evox/ITSched.jpg" width="100%" />
                        <ul>
                          <li>For IT concerns please send an email to helpdesk@eastvantage.com</li>
                          <li>To follow up, you may chat us on skype at ev.it.helpdesk</li>
                          <li>For urgent emergency concerns reach out to: James (+63 917 8102 593)</li>
                        </ul>
                    </Content>   
                  </Row>
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
                            <p><a class="btn-primary" href="https://docs.google.com/forms/d/1BEACQ8tcxKOwDW2uttmAAqytAuDGgWd1ML-oBk4JTyQ/viewform?gxids=7628&amp;edit_requested=true">Covid Safety Declaration form</a></p>
                          </Row>
                            
                      </Content> 

                  </Row>
                    <Row>
                  <div className="col-lg-12">
                  <div className="card">
                    <div className="card-header">
                        <h3 align="center" className="card-title">JOB OPENINGS</h3>
                    </div>
                    <div className="card-body evbuddy">
                    <h4 align="center"><strong>Refer a friend and earn as much as 20K!</strong></h4>
                    <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                    <br />
                    <ul>
                   <li><a href="https://careers.eastvantage.com/content/full-stack-developerreact-js-developer-bgc">Full Stack Developer/React JS Developer</a></li>
<li><a href="https://careers.eastvantage.com/content/software-engineer-pythonetl-mid-senior-bgc">Software Engineer (Python/ETL)</a></li>
<li><a href="https://careers.eastvantage.com/content/senior-php-software-developer-backend-bgc">Senior PHP Software Developer (Laravel/Javascript)</a></li>
<li><a href="https://careers.eastvantage.com/content/sr-python-web-developer-api-bgc">Sr. Python Web Developer</a></li>
<li><a href="https://careers.eastvantage.com/content/devops-engineer-docker-aws-kubernetes-temporary-wfh-bgc">DevOps Engineer | Docker AWS & Kubernetes (Temporary WFH | BGC)</a></li>
<li><a href="https://careers.eastvantage.com/content/freightlogistics-customer-service-representative-e-commerce-account">Freight/Logistics Customer Service Representative (E-Commerce Account)</a></li>
<li><a href="https://careers.eastvantage.com/content/etl-engineer-python-ci-bgc-taguig">ETL Engineer</a></li>
<li><a href="https://careers.eastvantage.com/content/react-js-developer-mid-senior-bgc-taguig">React JS Developer (Mid - Senior)</a></li>
<li><a href="https://careers.eastvantage.com/content/qa-test-engineer-6-mos-contract-mobile-internet-banking">QA Test Engineer | 6 mos contract (Mobile & Internet Banking)</a></li>
<li><a href="https://careers.eastvantage.com/content/it-infrastructure-specialist-1-2-years-experience-work-site-bgc">IT Support Specialist | Shifting Schedule | BGC Taguig (1-3 years)</a></li>
<li><a href="https://careers.eastvantage.com/content/us-mortgage-loan-disclosure-specialist-night-shift-mandaluyong">US Mortgage Loan Disclosure Specialist | Night Shift | Mandaluyong</a></li>
<li><a href="https://careers.eastvantage.com/content/japanese-learning-specialist-customer-care-professional">Japanese Learning Specialist | Customer Care Professional</a></li>
<li><a href="https://careers.eastvantage.com/content/advertising-operations-manager-bgc-taguig">Advertising Operations Manager</a></li>
<li><a href="https://careers.eastvantage.com/content/au-traffic-planner-queensland-bgc-taguig">AU Traffic Planner</a></li>
<li><a href="https://careers.eastvantage.com/content/spanish-portuguese-bilingual-csr-bgc-taguig">Spanish-Portuguese Learning Specialist</a></li>
<li><a href="https://careers.eastvantage.com/content/german-learning-specialist-bgc">German Learning Specialist (BGC)</a></li>
<li><a href="https://careers.eastvantage.com/content/customer-support-specialist-logisticsfreight-bgc-taguig">Customer Support Specialist (Logistics/Freight) | BGC Taguig</a></li>
                    </ul>
                    
                  </div>
                  </div>
                  </div>
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
