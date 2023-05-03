import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardTabs.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncementList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import Figure from 'react-bootstrap/Figure';
import DashboardAnnouncementsList from "../../../components/Dashboard/DashboardAnnouncementsList";
import JobOpenings from "../../../components/Dashboard/JobOpenings";

import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import ShowMore from 'react-show-more-list';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card,Tabs,Tab,Badge  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
import ChangeLogs from "../../../components/Dashboard/ChangeLogs";
import SummaryDashbord from "../../Summary/SummaryDashbord";
import Authenticator from "../../../services/Authenticator";
class DashboardTabs extends Component {

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
          <Tabs
            defaultActiveKey= {Authenticator.check(
              ["supervisor", "team_leader"],
              ["supervisor_access", "team_leader_access"]
            ) ? "evox-summary" : "all-announcements"}
            id="fill-tab-example"
            className="mb-3 col-9 announcement-tabs"
            fill
            // onSelect= { this.handleSelect
            // }
          >
            {Authenticator.check(
                    ["supervisor", "team_leader"],
                    ["supervisor_access", "team_leader_access"]
                  ) && (
              <Tab eventKey="evox-summary" title="Summary" tabClassName="newfeature4">
                <SummaryDashbord></SummaryDashbord>
              </Tab>
                  )}
              <Tab eventKey="all-announcements" title="All Announcements" tabClassName="newfeature1">
                <DashboardAnnouncementsList></DashboardAnnouncementsList>
              </Tab>
              <Tab eventKey="job-openings" title="Job Opening" tabClassName="newfeature2">
                <JobOpenings></JobOpenings>
              </Tab>
              <Tab eventKey="evox-updates" title="Evox Updates" tabClassName="newfeature3">
                <ChangeLogs></ChangeLogs>
              </Tab>
              
              {/* <Tab eventKey="contact" title="Contact" disabled>
                
              </Tab> */}
          </Tabs>


          
      
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
export default connect(mapStateToProps, mapDispatchToProps)(DashboardTabs);








