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
          <iframe src="https://client.taptalent.io/career/eastvantage?showOnlyJobs=true " style={{ width:"100%", height:"1200px", border:"none" }}></iframe>
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
