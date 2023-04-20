import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./JobOpenings.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncementList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import Figure from 'react-bootstrap/Figure';
import DashboardAnnouncementsList from "../DashboardAnnouncementsList";

import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import ShowMore from 'react-show-more-list';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card,Tabs,Tab,Badge  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
class JobOpenings extends Component {

  constructor(props, context) {
    super(props, context);

    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      key: "all-announcements"
    };
  }
  componentWillMount(){ 
	}
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData );
  }
  render() {


      return <>
             <div className="jobs-tab">
                      <Tabs defaultActiveKey="PHT" id="uncontrolled-tab-example">
                          <Tab eventKey="PHT" title="PHT" type="submit">
                          {/* <Tab eventKey="ERP" title="ERP" type="submit"> */}
                            <div className="card-body evbuddy">
                              <br />

                              <h4 align="center"className="refer-h4"><strong>Refer a friend and earn as much as 30K PHP!</strong></h4>
                              {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-service-desk-analyst-bcg-taguig" target="_blank">Senior Service Desk Analyst</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/euc-engineer" target="_blank">EUC Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/it-fleet-and-asset-management-coordinator-bgc" target="_blank">IT Fleet and Management Coordinator</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-software-engineer-php" target="_blank">Senior Software Engineer</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/student-enrolment-assistant" target="_blank">Student Enrolment Assistant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/telemarketer-bgc-taguig-city" target="_blank">Telemarketer | BGC, Taguig City</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-technical-recruiter-hybrid-setup" target="_blank">Senior Technical Recruiter | Hybrid Setup</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/financial-analyst-wfh-nightshift" target="_blank">Financial Analyst | WFH | Nighshift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/operations-workflow-associate-wfh-nightshift" target="_blank">Operations Workflow Associate | WFH | Nightshift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/staff-accountant-wfh-nightshift-urgent-hiring" target="_blank">Staff Accountant | WFH | Nightshift</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/english-virtual-teacher" target="_blank">English Virtual Teacher</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-development-executive-onsite-nightshift-ortigas-pasig" target="_blank">Business Development Executive | Onsite/ Nightshift | Ortigas, Pasig</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sales-telemarketer" target="_blank">Sales Telemarketer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sr-content-creator" target="_blank">Sr. Content Creator</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/prospect-engagement-consultant" target="_blank">Prospect Engagement Consultant</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sr-web-graphic-developer" target="_blank">Sr. Web & Graphic Developer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/business-sales-representative-site" target="_blank">Business Sales Representative</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/sales-representative-graveyard-shift-working-onsite-ortigas-pasig" target="_blank">Sales Representative | Graveyard Shift | Working Onsite Ortigas, Pasig</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/us-recruitment-manager-site-ortigas" target="_blank">US Recruitment Manager</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/financial-business-partner-bgc-taguig-ortigas-pasig-city" target="_blank">Financial Business Partner (BGC / Ortigas)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/insurance-operations-admin-bgc" target="_blank">Operations Admin (Life Insurance Account)</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-onsite-bgc-taguig-city" target="_blank">Customer Service Representative (On-site/BGC)</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/database-developer-sql-and-t-sql" target="_blank">Database Developer (SQL and T-SQL)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/dev-ops-engineer-aws-permanent-remote-set" target="_blank">Dev Ops Engineer | AWS | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-qa-tester-permanent-wfh" target="_blank">Senior QA Tester | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/qa-tester-permanent-wfh" target="_blank">QA Tester | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/etl-developer-permanent-remote-set" target="_blank">ETL Developer | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/automation-tester-permanent-remote-set" target="_blank">Automation Tester | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/power-bi-report-developer-permanent-remote-set" target="_blank">Power BI Report Developer | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/scrum-master-permanent-remote-set" target="_blank">Scrum Master | Permanent Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/application-performance-engineer-permanent-remote-set" target="_blank">Application Performance Engineer | Permanent Remote Setup</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/ux-designer-permanent-wfh" target="_blank">UX Designer | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-net-developer-remote-set" target="_blank">Senior .Net Developer | Remote Set Up</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/solutions-architect-front-end-software-engineer" target="_blank">Solutions Architect (Front-End Software Engineer)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/cloud-engineer-aws-permanent-wfh" target="_blank">Cloud Engineer (AWS) | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-performance-tester-full-time-remote-work" target="_blank">Senior Performance Tester | Full-Time Remote Work</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-database-developer-permanent-wfh" target="_blank">Senior Database Developer | Permanent WFH</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-it-business-analyst-remote-work" target="_blank">Senior IT Business Analyst | Remote Work</a></li>

                                <li><a href="https://careers.eastvantage.com/jobs/service-management-consultant-testing-services-bgc" target="_blank">Service Management Consultant | Testing Services (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-devops-engineer-vt-bgc" target="_blank">Senior DevOps Engineer | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/site-reliability-engineer-sre-bgc" target="_blank">Site Reliability Engineer | SRE (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/service-delivery-consultant-tester-vt-bgc-3" target="_blank">Service Delivery Consultant (Tester) | V&T (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/marketing-technology-associate-fintech" target="_blank">Marketing Technology Associate | FinTech</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/senior-manager-operations-bgc" target="_blank">Senior Manager | Operations | BGC</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/devops-engineer-azure-bgc" target="_blank">DevOps Engineer | Azure (BGC)</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/agile-people-manager-configuration-testing-bgc" target="_blank">Agile People Manager | Configuration & Testing | BGC</a></li>
                              </ul>
                            </div>
                          </Tab>

                          <Tab eventKey="IND" title="IND" type="submit">
                          {/* <Tab eventKey="ERP India" title="ERP India" type="submit"> */}
                            <div className="card-body evbuddy">
                              <br />
                              <h4 align="center" className="refer-h4"><strong>Refer a friend and earn as much as 25K INR!</strong></h4>
                              {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                              <br />
                              <ul>
                                <li><a href="https://careers.eastvantage.com/jobs/network-and-security-engineer-blr" target="_blank">Network and Security Engineer</a></li>
                                <li><a href="https://careers.eastvantage.com/jobs/outsystems-developer" target="_blank">Outsystems Engineer</a></li>
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


          
      
     </>

}

}
  
const mapStateToProps = (state) => {
return {
  user : state.user,
  // holiday : state.dashboard
  departmentAnnouncement             : state.departmentAnnouncement,

}
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDashboardAnnouncementList : () => dispatch( fetchDashboardAnnouncementList() ),
    fetchDashboardAnnouncementList : (data) => dispatch( fetchDashboardAnnouncementList(data) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(JobOpenings);








