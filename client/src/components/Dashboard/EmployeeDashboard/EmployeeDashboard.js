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
                                <li><a href="https://careers.eastvantage.com/jobs/sr-bi-engineer-%E2%80%93-microstrategy" target="_blank">Senior BI Engineer (Microstrategy SSRS)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-project-manager" target="_blank">Senior Project Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/functional-tester-4" target="_blank">Java Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/systems-engineer-public-cloud" target="_blank">System Engineer - Public Cloud</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/euc-engineer-0" target="_blank">EUC Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-software-engineer-php-laravel-work-home" target="_blank">Senior Software Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-desk-analyst-0" target="_blank">Service Desk Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/it-technician-night-shift-wfh" target="_blank">IT Technician</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/business-development-executive" target="_blank">Business Development Executive</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/us-talent-acquisiton-specialist-must-have-experience-hiring-white-collar-jobs-onsite-ortigas" target="_blank">US Talent Acquisiton Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/learning-and-development-specialist-onsite-bgc-taguig" target="_blank">Learning and Development Specialist | Hybrid | BGC, Taguig</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/compliance-manager-hybrid-set" target="_blank">Compliance Manager (Hybrid Set-up)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-business-analyst-night-shift-ortigas" target="_blank">Senior Business Analyst | Night Shift | Ortigas</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sr-talent-acquition-specialist-onsite-bgc-weekends-hmo-day-1" target="_blank">Sr. Talent Acquition Specialist</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-analyst-0" target="_blank">Business Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-analyst-onsite-bgc-taguig-philippines" target="_blank">Business Analyst | Onsite | BGC Taguig, Philippines</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/bookkeeper-ortigas-site-night-shift" target="_blank">Bookkeeper | Ortigas On-site | Night Shift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/us-talent-acquisition-specialist-night-shift-onsite-ortigas-pasig-city-25k-35k" target="_blank">US Recruiter</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-technical-recruiter-hybrid-setup" target="_blank">Senior Technical Recruiter | Hybrid Setup</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/financial-analyst-wfh-nightshift" target="_blank">Financial Analyst | WFH | Nighshift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/finance-operations-manager-bgc-taguig-ortigas" target="_blank">Finance Operations Manager | BGC, Taguig / Ortigas</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/global-recruitment-head" target="_blank">Global Recruitment Head</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/legal-counsel" target="_blank">Legal Counsel</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/account-manager" target="_blank">Account Manager</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/healthcare-insurance-representative-local-account-80-nonvoice-25k-34k-day-1-hmo" target="_blank">Healthcare Insurance Representative | Local Account </a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-us-blended-account" target="_blank">Customer Service Representative (US Blended Account)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/real-state-admin-coordinator" target="_blank">Real State Admin Coordinator</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-performance-tester-wfh-setup" target="_blank">Senior Performance Tester (WFH setup)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-net-developer-remote-set" target="_blank">Senior .Net Developer | Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/cloud-engineer-aws-permanent-wfh" target="_blank">Cloud Engineer (AWS) | Permanent WFH</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/senior-devops-engineer-vt-bgc" target="_blank">Senior DevOps Engineer | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-sre-bgc" target="_blank">Site Reliability Engineer | SRE (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-consultant-vt-bgc" target="_blank">Service Delivery Consultant (Tester) | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-azure-background-permanent-work-home" target="_blank">DevOps Engineer (with Azure background) | Permanent Work From Home</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-bgc-ops" target="_blank">Site Reliability Engineer | BGC | OPS</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/marketing-technology-associate-fintech" target="_blank">Marketing Technology Associate | FinTech</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-technical-consultant-bgc-hybrid" target="_blank">Service Delivery Technical Consultant | BGC | Hybrid</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-technical-consultant-data-warehousing-and-business-intelligence" target="_blank">Senior Service Delivery Technical Consultant - Data Warehousing and Business Intelligence</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-devops-engineer-permanent-work-home-apac-shift" target="_blank">Senior DevOps Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/lead-devops-engineer-permanent-work-home-apac-shift" target="_blank">Lead DevOps Engineer</a></li>
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
                                <li><a href="https://careers.eastvantage.com/jobs/python-developer-bangalore-india-2" target="_blank">Python Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/react-js-developer-1" target="_blank">React JS Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/system-analyst-3" target="_blank">System Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/systems-engineer-public-cloud" target="_blank">System Engineer - Public Cloud</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/compliance-manager-bangalore" target="_blank">Compliance Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-c-net" target="_blank">.Net Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/global-recruitment-head-0" target="_blank">Global Recruitment Head</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/it-project-manager-1" target="_blank">Project Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-it-technician" target="_blank">Senior IT Technician</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/power-bi-analyst" target="_blank">Power BI Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/accountant" target="_blank">Accountant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/it-project-manager-1" target="_blank">Project Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-analyst-1" target="_blank">Business Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-partner-0" target="_blank">Business Partner</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/netsuite-adminstrator-developer" target="_blank">Netsuite Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-bengaluru" target="_blank">Full Stack Developer</a></li>
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
