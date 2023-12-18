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
import { fetchJobOpenings } from '../../../store/actions/admin/jobOpeningActions.js';
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
  componentWillMount() {
    this.props.fetchJobOpenings();
  }
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData);
  };
  render() {
    const careers = this.props.careerList;
    const careers_phl = careers !== undefined ? careers.PHL : '';
    const careers_ind = careers !== undefined ? careers.IND : '';

    return (
      <>
        <div className="jobs-tab">
          <Tabs defaultActiveKey="PHL" id="uncontrolled-tab-example">
            <Tab eventKey="PHL" title="PHL" type="submit">
              {/* <Tab eventKey="ERP" title="ERP" type="submit"> */}
              <div className="card-body evbuddy">
                <br />

                {careers_phl !== '' ?
                  <h4 align="center" className="refer-h4">
                    <strong>Refer a friend and earn as much as 30K PHP!</strong>
                  </h4>
                : '' }
                {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                <br />
                <ul>
                  {careers_phl !== '' ?
                    careers_phl.map((career, key) => {
                      return (
                        <li key={key}><a href={career.link} target="_blank">{career.title}</a></li>
                      )
                    })
                  : '' }
                </ul>
              </div>
            </Tab>

            <Tab eventKey="IND" title="IND" type="submit">
              {/* <Tab eventKey="ERP India" title="ERP India" type="submit"> */}
              <div className="card-body evbuddy">
                <br />
                {careers_ind !== '' ?
                  <h4 align="center" className="refer-h4">
                    <strong>Refer a friend and earn as much as 25K INR!</strong>
                  </h4>
                : '' }
                {/* <div align="center">Go to <a href="https://careers.eastvantage.com/evbuddy">https://careers.eastvantage.com/evbuddy</a></div> */}
                <br />
                <ul>
                  {careers_ind !== '' ?
                    careers_ind.map((career, key) => {
                      return (
                        <li key={key}><a href={career.link} target="_blank">{career.title}</a></li>
                      )
                    })
                  : '' }
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
    departmentAnnouncement: state.departmentAnnouncement,
    careerList: state.careerList.careerlist,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDashboardAnnouncementList: () =>
      dispatch(fetchDashboardAnnouncementList()),
    fetchDashboardAnnouncementList: (data) =>
      dispatch(fetchDashboardAnnouncementList(data)),
    fetchJobOpenings : () =>
      dispatch(fetchJobOpenings()),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(JobOpenings);
