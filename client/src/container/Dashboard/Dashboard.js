import React, { Component } from "react";
import { useDispatch } from "react-redux";
import "./Dashboard.css";
import {
  Container,
  Row,
  Col,
  Table,
  Image,
  Spinner,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { getNhoSurvey, addNhoSurvey } from "../../store/actions/userActions";
import { getUserAsset, addUserAsset } from '../../store/actions/userActions' ;
import { Formik, ErrorMessage,getIn  } from 'formik';
import { InputDate,InputTime } from '../../components/DatePickerComponent/DatePicker.js';
import * as Yup from 'yup';
import RequestSubtitle from "../../components/RequestComponent/RequestButtons/RequestSubtitle";
import RequestButtons from "../../components/RequestComponent/RequestButtons/RequestButtons";

import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
} from "../../components/GridComponent/AdminLte.js";
import Wrapper from "../../components/Template/Wrapper";
import ReactPlayer from "react-player/lazy";
import * as yup from "yup";
import EmployeeDashboard from "../../components/Dashboard/EmployeeDashboard";
import Authenticator from "../../services/Authenticator";
import HandlerDashboard from "../../components/Dashboard/HandlerDashboard";
import Joyride, { ACTIONS, EVENTS, STATUS, CLOSE } from "react-joyride";
import SummaryDashbord from "../../components/Summary/SummaryDashbord";
import dayjs from "dayjs";
import { format, getDate } from "date-fns";
import moment from "moment";
import {
  getcurrentdate
} from "../../services/Helper";
import { useEffect } from "react";
import { ThemeConsumer } from "styled-components";
class Dashboard extends Component {
  constructor(props) {
    super(props);
  }

