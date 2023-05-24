import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardTabs.css";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
} from "../../GridComponent/AdminLte.js";
import { fetchDashboardAnnouncementList } from "../../../store/actions/announcement/departmentAnnouncementActions";
import Figure from "react-bootstrap/Figure";
import DashboardAnnouncementsList from "../../../components/Dashboard/DashboardAnnouncementsList";
import JobOpenings from "../../../components/Dashboard/JobOpenings";

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
import ChangeLogs from "../../../components/Dashboard/ChangeLogs";
import SummaryDashbord from "../../Summary/SummaryDashbord";
import Authenticator from "../../../services/Authenticator";
import Engagement from "../Engagement/Engagement";
class DashboardTabs extends Component {
  constructor(props, context) {
    super(props, context);

    this.handleSelect = this.handleSelect.bind(this);
    this.onTabSelect = this.onTabSelect.bind(this);
    this.defaultTab = this.defaultTab.bind(this);

    this.state = {
      key: "all-announcements",
      summary_shown: false,
      announcement_shown: false,
      engagement_shown: false,
      jobs_shown: false,
      updates_shown: false
    };
  }

  componentWillMount() {}

  componentDidMount(){
    if (Authenticator.check(
      ["supervisor", "team_leader"],
      ["supervisor_access", "team_leader_access"]
    )) {
      this.setState({
      summary_shown: true
    });
    } else {
      this.setState({
        announcement_shown: true
      });
    }
  }
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData);
  };
  defaultTab = () => {
    if (Authenticator.check(
      ["supervisor", "team_leader"],
      ["supervisor_access", "team_leader_access"]
    )) {
      return "evox-summary";
    } else {
      
      return "all-announcements";
    }
  };
  onTabSelect = (eventKey) => {
    this.setState({
      summary_shown: eventKey == 'evox-summary',
      announcement_shown: eventKey == 'all-announcements',
      engagement_shown: eventKey == 'engagement',
      jobs_shown: eventKey == 'job-openings',
      updates_shown: eventKey == 'evox-updates'
    });
  }
  render() {
    return (
      <>
        <Tabs
          defaultActiveKey={
            this.defaultTab()
          }
          id="fill-tab-example"
          className="mb-3 col-9 announcement-tabs"
          fill
           onSelect= { this.onTabSelect }
        >
          {Authenticator.check(
            ["supervisor", "team_leader"],
            ["supervisor_access", "team_leader_access"]
          ) && (
            <Tab
              eventKey="evox-summary"
              title="Summary"
              tabClassName="newfeature4"
            >
              {this.state.summary_shown && (<SummaryDashbord />)}
            </Tab>
          )}
          {Authenticator.check(
            ["supervisor", "team_leader"],
            ["supervisor_access", "team_leader_access"]
          ) && (
            <Tab
              eventKey="engagement"
              title="Engagements"
              tabClassName="newfeature6"
            >
              {this.state.engagement_shown && (<Engagement />)}
            </Tab>
          )}
          <Tab
            eventKey="all-announcements"
            title="Announcements"
            tabClassName="newfeature1"
          >
            {this.state.announcement_shown && (<DashboardAnnouncementsList />)}
          </Tab>
          <Tab
            eventKey="job-openings"
            title="Job Opening"
            tabClassName="newfeature2"
          >
            {this.state.jobs_shown && (<JobOpenings />)}
          </Tab>
          <Tab
            eventKey="evox-updates"
            title="EVOX Updates"
            tabClassName="newfeature3"
          >
            {this.state.updates_shown && (<ChangeLogs />)}
          </Tab>

          {/* <Tab eventKey="contact" title="Contact" disabled>
                
              </Tab> */}
        </Tabs>
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
export default connect(mapStateToProps, mapDispatchToProps)(DashboardTabs);
