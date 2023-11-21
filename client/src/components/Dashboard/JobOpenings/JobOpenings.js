import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./JobOpenings.css";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
} from "../../GridComponent/AdminLte.js";
import { fetchDashboardAnnouncementList } from "../../../store/actions/announcement/departmentAnnouncementActions";
import Figure from "react-bootstrap/Figure";
import DashboardAnnouncementsList from "../DashboardAnnouncementsList";

import {
  Formik,
  FieldArray,
  Field,
  ErrorMessage,
  getIn,
  Form,
  useFormikContext,
} from "formik";
import ShowMore from "react-show-more-list";
import { connect } from "react-redux";
import {
  Container,
  Row,
  Col,
  Table,
  Image,
  Spinner,
  Button,
  Card,
  Tabs,
  Tab,
  Badge,
} from "react-bootstrap";
import PageLoading from "../../../container/PageLoading/PageLoading";
class JobOpenings extends Component {
  constructor(props, context) {
    super(props, context);

    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      key: "all-announcements",
    };
  }
  componentWillMount() {}
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData);
  };
  render() {
    return (
      <>
        <div className="jobs-tab">
          <Tabs defaultActiveKey="PHL" id="uncontrolled-tab-example">
            <Tab eventKey="PHL" title="PHL" type="submit">
              {/* <Tab eventKey="ERP" title="ERP" type="submit"> */}
              <div className="card-body evbuddy">
                <br />

                <h4 align="center" className="refer-h4">
                  <strong>Refer a friend and earn as much as 30K PHP!</strong>
                </h4>
                {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                <br />
                <ul>
                  <li><a href="https://careers.eastvantage.com/jobs/reactjs-developer" target="_blank">ReactJS Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/power-bi-analyst-hybrid" target="_blank">Power BI Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-engineer-onsite-bgc" target="_blank">Data Engineer (ETL)</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/technical-recruiter" target="_blank">Technical Recruiter</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/software-engineer-net" target="_blank">Software Engineer (.NET Developer)</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/performance-test-engineer-0" target="_blank">Performance Test Engineer</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/compliance-manager-iso27001pci-dssgdprdpa" target="_blank">Compliance Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/recruitment-team-lead-hybrid-set-fixed-weekends" target="_blank">Recruitment Team Lead</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/proposal-writer-sales-support-lead-hybrid-set" target="_blank">Proposal Writer & Sales Support Lead</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/graphic-designer-instructional-designs-onsite" target="_blank">Graphic Designer </a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/us-recruiter-professional-executive-hirings-exp" target="_blank">US Professional Recruiter</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/us-recruiter-incentives-0" target="_blank">US Admin Recruiter</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/technical-recruiter-us-tech-role-hirings-exp" target="_blank">US Technical Recruiter</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/us-light-industrial-recruiter-4096" target="_blank">US Light Industrial Recruiter</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/customer-service-specialist-life-insurance-local-account-urgent-hiring-start-asap-0" target="_blank">Customer Service Representative (Insurance)</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/trainer-quality-analyst-insurance-account" target="_blank">Training Specialist/Quality Analyst </a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/email-marketing-assistant-onsite-ortigas-pasig" target="_blank">Email Marketing Assistant</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/senior-net-developer-remote-set" target="_blank">Senior .Net Developer | Remote Set Up</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-system-architect-0" target="_blank">Senior System Architect | Remote Set Up</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/azure-site-reliability-engineer-hybrid-bgc" target="_blank">Azure Site Reliability Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-devops-engineer-apac-hybrid" target="_blank">Senior Devops Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/service-delivery-technical-consultant-fintech" target="_blank">Service Delivery Technical Consultant</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-devops-engineer-ansible-and-terraform" target="_blank">Senior Devops Engineer (Ansible and Terraform)</a></li>
                </ul>
              </div>
            </Tab>

            <Tab eventKey="IND" title="IND" type="submit">
              {/* <Tab eventKey="ERP India" title="ERP India" type="submit"> */}
              <div className="card-body evbuddy">
                <br />
                <h4 align="center" className="refer-h4">
                  <strong>Refer a friend and earn as much as 25K INR!</strong>
                </h4>
                {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                <br />
                <ul>
                  <li><a href="https://careers.eastvantage.com/jobs/performance-test-engineer-bangalore" target="_blank">Performance Test Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/qa-engineer-bangalore" target="_blank">QA Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-powerbi-analyst" target="_blank">Senior Power BI Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/react-js-developer" target="_blank">React JS Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/automation-tester" target="_blank">Automation Tester</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-engineer-etl" target="_blank">Data Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/fpa-analyst" target="_blank">FP & A Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/admissions-officer" target="_blank">Admissions Officer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/compliance-director-bangalore" target="_blank">Compliance Director</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-recruiter-0" target="_blank">Senior Recruiter</a></li>
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
    );
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.user,
    // holiday : state.dashboard
    departmentAnnouncement: state.departmentAnnouncement,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDashboardAnnouncementList: () =>
      dispatch(fetchDashboardAnnouncementList()),
    fetchDashboardAnnouncementList: (data) =>
      dispatch(fetchDashboardAnnouncementList(data)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(JobOpenings);