  state = {
    run: false,
    steps: (Authenticator.scanLevel(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]))
      ? [
          {
            target: ".newfeatureq",
            content: "Clock IN And Clock Out",
          },
          {
            target: ".newfeature",
            content: "To Clock In or Out, Click here.",
          },
          {
            target: ".time-info",
            content:
              "See the Most Recent DRT and DTR Notification, Click here.",
          },
          {
            target: ".newfeature5",
            content: "To view your Profile and Logout, Click here.",
          },
          {
            target: ".newfeature4",
            content:
              "View the Summary for Pending Requests, and Today's and Tomorrow's Leaves for Users Under the Supervisor",
          },
          {
            target: ".newfeature6",
            content:
              "View the Engagement for Celebrations for Users Under the Supervisor",
          },
          {
            target: ".newfeature1",
            content: "To View the Announcement List",
          },
          // {
          //   target: ".newfeature_announcements",
          //   content: "Click This Menu to Create The New Announcement",
          // },
          {
            target: ".newfeature2",
            content: "View the List of Jobs Available",
          },
          {
            target: ".newfeature3",
            content: "See the Most Recent EVOX Update",
          },
        ]
      : [
          {
            target: ".newfeatureq",
            content: "Clock IN And Clock Out",
          },
          {
            target: ".newfeature",
            content: "To Clock In or Out, Click here.",
          },
          {
            target: ".time-info",
            content:
              "See the Most Recent DRT and DTR Notification, Click here.",
          },
          {
            target: ".newfeature5",
            content: "To view your Profile and Logout, Click here.",
          },
          {
            target: ".newfeature1",
            content: "To View the Announcement List",
          },
          // {
          //   target: ".newfeature_announcements",
          //   content: "Click This Menu to Create The New Announcement",
          // },
          {
            target: ".newfeature2",
            content: "View the List of Jobs Available",
          },
          {
            target: ".newfeature3",
            content: "See the Most Recent EVOX Update",
          },
        ],
    stepIndex: 0,
    spotlightClicks: false,
    nho_date: '',
    onboarding_exp_rating: '',
    recruitment_exp_rating: '',
    schedule_awareness_rating: '',
    topic_relevance_rating: '',
    facilitator_id: '',
    facilitator_knowledge_rating: '',
    facilitator_presentation_rating: '',
    facilitator_response_rating: '',
    equipment_rating: '',
    accessibility_rating: '',
    welcome_rating: '',
    suggestions: '',
    nho_overall_feedback: '',
    personal_equipment: '',
    equipment_type: '',
    serial_no: '',
    asset_tag: '',
    add_equipment_type: '',
    showModal: false,
    allowModalClose: true,
    showItamModal: false,
  };

  componentDidMount() {
    // check if user has nho survey record
    if (!this.props.user.is_nho_loaded) {
      this.props.getNhoSurvey();
    }

    // check if user hire date is valid for NHO survey
    const start_date = new Date(this.props.user.date_hired);
    const end_date = new Date(this.props.user.date_hired);
    end_date.setDate(end_date.getDate() + 14);
    const today = new Date();
    const nho_survey_valid = (today >= start_date && today <= end_date);

    // if hire date is still within the user's first two weeks and has no NHO survey yet, then show survey modal
    if (nho_survey_valid && (this.props.user.user_nho_survey && Object.keys(this.props.user.user_nho_survey).length <= 0)) {
      this.setState({ showModal : true });
    }

    // don't allow closing of modal if the user is already on the 2nd week
    const new_start_date = new Date(this.props.user.date_hired);
    new_start_date.setDate(new_start_date.getDate() + 7);
    if (today >= new_start_date && today <= end_date) {
      this.setState({ allowModalClose: false });
    }

    if (!this.props.user.is_asset_loaded) {
      this.props.getUserAsset();
    }

    // check if user hire date is valid for ITAM modal
    const itam_date = new Date(this.props.user.date_hired);
    itam_date.setDate(itam_date.getDate() + 15);
    const itam_today = new Date();
    const itam_valid = (itam_today >= itam_date);

    // if current date is over the user's first 15 days and has no recorded asset yet, then show itam modal
    if (itam_valid && (this.props.user.user_assets && Object.keys(this.props.user.user_assets).length <= 0)) {
      this.setState({ showItamModal : true });
    }
    // alert(this.props.dashboard?.worktour);
    // const user = localStorage.getItem('user');
    // const userid = user ? JSON.parse(user) : null;
    // alert(userid);
    //   if(userid !== this.props.user?.id || userid === null){
    //     this.setState({ run: this.props.dashboard?.worktour });
    //   }

    // var exdate = Date.parse("2023-05-31");
    // var expiredate = format(exdate, "yyyy-MM-dd");
    // const current = new Date();
    // const date = current.getFullYear() + '-' + (current.getMonth() + 1) + '-' + current.getDate();
    // var cudate = Date.parse(date);
    // var currentdate = format(cudate, "yyyy-MM-dd");
    // if (expiredate >= currentdate) this.setState({ run: this.props.dashboard?.worktour });
  }

  handleChange = (e) => {
    this.setState({
      [e.target.name]: e.target.value
    });
  }

  onSubmitHandler = (values) => {
    var formData = new FormData();
    for (var key in values) {
      if( values[key] != null ) {
        switch( key ) {
          case "nho_date":
            formData.append(key, moment( values[key] ).format("YYYY-MM-DD") );
            break;
          default:
            formData.set(key, values[key]);
            break;
        }
      }
    }

    this.setState({ allowModalClose: true });
    if (values.action == "itam") {
      this.props.addUserAsset(formData);
    } else {
      this.props.addNhoSurvey(formData);
    }
  }

  onHide = () => {
    this.setState({ showModal: false });
    this.setState({ showItamModal: false });
  }

  handleJoyrideCallback = (data) => {
    const { dispatch } = this.props;
    const { action, index, status, type } = data;
    this.setState({ stepIndex: index });
    if (index === 9) {
      this.setState({ run: false });
    }
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Need to set our running state to false, so we can restart if we click start again.
      this.setState({ run: false });
      dispatch({
        type: "WORK_TOUR",
        worktour: false,
      });
      // if(status === "finished"){
      //   localStorage.setItem('user', JSON.stringify(this.props.user?.id));
      // }
    }
    if ([ACTIONS.CLOSE].includes(action)) {
      this.setState({ run: false });
      dispatch({
        type: "WORK_TOUR",
        worktour: false,
      });
    }

    // if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
    //   // Update state to advance the tour
    //   this.setState({ stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) });

    // } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
    //   // Need to set our running state to false, so we can restart if we click start again.
    //   this.setState({ run: false });
    // }
  };

  render() {
    const { run, steps, stepIndex } = this.state;
    const { user } = this.props;
    const initialValue = {
      nho_date: moment(user.date_hired).format("MMMM D, YYYY"),
      onboarding_exp_rating: null,
      recruitment_exp_rating: null,
      schedule_awareness_rating: null,
      topic_relevance_rating: null,
      facilitator_id: null,
      facilitator_knowledge_rating: null,
      facilitator_presentation_rating: null,
      facilitator_response_rating: null,
      equipment_rating: null,
      accessibility_rating: null,
      welcome_rating: null,
      suggestions: null,
      nho_overall_feedback: null,
      personal_equipment: null,
      equipment_type: null,
      serial_no: null,
      asset_tag: null,
      add_equipment_type: null,
    };
    const hr_list = this.props.settings.hr_list;

    return (
      <Wrapper {...this.props}>
        <Joyride
          callback={this.handleJoyrideCallback}
          run={run}
          steps={steps}
          continuous={true}
          hideBackButton={stepIndex === 1 ? true : false}
          locale={{
            skip: "Skip",
            last: "Close",
          }}
          showSkipButton={true}
          disableScrolling={true}
          styles={{
            options: {
              arrowColor: "#fff",
              backgroundColor: "#fff",
              primaryColor: "#0097A7",
              textColor: "#000",
              width: 400,
              zIndex: 1000,
            },
          }}
          disableBeacon={true}
        />
        <ContainerWrapper>
          <ContainerBody>
            {true ? (
              <EmployeeDashboard {...this.props} />
            ) : null}
            {/* { Authenticator.check(['supervisor', 'team_leader', 'client'], ['supervisor_access', 'team_leader_access', 'client_access']) ? 
                          <HandlerDashboard {...this.props} />
                          :
                          null
                        } */}

            <Modal className="remark-modal" show={this.state.showModal} onHide={this.state.allowModalClose ? this.onHide : null} size="xl">
              <Modal.Header id="nho-modal-header" closeButton>
                <Modal.Title id="nho-modal-title">We Love To Hear Your Onboarding Experience</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Formik
                  enableReinitialize
                  onSubmit={this.onSubmitHandler}
                  validationSchema={validationSchemaNHO}
                  initialValues={initialValue}
                  >
                  {({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                    <form onSubmit={handleSubmit}>
                      <input type="hidden" name="modal_mode" value="itam" />
                      <ContainerWrapper>
                        <ContainerBody>
                          <Content col="12" subtitle={<RequestSubtitle method={"store"} user={user} />}>
                            <Row>  
                              <Col size="12"> 
                                <div className="form-group survey-description">
                                  <p>Your feedback is important to us and these will help improve our New Hire Orientation experience for new hire associates. Rating is 1 to 5 where 5 is the highest.</p>
                                  <p>5 - Highly Satisfied<br/>4 - Satisfied<br/>3 - Neutral<br/>2 - Dissatisfied<br/>1 - Highly Dissatisfied<br/></p>
                                  <p className="survey-note">Note: All information is required so please ensure that all fields are completed.</p>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12"> 
                                <div className="form-group">
                                  <label className="nho-required survey-label">1. When did you have your New Hire Orientation? (Date of NHO)</label>
                                  {/* <InputDate name="nho_date" value={values.nho_date} /> */}
                                  <input type="text" name="nho_date" className="form-control" value={values.nho_date} disabled />
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">2. How would you rate your Over-all Week-1 Employee Onboarding Experience with Eastvantage?</label><br/>
                                  <input name="onboarding_exp_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">1&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">2&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">3&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">4&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="onboarding_exp_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">3. How would you rate your Over-all Experience with the Recruitment process?</label><br/>
                                  <input name="recruitment_exp_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">1&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">2&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">3&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">4&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="recruitment_exp_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">4. I am aware of the New Hire Orientation Schedule.</label><br/>
                                  <input name="schedule_awareness_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">1&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">2&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">3&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">4&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="schedule_awareness_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">5. The topics covered during New Hire Orientation are relevant as a new hire.</label><br/>
                                  <input name="topic_relevance_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="topic_relevance_rating">1&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="topic_relevance_rating">2&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="topic_relevance_rating">3&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="topic_relevance_rating">4&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="topic_relevance_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="topic_relevance_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="4">
                                <div className="form-group">
                                  <label className="nho-required survey-label">6. Choose your Facilitator</label>
                                  <select className="form-control" name="facilitator_id" onChange={handleChange} style={{ display: 'block' }}>
                                      <option value={values.facilitator_id}>-Select Facilitator-</option>
                                      {hr_list && hr_list.length > 0 &&
                                        hr_list.map((hr, pos) => (
                                          <option value={hr.id}>{hr.empname}</option>
                                      ))}
                                  </select>
                                  {/* <select className="form-control" name="facilitator_id" onChange={handleChange} style={{ display: 'block' }}>
                                      <option value={values.facilitator_id}>-Select Facilitator-</option>
                                      <option value="4713">Vennize Perol</option>
                                      <option value="4698">Marjorie Villegas</option>
                                      <option value="3310">Toiba Qureshi</option>
                                      <option value="4661">Antoeneta Antonova</option>
                                  </select> */}
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="facilitator_id" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">7. The facilitator/s were highly knowledgeable about the topics.</label><br/>
                                  <input name="facilitator_knowledge_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">1&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">2&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">3&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">4&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="facilitator_knowledge_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">8. The facilitator/s were able to present in a clear and understandable manner.</label><br/>
                                  <input name="facilitator_presentation_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">1&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">2&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">3&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">4&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="facilitator_presentation_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">9. The facilitator/s were able to answer my questions.</label><br/>
                                  <input name="facilitator_response_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="facilitator_response_rating">1&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="facilitator_response_rating">2&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="facilitator_response_rating">3&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="facilitator_response_rating">4&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="facilitator_response_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="facilitator_response_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">10. My EV equipment is working properly.</label><br/>
                                  <input name="equipment_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="equipment_rating">1&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="equipment_rating">2&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="equipment_rating">3&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="equipment_rating">4&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="equipment_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="equipment_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">11. I was able to login to my webmail, EVOX and BHR during my Day 1.</label><br/>
                                  <input name="accessibility_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="accessibility_rating">1&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="accessibility_rating">2&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="accessibility_rating">3&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="accessibility_rating">4&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="accessibility_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="accessibility_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">12. I am welcomed by Eastvantage on my first day.</label><br/>
                                  <input name="welcome_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="welcome_rating">1&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="welcome_rating">2&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="welcome_rating">3&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="welcome_rating">4&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="welcome_rating">5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="welcome_rating" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">13. What suggestions/recommendations do you have to improve our EV New Hire Orientation.</label>
                                  <textarea className="form-control" rows="3" name="suggestions" onChange={handleChange} value={values.suggestions}></textarea>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="suggestions" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">14. Let us know your Over-all New Hire Orientation Feedback.</label>
                                  <textarea className="form-control" rows="3" name="nho_overall_feedback" onChange={handleChange} value={values.nho_overall_feedback}></textarea>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="nho_overall_feedback" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row>
                            <Row>
                              <Col size="12">
                                <br/>
                                <RequestButtons method="store" {...this} noBackBtn={true} />
                              </Col>
                            </Row>
                          </Content>
                        </ContainerBody>
                      </ContainerWrapper>
                    </form>
                  )}
                </Formik>
              </Modal.Body>
              {/* <Modal.Footer></Modal.Footer> */}
            </Modal>

            <Modal className="remark-modal" show={this.state.showItamModal} size="xl">
              <Modal.Header id="nho-modal-header" closeButton>
                <Modal.Title id="nho-modal-title">IT Asset Management</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Formik
                  enableReinitialize
                  onSubmit={this.onSubmitHandler}
                  validationSchema={validationSchemaITAM}
                  initialValues={initialValue}
                  >
                  {({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                    <form onSubmit={handleSubmit}>
                      <input type="hidden" name="modal_mode" value="itam" />
                      <ContainerWrapper>
                        <ContainerBody>
                          <Content col="12" subtitle={<RequestSubtitle method={"store"} />}>
                            <Row>
                              <Col size="4">
                                <div className="form-group">
                                  <label>Employee Name</label>
                                  <input type="text" className="form-control" name="employee_name" value={this.props.user.first_name + " " + this.props.user.last_name} disabled />
                                </div>
                              </Col>
                              <Col size="4">
                                <div className="form-group">
                                  <label>Employee Number</label>
                                  <input type="text" className="form-control" name="emp_num" value={this.props.user.emp_num} disabled />
                                </div>
                              </Col>
                              <Col size="4">
                                <div className="form-group">
                                  <label>Email</label>
                                  <input type="text" className="form-control" name="email" value={this.props.user.email} disabled />
                                </div>
                              </Col>
                            </Row><br/>

                            <Row>
                              <Col size="6">
                                <div className="form-group">
                                  <label className="itam-required">Personal Equipment</label>
                                  <select name="personal_equipment" className="form-control" value={values.personal_equipment} onChange={handleChange}>
                                    <option value=""></option>
                                    <option value="1">Yes</option>
                                    <option value="2">No</option>
                                  </select>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="personal_equipment" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                              <Col size="6">
                                <div className="form-group">
                                  <label className="itam-required">Equipment Type</label>
                                  <select name="equipment_type" className="form-control" value={values.equipment_type} onChange={(e) => {setFieldValue(e.target.name, e.target.value); (e.target.value == "Others") ? this.setState({'showAddEquipment': true}) : this.setState({'showAddEquipment': false}); }}>
                                    <option value=""></option>
                                    <option value="Desktop">Desktop</option>
                                    <option value="Laptop">Laptop</option>
                                    <option value="Keyboard">Keyboard</option>
                                    <option value="Mouse">Mouse</option>
                                    <option value="Monitor">Monitor</option>
                                    <option value="Headset">Headset</option>
                                    <option value="Webcam">Webcam</option>
                                    <option value="Wifi Modem">Wifi Modem</option>
                                    <option value="Others">Others</option>
                                  </select>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="equipment_type" className="input-feedback" />
                                  </Form.Control.Feedback><br/>
                                  {this.state.showAddEquipment &&
                                    <div>
                                      <input name="add_equipment_type" type="text" className="form-control" onChange={handleChange} value={values.add_equipment_type} />
                                      <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name="add_equipment_type" className="input-feedback" />
                                      </Form.Control.Feedback><br/>
                                    </div>
                                  }
                                </div>
                              </Col>
                            </Row>
                            <Row>
                              <Col size="6">
                                <div className="form-group">
                                  <label className="itam-required">Serial No</label>
                                  <input name="serial_no" type="text" className="form-control" onChange={handleChange} value={values.serial_no} placeholder='Please indicate "N/A" if not applicable' />
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="serial_no" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                              <Col size="6">
                                <div className="form-group">
                                  <label className="itam-required">Asset Tag</label>
                                  <input name="asset_tag" type="text" className="form-control" onChange={handleChange} value={values.asset_tag} placeholder='Please indicate "N/A" if not applicable' />
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="asset_tag" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            {/* <RequestButtons method={method} {...this} /><br/><br/> */}
                            <span>
                              <Button type="button" className="back-button btn btn-secondary" onClick={() => this.props.history.goBack() } ><i className="fa fa-arrow-circle-left" /> Back</Button>&nbsp;
                              <div style={{'float': 'right'}}>
                                <Button type="submit" className="btn btn-primary-2" onClick={(e)=>{ setFieldValue('action', 'itam');  handleSubmit(e); }}><i className="fa  is-green fa-location-arrow" /> Add</Button>
                              </div>
                            </span>
                          </Content>
                        </ContainerBody>
                      </ContainerWrapper>
                    </form>
                  )}
                </Formik>
              </Modal.Body>
              {/* <Modal.Footer></Modal.Footer> */}
            </Modal>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    );
  }
}

const validationSchemaNHO = Yup.object().shape({
    // nho_date:                         Yup.string().required("This field is required").nullable(),
    suggestions:                      Yup.string().required("This field is required").nullable(),
    nho_overall_feedback:             Yup.string().required("This field is required").nullable(),
    onboarding_exp_rating:            Yup.string().required("This field is required").nullable(),
    recruitment_exp_rating:           Yup.string().required("This field is required").nullable(),
    schedule_awareness_rating:        Yup.string().required("This field is required").nullable(),
    topic_relevance_rating:           Yup.string().required("This field is required").nullable(),
    facilitator_knowledge_rating:     Yup.string().required("This field is required").nullable(),
    facilitator_presentation_rating:  Yup.string().required("This field is required").nullable(),
    facilitator_response_rating:      Yup.string().required("This field is required").nullable(),
    equipment_rating:                 Yup.string().required("This field is required").nullable(),
    accessibility_rating:             Yup.string().required("This field is required").nullable(),
    welcome_rating:                   Yup.string().required("This field is required").nullable(),
    facilitator_id:                   Yup.string().required("This field is required").nullable(),
});

const validationSchemaITAM = Yup.object().shape({
    personal_equipment:   Yup.string().required("This field is required").nullable(),
    equipment_type:       Yup.string().required("This field is required").nullable(),
    add_equipment_type:   Yup.string().nullable().when('equipment_type', {
                            is: 'Others',
                            then: Yup.string().required("This field is required").nullable()
                          }),
    serial_no:            Yup.string().required("This field is required").nullable(),
    asset_tag:            Yup.string().required("This field is required").nullable(),
});

const mapStateToProps = (state) => {
  return {
    user: state.user,
    dashboard: state.dashboard,
    settings: state.settings,
  };
};

const mapDispatchToProps = (dispatch) => {
    return {
      addNhoSurvey  : ( post_data ) => dispatch( addNhoSurvey( post_data ) ),
      getNhoSurvey  : () => dispatch( getNhoSurvey() ),
      addUserAsset  : ( post_data ) => dispatch( addUserAsset( post_data) ),
      getUserAsset  : () => dispatch( getUserAsset() ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
