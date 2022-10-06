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
        url: '/images/webinar/EVS_EV_Safe.mp4',
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
                  <a href="https://careers.eastvantage.com/tech4tech" target="_blank"><img width="100%" src="/images/icn/Tech4Tech_EVOX.png" /></a>
                  <div className="card">
                    <div className="card-header">
                        <h3 align="center" className="card-title">JOB OPENINGS</h3>
                    </div>

                    <div className="card-body evbuddy">
                    <br />

                    <h4 align="center"><strong>Refer a friend and earn as much as 30K!</strong></h4>
                    <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                    <br />
                    <ul>
                    <li><a href="https://careers.eastvantage.com/jobs/software-engineer-php-backend" target="_blank">Software Engineer (PHP Developer)</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/front-end-developer-vuejs"  target="_blank">Front End Developer (Vue.js)</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/python-developer-temporary-wfh" target="_blank">Python Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-aws-docker-kubernetes" target="_blank">DevOps Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/reactjs-frontend-developer-bgc" target="_blank">ReactJS Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-0" target="_blank">Full Stack Developer (Laravel and Reactjs)</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/java-application-developer" target="_blank">JAVA Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/wordpress-developer" target="_blank">WordPress Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/qa-engineer-0" target="_blank">QA Automation Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/etl-specialist" target="_blank">ETL Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/web-application-security-professional" target="_blank">Penetration Tester</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/application-developer-rpa-permanent-wfh" target="_blank">Application Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/react-jsreact-native-developer" target="_blank">ReactJS/React Native Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/functional-tester" target="_blank">Functional Tester</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/c-developer-azure-environment" target="_blank">C# Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/elixir-developer" target="_blank">Elixir Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/netsuite-sca-developer" target="_blank">NetSuite SCA Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/cloud-server-engineer" target="_blank">Cloud Server Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/qa-engineer-0" target="_blank">QA Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-0" target="_blank">Full Stack Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/nodejs-developer-wfh" target="_blank">NodeJS/Typescript Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/react-native-engineer-wfh" target="_blank">React Native Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/service-desk-manager" target="_blank">Service Desk Team Leader</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/service-desk-analyst" target="_blank">Service Desk Analyst</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/test-automation-engineer" target="_blank">Test Automation Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/infrastructure-engineer-azure-aws-bgc" target="_blank">Infrastructure Engineer | Azure, AWS</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/service-delivery-consultant-testing-bgc" target="_blank">Service Delivery Consultant (Tester)</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/service-delivery-dba-oracle-bgc" target="_blank">Service Delivery - DBA Oracle</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/service-management-consultant-testing-services-bgc" target="_blank">Service Management Consultant | Testing Services</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/nodejs-developer-wfh" target="_blank">NodeJS Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/social-media-crypto-content-creator-1" target="_blank">Social Media Content Creator</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/youtube-content-creator-work-home" target="_blank">Youtube Content Creator</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/crypto-and-blockchain-expert-wfh" target="_blank">Crypto and Blockchain Expert (WFH)</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/youtube-video-and-content-editor-work-home" target="_blank">YouTube Video and Content Editor (Work From Home)</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/senior-software-salesforce-developer" target="_blank">Senior Software Salesforce Developer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/power-platform-consultant" target="_blank">Power Platform Consultant</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/power-bi-consultant" target="_blank">PowerBI Consultant</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/principal-consultant-azure-data-engineer" target="_blank">Principal Consultant | Azure Data Engineer</a></li>
                    <li><a href="https://careers.eastvantage.com/jobs/aml-advisory-and-kyc-specialist" target="_blank">AML Advisory and KYC Specialist</a></li>
                  </ul>
                    
                  </div>
                  </div>
                  </div>
                    </Row>

                </div>
                <div className="col-lg-4 col-md-6 col-sm-12">
                { !Authenticator.checkRole('client')  ? 
                            <Row>
                            <Content title="Upcoming holidays" col="12">
                                <Holiday/>
                                </Content>   
                                </Row>
                            :
                            (null)
                      }
                  <Row className="company-announcement">
                      <Content title="Company Announcements" col="12">
                        <Row>
                          <p>
                            <a href="https://www.glassdoor.com/mz-survey/employer/collectReview_input.htm?i=1084085&j=true&y=&c=PAGE_INFOSITE_TOP" target="_blank">
                              <img width="100%" src="/images/icn/Glassdoorbanner-1.png" />
                            </a>
                          </p>
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
	    		    <p><img width="100%" src="/images/icn/EVOX-Safety-Protocols.png" /></p>
                          </Row>
                            
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
