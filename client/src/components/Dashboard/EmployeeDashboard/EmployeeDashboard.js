import React, { Component } from "react";
import "./EmployeeDashboard.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Tabs,Tab  } from 'react-bootstrap';
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
import ChangeLogs from "../../../components/Dashboard/ChangeLogs";
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
                  {/* <a href="https://careers.eastvantage.com/tech4tech" target="_blank"><img width="100%" src="/images/icn/Tech4Tech_EVOX.png" /></a> */}
                  <div className="card">
                    <div className="card-header">
                        <h3 align="center" className="card-title">JOB OPENINGS</h3>
                    </div>

                    <div className="jobs-tab">
                      <Tabs defaultActiveKey="ERP" id="uncontrolled-tab-example">
                          <Tab eventKey="ERP" title="PHT" type="submit">
                            <div className="card-body evbuddy">
                              <br />

                              <h4 align="center"><strong>Refer a friend and earn as much as 30K PHP!</strong></h4>
                              {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-0" target="_blank">Full Stack Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/technical-recruiter-3" target="_blank">Senior Technical Recruiter</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/network-and-security-engineer-1" target="_blank">Network and Security Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sr-rpa-developer-uipath" target="_blank">Senior RPA Ui Path Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sr-bi-engineer-tableau-ssrs" target="_blank">Senior BI Engineer (Tableau SSRS)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-project-manager" target="_blank">Senior Project Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/functional-tester-4" target="_blank">Functional Tester</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/sr-accountant-onsite-bgc-taguig-city" target="_blank">Sr. Accountant | Onsite | BGC, Taguig City</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/compliance-analyst-iso-270012013" target="_blank">Compliance Analyst (ISO 27001:2013)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/compliance-manager-hybrid-set" target="_blank">Compliance Manager (Hybrid Set-up)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/marketing-headmanager-hybrid-set" target="_blank">Marketing Head/Manager (Hybrid Set-up)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-business-analyst-night-shift-ortigas" target="_blank">Senior Business Analyst | Night Shift | Ortigas</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/collection-validation-specialist-dayshift-onsite-ortigas" target="_blank">Collection Validation Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sr-talent-acquition-specialist-onsite-bgc-weekends-hmo-day-1" target="_blank">Sr. Talent Acquition Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-analyst-0" target="_blank">Business Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/hr-generalist-onsite-bgc-taguig" target="_blank">HR Generalist | Onsite | BGC, Taguig</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-analyst-onsite-bgc-taguig-philippines" target="_blank">Business Analyst | Onsite | BGC Taguig, Philippines</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/bookkeeper-ortigas-site-night-shift" target="_blank">Bookkeeper | Ortigas On-site | Night Shift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/email-marketing-associate-onsite-ortigas-25k-30k" target="_blank">Email Marketing Associate | Onsite | Ortigas (25k-30k)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/us-talent-acquisition-specialist-night-shift-onsite-ortigas-pasig-city-35k-45k" target="_blank">US Recruiter</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-technical-recruiter-hybrid-setup" target="_blank">Senior Technical Recruiter | Hybrid Setup</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/financial-analyst-wfh-nightshift" target="_blank">Financial Analyst | WFH | Nighshift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/finance-operations-manager-bgc-taguig-ortigas" target="_blank">Finance Operations Manager | BGC, Taguig / Ortigas</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/admissions-officer-phone-screener-onsite-dayshift-ortigas" target="_blank">Admissions Officer/ Phone Screener </a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-onsite-bgc-taguig-city" target="_blank">Customer Service Representative (On-site/BGC)</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/accounting-bookkeeping-apar" target="_blank">Accounting & Bookkeeping (AP/AR)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-system-architect-permanent-wfh" target="_blank">Senior System Architect | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-performance-tester-wfh-setup" target="_blank">Senior Performance Tester (WFH setup)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/quality-reporting-analyst-wfh-setup" target="_blank">Quality Reporting Analyst (WFH Setup)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/database-developer-sql-and-t-sql" target="_blank">Database Developer (SQL and T-SQL)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/etl-developer-permanent-remote-set" target="_blank">ETL Developer | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/automation-tester-permanent-remote-set" target="_blank">Automation Tester | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/power-bi-report-developer-permanent-remote-set" target="_blank">Power BI Report Developer | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-net-developer-remote-set" target="_blank">Senior .Net Developer | Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/solutions-architect-front-end-software-engineer" target="_blank">Solutions Architect (Front-End Software Engineer)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/cloud-engineer-aws-permanent-wfh" target="_blank">Cloud Engineer (AWS) | Permanent WFH</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/senior-devops-engineer-vt-bgc" target="_blank">Senior DevOps Engineer | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-sre-bgc" target="_blank">Site Reliability Engineer | SRE (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-consultant-tester-vt-bgc-3" target="_blank">Service Delivery Consultant (Tester) | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-azure-bgc" target="_blank">DevOps Engineer | Azure (Permanent WFH)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-bgc-ops" target="_blank">Site Reliability Engineer | BGC | OPS</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-onboarding-project-manager-bgc" target="_blank">Senior Onboarding Project Manager | BGC</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-operations-manager-azure-background" target="_blank">Senior Operations Manager (with Azure background)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/marketing-technology-associate-fintech" target="_blank">Marketing Technology Associate | FinTech</a></li>
                              </ul>
                            </div>
                          </Tab>

                          <Tab eventKey="ERP India" title="IND" type="submit">
                            <div className="card-body evbuddy">
                              <br />
                              <h4 align="center"><strong>Refer a friend and earn as much as 25K INR!</strong></h4>
                              {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/odoo-developer-bangalore-india" target="_blank">Odoo Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/admissions-officer-0" target="_blank">Admissions Officer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/data-scientist" target="_blank">Data Scientist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/mobile-app-developer-0" target="_blank">Mobile App Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/power-bi-analyst" target="_blank">Power BI Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-partner-0" target="_blank">Business Partner</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/cyber-security-specialist" target="_blank">Cyber Security Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/intune-engineer" target="_blank">InTune Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/product-manager-0" target="_blank">Product Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/it-project-manager-1" target="_blank">Project Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/outsystems-developer" target="_blank">Outsystems Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/accountant" target="_blank">Accountant</a></li>
                              </ul>
                            </div>
                          </Tab>

                          {/* <Tab eventKey="Tech4Tech" title="Tech4Tech" type="submit">
                            <div className="card-body evbuddy">
                              <br />
                              <h4 align="center"><strong>Refer a friend and earn as much as 30K PHP!</strong></h4>
                              <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/front-end-developer-vuejs" target="_blank">Front End Developer (Vue.js)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/python-developer-temporary-wfh" target="_blank">Python Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-aws-docker-kubernetes" target="_blank">DevOps Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/reactjs-frontend-developer-bgc" target="_blank">ReactJS Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-0" target="_blank">Full Stack Developer (Laravel and Reactjs)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/java-application-developer" target="_blank">JAVA Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/wordpress-developer" target="_blank">WordPress Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/etl-specialist" target="_blank">ETL Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/web-application-security-professional" target="_blank">Penetration Tester</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/react-jsreact-native-developer" target="_blank">ReactJS/React Native Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/release-train-engineer" target="_blank">Release Train Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sql-azure-developer" target="_blank">SQL Azure Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/technical-seo-specialist" target="_blank">Technical SEO Specialist</a></li>
                              </ul>
                            </div>
                          </Tab> */}
                      </Tabs>
                    </div>

                    
                  </div>
                  </div>
                    </Row>

                </div>

                <div className="col-lg-4 col-md-6 col-sm-12">
                  <Row>
                    <Content title="EVOX Updates" col="12">
                      <ChangeLogs/>
                    </Content>
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
                  <Row className="company-announcement">
                      <Content title="Company Announcements" col="12">
                        <Row>
                          <p>
                            <a href="https://www.glassdoor.com/mz-survey/employer/collectReview_input.htm?i=1084085&j=true&y=&c=PAGE_INFOSITE_TOP" target="_blank">
                              <img width="100%" src="/images/icn/Glassdoorbanner-1.png" />
                            </a>
                          </p>
                          {/* { <ReactPlayer 
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
	    		    <p><img width="100%" src="/images/icn/EVOX-Safety-Protocols.png" /></p> */}
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
