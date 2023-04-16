import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardTabs.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncementList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import Figure from 'react-bootstrap/Figure';
import DashboardAnnouncementsList from "../../../components/Dashboard/DashboardAnnouncementsList";

import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import ShowMore from 'react-show-more-list';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card,Tabs,Tab,Badge  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
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
            defaultActiveKey="all-announcements"
            id="fill-tab-example"
            className="mb-3 col-9 announcement-tabs"
            fill
            // onSelect= { this.handleSelect
            // }
          >
              <Tab eventKey="all-announcements" title="All Announcements">
                <DashboardAnnouncementsList></DashboardAnnouncementsList>
              </Tab>
              <Tab eventKey="job-openings" title="Job Opening">
                
              </Tab>
              <Tab eventKey="evox-updates" title="Evox Updates">
                
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








