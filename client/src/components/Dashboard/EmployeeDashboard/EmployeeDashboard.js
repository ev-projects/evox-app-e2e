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
                  <a href="https://careers.eastvantage.com/tech4tech" target="_blank"><img width="100%" src="/images/icn/Tech4Tech_EVOX.png" /></a>
                  <div className="card">
                    <div className="card-header">
                        <h3 align="center" className="card-title">JOB OPENINGS</h3>
                    </div>

                    <div className="jobs-tab">
                      <Tabs defaultActiveKey="ERP" id="uncontrolled-tab-example">
                          <Tab eventKey="ERP" title="ERP" type="submit">
                            <div className="card-body evbuddy">
                              <br />

                              <h4 align="center"><strong>Refer a friend and earn as much as 30K PHP!</strong></h4>
                              <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/native-php-developer" target="_blank">Software Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/penetration-tester"  target="_blank">Penetration Tester</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-service-desk-analyst-bcg-taguig" target="_blank">Senior Service Desk Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/euc-engineer" target="_blank">Senior EUC Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/junior-it-project-manager" target="_blank">Junior IT Project Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/test-lead-cards-experience" target="_blank">Test Lead</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/netsuite-functional-consultant" target="_blank">NetSuite Technical Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/automation-tester" target="_blank">Automation Tester</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/automation-test-engineer" target="_blank">Automation Test Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/test-engineer-w-agile-process" target="_blank">Test Engineer (Agile)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/test-engineer-api-integration-knowledge" target="_blank">Test Engineer (API)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/test-engineer-w-android-ios-exp-1" target="_blank">Test Engineer w/ IOS & Android</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/test-engineer-treasury" target="_blank">Test Engineer (Treasury)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-test-engineer-1" target="_blank">Senior Test Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/agile-officer-scrum-masteragile-coach" target="_blank">Agile Officer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/data-migration-test-engineer" target="_blank">Data Migration Test Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/software-developer-java" target="_blank">Software Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/security-tester" target="_blank">Security Tester</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/netsuite-functional-consultant-bgc-onsite" target="_blank">Netsuite Functional Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/platform-managerbusiness-analyst" target="_blank">Platform Manager / Business Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/solutions-designeranalyst" target="_blank">Solutions Designer/Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/implementation-consultant-dayforce" target="_blank">Implementation Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/data-and-technical-consultant" target="_blank">Data and Technical Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-development-executive-bgc-taguig-city" target="_blank">Business Development Executive</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-sales-representative-site" target="_blank">Business Sales Representative</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/lead-generation-and-marketing-specialist-wfh" target="_blank">Lead Generation and Marketing Lead</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/technical-business-partner-bgc-taguig" target="_blank">Technical Business Partner</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/us-recruitment-manager-site-ortigas" target="_blank">US Recruitment Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/us-recruiter-onsite-ortigas-pasig" target="_blank">US Recruiter</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/financial-business-partner-bgc-taguig-ortigas-pasig-city" target="_blank">Financial Business Partner (BGC / Ortigas)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/advertising-operations-analyst-programmatic-campaigns-wfh" target="_blank">Advertising Operations Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/commercial-analyst-wfh-prior-experience-amazon-ebay-shopify" target="_blank">Commercial Analyst (with Amazon / eBay / Shopify)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/seo-content-specialist-wfh-prior-experience-amazon-ebay-shopify" target="_blank">SEO Content Specialist (with Amazon / eBay / Shopify)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/italian-learning-specialist-bgc-pooling" target="_blank">Italian Learning Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/japanese-learning-specialist-bgc-taguig" target="_blank">Japanese Learning Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/online-german-language-trainer-wfh-bgc-taguig-city" target="_blank">Virtual German Teacher</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/seo-content-writer-l-guest-posting-experience-bgc-taguig-city" target="_blank">SEO Content Writer (with guest posting experience)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/virtual-teacher-full-time-part-time-bgc-taguig-city" target="_blank">Virtual Teacher for Business English</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/insurance-operations-admin-bgc" target="_blank">Operations Admin (Life Insurance Account)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/operations-manager-%E2%94%82insurance-company-%E2%94%82bgc-taguig-city" target="_blank">Operations Manager (Life Insurance Account)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-seasonal-e-commerce-account-wfh" target="_blank">Seasonal Customer Service Representative (E-commerce Account/WFH)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/team-leader-must-have-experience-life-insurance-account-onsite-bgc-taguig" target="_blank">Team Leader | must have experience with Life Insurance Account (On-site/BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-onsite-bgc-taguig-city" target="_blank">Customer Service Representative (On-site/BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/csr%E2%94%83-technical-support-representative%E2%94%83non-voice%E2%94%83ortigas-pasig-city" target="_blank">Technical Support Representative (Non-voice)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/csr%E2%94%82-bahasa%E2%94%82onsite%E2%94%82ortigas" target="_blank">Bahasa CSR (On-site/Ortigas)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-angular-developer-frontend" target="_blank">Senior Angular Developer (Frontend)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-dot-net-developer-remote-work-mid-shift" target="_blank">Senior Dot Net Developer | Remote Work | Mid-Shift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/solutions-architect-front-end-software-engineer" target="_blank">Solutions Architect (Front-End Software Engineer)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-database-developer-permanent-wfh" target="_blank">Senior Database Developer | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-management-consultant-testing-services-bgc" target="_blank">Service Management Consultant | Testing Services (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-vt-bgc" target="_blank">DevOps Engineer | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-sre-bgc" target="_blank">Site Reliability Engineer | SRE (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-consultant" target="_blank">Business Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-service-delivery-consultant-bgc" target="_blank">Senior Service Delivery Consultant (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/project-management-officer-bgc" target="_blank">Project Management Officer (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-consultant-tester-vt-bgc-3" target="_blank">Service Delivery Consultant (Tester) | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-consultant-sdc-taguig" target="_blank">Service Delivery Consultant | SDC | Taguig</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-bgc-ops" target="_blank">Site Reliability Engineer | BGC | OPS</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-network-focused-bgc" target="_blank">Site Reliability Engineer (Network-focused) | BGC</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-it-consultant-bgc" target="_blank">Service Delivery IT Consultant (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/martech-consultant-fintech" target="_blank">MarTech Consultant | FinTech</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/scrum-masteragile-team-facilitator-bgc" target="_blank">Scrum Master/Agile Team Facilitator (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sre-database-engineer-oracle-bgc" target="_blank">SRE Database Engineer | Oracle | BGC</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/agile-team-lead-quality-assurance-bgc" target="_blank">Agile Team Lead | Quality Assurance | BGC</a></li>
                              </ul>
                            </div>
                          </Tab>

                          <Tab eventKey="ERP India" title="ERP India" type="submit">
                            <div className="card-body evbuddy">
                              <br />
                              <h4 align="center"><strong>Refer a friend and earn as much as 25K INR!</strong></h4>
                              <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div>
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/python-developer-bangalore-india-1" target="_blank">Python Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-aws-docker-kubernetes-bangalore-india" target="_blank">DevOps Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/reactjs-frontend-developer-bgc" target="_blank">ReactJS Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-0" target="_blank">Full Stack Developer (Laravel and Reactjs)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/java-application-developer" target="_blank">JAVA Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/automation-tester-0" target="_blank">Automation Tester</a></li>
                              </ul>
                            </div>
                          </Tab>

                          <Tab eventKey="Tech4Tech" title="Tech4Tech" type="submit">
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
                          </Tab>
                      </Tabs>
                    </div>

                    
                  </div>
                  </div>
                    </Row>

                </div>

                <div className="col-lg-4 col-md-6 col-sm-12">
                  <Row>
                    <Content title="Release Notes" col="12">
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
