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
                  <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-0" target="_blank">Full Stack Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/technical-recruiter-3" target="_blank">Senior Technical Recruiter</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/network-and-security-engineer-1" target="_blank">Network and Security Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/sr-rpa-developer-uipath" target="_blank">Senior RPA Ui Path Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/it-sales-manager-banking-domain" target="_blank">IT Sales Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-bi-engineer-ssrs" target="_blank">Senior BI Engineer (SSRS)</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-business-analyst-night-shift-bgc" target="_blank">Senior Business Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/bi-engineer-powerbi" target="_blank">Power BI Engineer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/service-desk-analyst-0" target="_blank">Service Desk Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/reactjs-developer" target="_blank">ReactJS Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/scrum-master-site-nightshift" target="_blank">Scrum Master</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/system-analyst-erp-configuration" target="_blank">System Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/quality-assurance-engineer-nightshift-onsite" target="_blank">QA Engineer </a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/python-developer-onsite-bgc-taguig" target="_blank">Python Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-engineer-onsite-bgc" target="_blank">Data Engineer (ETL)</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/operations-business-partner" target="_blank">Operations Business Partner</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/business-development-executive" target="_blank">Business Development Executive</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/us-talent-acquisiton-specialist-must-have-experience-hiring-white-collar-jobs-onsite-ortigas" target="_blank">US Talent Acquisiton Specialist</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/learning-and-development-specialist-onsite-bgc-taguig" target="_blank">Learning and Development Specialist | Hybrid | BGC, Taguig</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-business-analyst-night-shift-ortigas" target="_blank">Senior Business Analyst | Night Shift | Ortigas</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/sr-talent-acquition-specialist-onsite-bgc-weekends-hmo-day-1" target="_blank">Sr. Talent Acquisition Specialist</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/business-analyst-0" target="_blank">Business Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/business-analyst-onsite-bgc-taguig-philippines" target="_blank">Business Analyst | Onsite | BGC Taguig, Philippines</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/bookkeeper-ortigas-site-night-shift" target="_blank">Bookkeeper | Ortigas On-site | Night Shift</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-technical-recruiter-hybrid-setup" target="_blank">Senior Technical Recruiter | Hybrid Setup</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/financial-analyst-wfh-nightshift" target="_blank">Financial Analyst | WFH | Nighshift</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/finance-operations-manager-bgc-taguig-ortigas" target="_blank">Finance Operations Manager | BGC, Taguig / Ortigas</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/global-recruitment-head" target="_blank">Global Recruitment Head</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-analyst-dayshift-hybrid-50k-120k" target="_blank">Data Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/urgent-hiring-operations-admin-and-logistic-coordinator-dayshift-earn-25k" target="_blank">Operations Admin and Logistics Coordinator</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/hiring-us-recruitment-manager-us-staffing-onsite-ortigas-pasig" target="_blank">US Recruitment Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/urgent-hiring-operations-supervisor-site-bgc-taguig" target="_blank">Urgent Hiring| Operations Supervisor| On Site| BGC, Taguig</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/healthcare-insurance-representative-local-account-80-nonvoice-25k-34k-day-1-hmo" target="_blank">Healthcare Insurance Representative | Local Account </a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/home-wise-coordinator-ortigas-pasig-night-shift" target="_blank">Senior .NET Developer | WFH Setup</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-software-developer-net-remote-work" target="_blank">Senior Software Developer | .NET | Remote Work</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/home-wise-coordinator-ortigas-pasig-night-shift" target="_blank">Home Wise Coordinator | Ortigas, Pasig (Night Shift)</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/executive-assistant-hybrid-set-ortigas-pasig" target="_blank">Executive Assistant | Hybrid Set-Up (Ortigas, Pasig)</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-us-blended-account" target="_blank">Customer Service Representative (US Blended Account)</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/service-delivery-technical-consultant-bgc-hybrid" target="_blank">Service Delivery Technical Consultant | BGC | Hybrid</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-energy-campaign" target="_blank">Customer Service Representative | Energy Campaign</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/customer-service-representative-bilingual-english-and-spanish" target="_blank">Customer Service Representative | Bilingual - English and Spanish</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/lead-generation-specialist" target="_blank">Lead Generation Specialist</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/lead-generation-specialist-bilingual-english-and-spanish" target="_blank">Lead Generation Specialist | Bilingual - English and Spanish</a></li>
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
                  <li><a href="https://careers.eastvantage.com/jobs/odoo-developer-bangalore-india" target="_blank">Odoo Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/it-project-manager-1" target="_blank">Project Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-c-net" target="_blank">.Net Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/compliance-manager-bangalore" target="_blank">Compliance Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-analyst-bangalore-0" target="_blank">Data Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-it-specialist" target="_blank">Senior IT Specialist</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/global-recruitment-head-0" target="_blank">Global Recruitment Head</a></li>

                  <li><a href="https://careers.eastvantage.com/jobs/power-bi-analyst" target="_blank">Power BI Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/accountant" target="_blank">Accountant</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/it-project-manager-1" target="_blank">Project Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/business-analyst-1" target="_blank">Business Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/business-partner-0" target="_blank">Business Partner</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/netsuite-adminstrator-developer" target="_blank">Netsuite Consultant</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/full-stack-developer-bengaluru" target="_blank">Full Stack Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/it-project-manager-1" target="_blank">Project Manager</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/senior-it-technician" target="_blank">Senior IT Technician</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/systems-engineer-public-cloud" target="_blank">System Engineer - Public Cloud</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-scientist" target="_blank">Data Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/react-js-developer-1" target="_blank">React JS Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/system-analyst-3" target="_blank">System Analyst</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/python-developer-bangalore-india-2" target="_blank">Python Developer</a></li>
                  <li><a href="https://careers.eastvantage.com/jobs/data-engineer-etl" target="_blank">ETL Developer/ Data Engineer</a></li>
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
