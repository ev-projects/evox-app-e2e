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
import { getNhoSurvey, addNhoSurvey, addEvaSurvey, getEvaSurvey, getUserCoc, acknowledgeCOC, getEvaReg, submitEvaReg } from "../../store/actions/userActions";
import { getUserAssets, addUserAsset } from '../../store/actions/userActions' ;
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
    equipment_list: [],
    attended_via: '',
    job_performance_clarity: '',
    work_output_contribution: '',
    management_recognition: '',
    member_value: '',
    platform_link: '',
    program_flow: '',
    content_messages: '',
    information_usefulness: '',
    overall_satisfaction: '',
    opportunities: '',
    questions: '',
    showEvaModal: false,
    showCocModal: false,
    coc_mode: '',
    isCocChecked: false,
    showEvaRegModal: false,
  };

  componentDidMount() {
    // check if user is valid for NHO
    if (this.props.user.is_user_nho_valid === "0") {
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
    }

    if (!this.props.user.is_asset_loaded) {
      this.props.getUserAssets();
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

    // if user level id is in (DivisionHead, Client, Board), don't show itam popup modal
    if (["Client"].includes(this.props.user.lvl_name)) {
      this.setState({ showItamModal : false });
    }

    // check if user has eva survey
    // if (!this.props.user.is_eva_loaded) {
    //   this.props.getEvaSurvey();
    // }

    // if no eva survey yet, show eva modal
    if (this.props.user.user_eva && Object.keys(this.props.user.user_eva).length >= 1) {
      this.setState({ showEvaModal : true });
    }

    // fetch user code of conduct
    if (!this.props.user.is_coc_loaded) {
      this.props.getUserCoc();
    }
    if (this.props.settings?.coc_forms?.length >= 2) {
      if (this.props.user.user_coc && Object.keys(this.props.user.user_coc).length >= 1) {
        const user_coc = this.props.user.user_coc;
        if (user_coc.is_acknowledged === 1 && user_coc.is_completed === 0) {
          const acknowledged_date = new Date(user_coc.acknowledged_at);
          acknowledged_date.setDate(acknowledged_date.getDate() + 2);
          const coc_today = new Date();
          const coc_valid = (coc_today >= acknowledged_date);

          if (coc_valid) {
            this.setState({
              showCocModal: true,
              coc_mode: 2
            });
          }
        }
      } else if (this.props.user.user_coc === null) {
        // if no cod record yet, show coc form 1
        this.setState({
          showCocModal: true,
          coc_mode: 1
        });
      }
    }

    // check if user has eva registration
    if (!this.props.user.is_eva_reg_loaded) {
      this.props.getEvaReg();
    }

    // if user does not have eva registration yet, show eva reg modal
    if (this.props.user.user_eva_reg === null) {
      this.setState({ showEvaRegModal : true });
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
    if (values.action === "add_equipment") {
      const new_equipment = {
        personal_equipment: values.personal_equipment,
        equipment_type: values.equipment_type,
        serial_no: values.serial_no,
        asset_tag: values.asset_tag,
        add_equipment_type: values.add_equipment_type
      }
      this.setState({ equipment_list: [...this.state.equipment_list, new_equipment] });

      // clear input fields
      const personal_equipment_text = document.getElementById("personal_equipment");
      personal_equipment_text.value = "";
      const equipment_type_text = document.getElementById("equipment_type");
      equipment_type_text.value = "";
      const serial_no_text = document.getElementById("serial_no");
      serial_no_text.value = "";
      const asset_tag_text = document.getElementById("asset_tag");
      asset_tag_text.value = "";
      const add_equipment_type_text = document.getElementById("add_equipment_type");
      add_equipment_type_text.value = "";

    } else {
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
        if (window.confirm("Data Confirmation Statement\n\nI confirm that all data provided is true and correct. I understand that any discrepancies, whether intentional or due to negligence, may result in disciplinary action and that I will be held fully accountable.")) {
          this.props.addUserAsset(this.state.equipment_list);
        }
      } else if (values.action === "eva") {
        this.props.addEvaSurvey(formData);
      } else if (values.action === "coc") {
        this.props.acknowledgeCOC();
      } else {
        this.props.addNhoSurvey(formData);
      }
    }
  }

  onHide = () => {
    this.setState({ showModal: false });
    this.setState({ showItamModal: false });
    this.setState({ showEvaModal: false });
    this.setState({ showCocModal: false });
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

  openPopup = (url) => {
    // call api to save user id upon clicking the eva registration link
    this.props.submitEvaReg();

    // open window popup for the eva registration
    const popup = window.open(url, 'popupWindow', 'width=600,height=400');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert("Popup was blocked by the browser!");
      return false;
    } else {
      popup.focus();
      return true;
    }
  }

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
      personal_equipment: '',
      equipment_type: '',
      serial_no: '',
      asset_tag: '',
      add_equipment_type: '',
      attended_via: null,
      job_performance_clarity: null,
      work_output_contribution: null,
      management_recognition: null,
      member_value: null,
      platform_link: null,
      program_flow: null,
      content_messages: null,
      information_usefulness: null,
      overall_satisfaction: null,
      opportunities: null,
      questions: null,
    };
    const hr_list = this.props.settings.hr_list;
    const equipment_list = this.state.equipment_list;

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
                                  <input name="onboarding_exp_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">&nbsp;1&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">&nbsp;2&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">&nbsp;3&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">&nbsp;4&nbsp;</label>
                                  <input name="onboarding_exp_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="onboarding_exp_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="recruitment_exp_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">&nbsp;1&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">&nbsp;2&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">&nbsp;3&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">&nbsp;4&nbsp;</label>
                                  <input name="recruitment_exp_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="recruitment_exp_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="schedule_awareness_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">&nbsp;1&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">&nbsp;2&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">&nbsp;3&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">&nbsp;4&nbsp;</label>
                                  <input name="schedule_awareness_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="schedule_awareness_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="topic_relevance_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="topic_relevance_rating">&nbsp;1&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="topic_relevance_rating">&nbsp;2&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="topic_relevance_rating">&nbsp;3&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="topic_relevance_rating">&nbsp;4&nbsp;</label>
                                  <input name="topic_relevance_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="topic_relevance_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="facilitator_knowledge_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">&nbsp;1&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">&nbsp;2&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">&nbsp;3&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">&nbsp;4&nbsp;</label>
                                  <input name="facilitator_knowledge_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="facilitator_knowledge_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="facilitator_presentation_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">&nbsp;1&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">&nbsp;2&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">&nbsp;3&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">&nbsp;4&nbsp;</label>
                                  <input name="facilitator_presentation_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="facilitator_presentation_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="facilitator_response_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="facilitator_response_rating">&nbsp;1&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="facilitator_response_rating">&nbsp;2&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="facilitator_response_rating">&nbsp;3&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="facilitator_response_rating">&nbsp;4&nbsp;</label>
                                  <input name="facilitator_response_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="facilitator_response_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="equipment_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="equipment_rating">&nbsp;1&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="equipment_rating">&nbsp;2&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="equipment_rating">&nbsp;3&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="equipment_rating">&nbsp;4&nbsp;</label>
                                  <input name="equipment_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="equipment_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="accessibility_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="accessibility_rating">&nbsp;1&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="accessibility_rating">&nbsp;2&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="accessibility_rating">&nbsp;3&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="accessibility_rating">&nbsp;4&nbsp;</label>
                                  <input name="accessibility_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="accessibility_rating">&nbsp;5&nbsp;</label>
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
                                  <input name="welcome_rating" type="radio" value="1" onChange={handleChange}/><label htmlFor="welcome_rating">&nbsp;1&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="2" onChange={handleChange}/><label htmlFor="welcome_rating">&nbsp;2&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="3" onChange={handleChange}/><label htmlFor="welcome_rating">&nbsp;3&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="4" onChange={handleChange}/><label htmlFor="welcome_rating">&nbsp;4&nbsp;</label>
                                  <input name="welcome_rating" type="radio" value="5" onChange={handleChange}/><label htmlFor="welcome_rating">&nbsp;5&nbsp;</label>
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
                                  <select id="personal_equipment" name="personal_equipment" className="form-control" defaultValue={values.personal_equipment} onChange={handleChange}>
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
                                  <select id="equipment_type" name="equipment_type" className="form-control" defaultValue={values.equipment_type} onChange={(e) => {setFieldValue(e.target.name, e.target.value); (e.target.value == "Others") ? this.setState({'showAddEquipment': true}) : this.setState({'showAddEquipment': false}); }}>
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
                                      <input id="add_equipment_type" name="add_equipment_type" type="text" className="form-control" onChange={handleChange} defaultValue={values.add_equipment_type} />
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
                                  <input id="serial_no" name="serial_no" type="text" className="form-control" onChange={handleChange} defaultValue={values.serial_no} placeholder='Please indicate "N/A" if not applicable' />
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="serial_no" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                              <Col size="6">
                                <div className="form-group">
                                  <label className="itam-required">Asset Tag</label>
                                  <input id="asset_tag" name="asset_tag" type="text" className="form-control" onChange={handleChange} defaultValue={values.asset_tag} placeholder='Please indicate "N/A" if not applicable' />
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="asset_tag" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            {/* <RequestButtons method={method} {...this} /><br/><br/> */}
                            <span>
                              <div style={{'float': 'right'}}>
                                <Button type="submit" className="btn btn-primary-2" onClick={(e)=>{ setFieldValue('action', 'add_equipment');  handleSubmit(e); }}><i className="fa  is-green fa-location-arrow" /> Add Equipment</Button>
                              </div>
                            </span>

                            {equipment_list != undefined && equipment_list.length > 0 ?
                              <div>
                                <table class="table table-bordered" style={{ 'marginTop': '50px' }}>
                                  <thead>
                                    <tr>
                                      <th scope="col">Personal Equipment</th>
                                      <th scope="col">Equipment Type</th>
                                      <th scope="col">Serial No</th>
                                      <th scope="col">Asset Tag</th>
                                      {/* <th scope="col" className="is-center">Actions</th> */}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {equipment_list.map((equipment, index) => {
                                      let is_personal = '';
                                      let has_serial = equipment.serial_no ?? "N/A";
                                      let has_asset = equipment.asset_tag ?? "N/A";
                                      let equip_type = '';
                                      if (equipment.personal_equipment == 1) {
                                        is_personal = 'Yes'
                                      } else if (equipment.personal_equipment == 2) {
                                        is_personal = 'No';
                                      }
                                      if (equipment.equipment_type === 'Others') {
                                        equip_type = equipment.equipment_type + ": " + equipment.add_equipment_type;
                                      } else {
                                        equip_type = equipment.equipment_type;
                                      }
                                      return (
                                        <tr key={index}>
                                          <td>{is_personal}</td>
                                          <td>{equip_type}</td>
                                          <td>{has_serial}</td>
                                          <td>{has_asset}</td>
                                          {/* <td className="is-center">
                                            <button type="submit" className="btn" onClick={(e)=>{ e.preventDefault(); window.location.href = global.links.asset_management + asset.id; }}><i className="fa is-green fa-edit"></i></button>
                                          </td> */}
                                        </tr>
                                      )})}
                                  </tbody>
                                </table>
                                <span>
                                  <div style={{'float': 'right'}}>
                                    <Button type="submit" className="btn btn-primary-2" onClick={(e)=>{ setFieldValue('action', 'itam');  handleSubmit(e); }}><i className="fa  is-green fa-location-arrow" /> Confirm</Button>
                                  </div>
                                </span>
                              </div>
                              : <h3 style={{ 'marginTop': '50px' }}>No assets added yet</h3>
                            }
                          </Content>
                        </ContainerBody>
                      </ContainerWrapper>
                    </form>
                  )}
                </Formik>
              </Modal.Body>
              {/* <Modal.Footer></Modal.Footer> */}
            </Modal>

            <Modal className="remark-modal" show={this.state.showEvaModal} size="xl">
              <Modal.Header id="nho-modal-header" closeButton>
                <Modal.Title id="nho-modal-title">We Love To Hear Your EVA Experience</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Formik
                  enableReinitialize
                  onSubmit={this.onSubmitHandler}
                  validationSchema={validationSchemaEVA}
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
                                  <p>Your feedback is important to us and these will help improve our EVA Q2 experience. Rating is 1 to 5 where 5 is the highest.</p>
                                  <p>5 - Highly Satisfied<br/>4 - Satisfied<br/>3 - Neutral<br/>2 - Dissatisfied<br/>1 - Highly Dissatisfied<br/></p>
                                  <p className="survey-note">Note: All information is required so please ensure that all fields are completed.</p>
                                </div>
                              </Col>
                            </Row><br/>
                            {/* <Row className="mb-2rem">
                              <Col size="12"> 
                                <div className="form-group">
                                  <label className="nho-required survey-label">1. Year</label>
                                  <select className="form-control" name="eva_year" onChange={handleChange} style={{ display: 'block' }}>
                                      <option value="">- Select Year -</option>
                                      <option value="2025">2025</option>
                                      <option value="2024">2024</option>
                                      <option value="2023">2023</option>
                                  </select>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="eva_year" className="input-feedback" />
                                  </Form.Control.Feedback><br/>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">2. Quarter</label><br/>
                                  <select className="form-control" name="eva_quarter" onChange={handleChange} style={{ display: 'block' }}>
                                      <option value="">- Select Quarter -</option>
                                      <option value="1">Quarter 1</option>
                                      <option value="2">Quarter 2</option>
                                      <option value="3">Quarter 3</option>
                                      <option value="4">Quarter 4</option>
                                  </select>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="eva_quarter" className="input-feedback" />
                                  </Form.Control.Feedback><br/>
                                </div>
                              </Col>
                            </Row><br/> */}
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">1. I attended EVA Q2 2025</label><br/>
                                  <input name="attended_via" type="radio" value="Virtual" onChange={handleChange}/><label htmlFor="attended_via">&nbsp;Virtual&nbsp;</label>
                                  <input name="attended_via" type="radio" value="Onsite" onChange={handleChange}/><label htmlFor="attended_via">&nbsp;Onsite&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="attended_via" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">2. I had more clarity on how I should perform my job</label><br/>
                                  <input name="job_performance_clarity" type="radio" value="1" onChange={handleChange}/><label htmlFor="job_performance_clarity">&nbsp;1&nbsp;</label>
                                  <input name="job_performance_clarity" type="radio" value="2" onChange={handleChange}/><label htmlFor="job_performance_clarity">&nbsp;2&nbsp;</label>
                                  <input name="job_performance_clarity" type="radio" value="3" onChange={handleChange}/><label htmlFor="job_performance_clarity">&nbsp;3&nbsp;</label>
                                  <input name="job_performance_clarity" type="radio" value="4" onChange={handleChange}/><label htmlFor="job_performance_clarity">&nbsp;4&nbsp;</label>
                                  <input name="job_performance_clarity" type="radio" value="5" onChange={handleChange}/><label htmlFor="job_performance_clarity">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="job_performance_clarity" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">3. I understood how my work output contributes to business</label><br/>
                                  <input name="work_output_contribution" type="radio" value="1" onChange={handleChange}/><label htmlFor="work_output_contribution">&nbsp;1&nbsp;</label>
                                  <input name="work_output_contribution" type="radio" value="2" onChange={handleChange}/><label htmlFor="work_output_contribution">&nbsp;2&nbsp;</label>
                                  <input name="work_output_contribution" type="radio" value="3" onChange={handleChange}/><label htmlFor="work_output_contribution">&nbsp;3&nbsp;</label>
                                  <input name="work_output_contribution" type="radio" value="4" onChange={handleChange}/><label htmlFor="work_output_contribution">&nbsp;4&nbsp;</label>
                                  <input name="work_output_contribution" type="radio" value="5" onChange={handleChange}/><label htmlFor="work_output_contribution">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="work_output_contribution" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="4">
                                <div className="form-group">
                                  <label className="nho-required survey-label">4. I felt that the management recognizes the good job performance of employee</label><br/>
                                  <input name="management_recognition" type="radio" value="1" onChange={handleChange}/><label htmlFor="management_recognition">&nbsp;1&nbsp;</label>
                                  <input name="management_recognition" type="radio" value="2" onChange={handleChange}/><label htmlFor="management_recognition">&nbsp;2&nbsp;</label>
                                  <input name="management_recognition" type="radio" value="3" onChange={handleChange}/><label htmlFor="management_recognition">&nbsp;3&nbsp;</label>
                                  <input name="management_recognition" type="radio" value="4" onChange={handleChange}/><label htmlFor="management_recognition">&nbsp;4&nbsp;</label>
                                  <input name="management_recognition" type="radio" value="5" onChange={handleChange}/><label htmlFor="management_recognition">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="management_recognition" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">5. I felt like a valued member of Eastvantage</label><br/>
                                  <input name="member_value" type="radio" value="1" onChange={handleChange}/><label htmlFor="member_value">&nbsp;1&nbsp;</label>
                                  <input name="member_value" type="radio" value="2" onChange={handleChange}/><label htmlFor="member_value">&nbsp;2&nbsp;</label>
                                  <input name="member_value" type="radio" value="3" onChange={handleChange}/><label htmlFor="member_value">&nbsp;3&nbsp;</label>
                                  <input name="member_value" type="radio" value="4" onChange={handleChange}/><label htmlFor="member_value">&nbsp;4&nbsp;</label>
                                  <input name="member_value" type="radio" value="5" onChange={handleChange}/><label htmlFor="member_value">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="member_value" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">6. How would you rate Microsoft Teams as the platform used for Q2 EVA?</label><br/>
                                  <input name="platform_link" type="radio" value="1" onChange={handleChange}/><label htmlFor="platform_link">&nbsp;1&nbsp;</label>
                                  <input name="platform_link" type="radio" value="2" onChange={handleChange}/><label htmlFor="platform_link">&nbsp;2&nbsp;</label>
                                  <input name="platform_link" type="radio" value="3" onChange={handleChange}/><label htmlFor="platform_link">&nbsp;3&nbsp;</label>
                                  <input name="platform_link" type="radio" value="4" onChange={handleChange}/><label htmlFor="platform_link">&nbsp;4&nbsp;</label>
                                  <input name="platform_link" type="radio" value="5" onChange={handleChange}/><label htmlFor="platform_link">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="platform_link" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">7. How would you rate the overall flow of the program?</label><br/>
                                  <input name="program_flow" type="radio" value="1" onChange={handleChange}/><label htmlFor="program_flow">&nbsp;1&nbsp;</label>
                                  <input name="program_flow" type="radio" value="2" onChange={handleChange}/><label htmlFor="program_flow">&nbsp;2&nbsp;</label>
                                  <input name="program_flow" type="radio" value="3" onChange={handleChange}/><label htmlFor="program_flow">&nbsp;3&nbsp;</label>
                                  <input name="program_flow" type="radio" value="4" onChange={handleChange}/><label htmlFor="program_flow">&nbsp;4&nbsp;</label>
                                  <input name="program_flow" type="radio" value="5" onChange={handleChange}/><label htmlFor="program_flow">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="program_flow" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">8. Rate the relevance and clarity of the program's content and/or messages.</label><br/>
                                  <input name="content_messages" type="radio" value="1" onChange={handleChange}/><label htmlFor="content_messages">&nbsp;1&nbsp;</label>
                                  <input name="content_messages" type="radio" value="2" onChange={handleChange}/><label htmlFor="content_messages">&nbsp;2&nbsp;</label>
                                  <input name="content_messages" type="radio" value="3" onChange={handleChange}/><label htmlFor="content_messages">&nbsp;3&nbsp;</label>
                                  <input name="content_messages" type="radio" value="4" onChange={handleChange}/><label htmlFor="content_messages">&nbsp;4&nbsp;</label>
                                  <input name="content_messages" type="radio" value="5" onChange={handleChange}/><label htmlFor="content_messages">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="content_messages" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">9. How useful was the information presented in EVA?</label><br/>
                                  <input name="information_usefulness" type="radio" value="1" onChange={handleChange}/><label htmlFor="information_usefulness">&nbsp;1&nbsp;</label>
                                  <input name="information_usefulness" type="radio" value="2" onChange={handleChange}/><label htmlFor="information_usefulness">&nbsp;2&nbsp;</label>
                                  <input name="information_usefulness" type="radio" value="3" onChange={handleChange}/><label htmlFor="information_usefulness">&nbsp;3&nbsp;</label>
                                  <input name="information_usefulness" type="radio" value="4" onChange={handleChange}/><label htmlFor="information_usefulness">&nbsp;4&nbsp;</label>
                                  <input name="information_usefulness" type="radio" value="5" onChange={handleChange}/><label htmlFor="information_usefulness">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="information_usefulness" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">10. Overall, how satisfied are you with the Q2 2025 EVA experience?</label><br/>
                                  <input name="overall_satisfaction" type="radio" value="1" onChange={handleChange}/><label htmlFor="overall_satisfaction">&nbsp;1&nbsp;</label>
                                  <input name="overall_satisfaction" type="radio" value="2" onChange={handleChange}/><label htmlFor="overall_satisfaction">&nbsp;2&nbsp;</label>
                                  <input name="overall_satisfaction" type="radio" value="3" onChange={handleChange}/><label htmlFor="overall_satisfaction">&nbsp;3&nbsp;</label>
                                  <input name="overall_satisfaction" type="radio" value="4" onChange={handleChange}/><label htmlFor="overall_satisfaction">&nbsp;4&nbsp;</label>
                                  <input name="overall_satisfaction" type="radio" value="5" onChange={handleChange}/><label htmlFor="overall_satisfaction">&nbsp;5&nbsp;</label>
                                  <Form.Control.Feedback type="invalid">
                                      <ErrorMessage component="div" name="overall_satisfaction" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">11. What opportunities do you see for making EVA even better in the future?</label>
                                  <textarea className="form-control" rows="3" name="opportunities" onChange={handleChange} value={values.opportunities}></textarea>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="opportunities" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row><br/>
                            <Row className="mb-2rem">
                              <Col size="12">
                                <div className="form-group">
                                  <label className="nho-required survey-label">12. Do you have questions for the Eastvantage HR Team?</label>
                                  <textarea className="form-control" rows="3" name="questions" onChange={handleChange} value={values.questions}></textarea>
                                  <Form.Control.Feedback type="invalid">
                                    <ErrorMessage component="div" name="questions" className="input-feedback" />
                                  </Form.Control.Feedback>
                                </div>
                              </Col>
                            </Row>
                            <Row>
                              <Col size="12">
                                <br/>
                                <span>
                                  <div style={{'float': 'right'}}>
                                    <Button type="submit" className="btn btn-primary-2" onClick={(e)=>{ setFieldValue('action', 'eva');  handleSubmit(e); }}><i className="fa  is-green fa-location-arrow" /> Submit</Button>
                                  </div>
                                </span>
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

            <Modal className="remark-modal" show={this.state.showCocModal} size="xl">
              <Modal.Header id="nho-modal-header">
                <Modal.Title id="nho-modal-title">Code Of Conduct</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Formik
                  enableReinitialize
                  onSubmit={this.onSubmitHandler}
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
                                  {this.props.settings?.coc_forms?.[this.state.coc_mode - 1]?.content && (
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: this.props.settings.coc_forms[this.state.coc_mode - 1].content,
                                      }}
                                    />
                                  )}
                                </div>
                              </Col>
                            </Row>
                            <Row>
                              <Col size="12">
                                <br/>
                                <span>
                                  <div style={{ textAlign: "center" }}>
                                    {(this.state.coc_mode === 1 || this.state.coc_mode === 2) && (
                                      <>
                                        {this.state.coc_mode === 1 && (
                                          <>
                                            <input
                                              type="checkbox"
                                              id="mandatoryCheckbox"
                                              className="form-check-input"
                                              checked={this.state.isCocChecked}
                                              onChange={() =>
                                                this.setState({ isCocChecked: !this.state.isCocChecked })
                                              }
                                            />
                                            <label htmlFor="mandatoryCheckbox" className="form-check-label">
                                              I understand that this action is mandatory.
                                            </label>
                                            <br />
                                          </>
                                        )}

                                        <Button
                                          type="submit"
                                          className="btn btn-primary-2"
                                          disabled={this.state.coc_mode === 1 && !this.state.isCocChecked}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            setFieldValue("action", "coc");
                                            handleSubmit(e);
                                          }}
                                          style={{ marginTop: "20px" }}
                                        >
                                          <i className="fa is-green fa-location-arrow" />{" "}
                                          {this.state.coc_mode === 1 ? "I Agree" : "I Confirm"}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </span>
                              </Col>
                            </Row>
                          </Content>
                        </ContainerBody>
                      </ContainerWrapper>
                    </form>
                  )}
                </Formik>
              </Modal.Body>
            </Modal>

            <Modal className="remark-modal" show={this.state.showEvaRegModal} size="xl">
              <Modal.Header id="nho-modal-header">
                <Modal.Title id="nho-modal-title">EVA Registration</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Formik
                  enableReinitialize
                  onSubmit={this.onSubmitHandler}
                  initialValues={initialValue}
                  >
                  {({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                    <form onSubmit={handleSubmit}>
                      <input type="hidden" name="modal_mode" value="itam" />
                      <Content col="12" subtitle={<RequestSubtitle method={"store"} user={user} />}>
                        <Row>
                          <Col size="12">
                            <div className="form-group">
                              <h1>CELEBRATE 15 YEARS OF EASTVANTAGE</h1>
                              <img src="/images/eva_1.png" width="100%" alt="EVA 2025 15 Years" /><br/><br/>
                              <p>Fifteen years ago, Eastvantage began as a small team with a bold vision — <b>to connect talent, technology, and opportunity across borders.</b> Today, we’ve grown into a global family united by shared purpose and culture.</p>
                              <p>This October 29, we celebrate 15 years of impact, growth, and collaboration through our anniversary theme: <b>🧵 Woven Across Borders — stitched together by our team, our clients, and our shared culture.</b></p>
                              <p>Be part of this milestone event as we look back on our journey and forward to the exciting chapters ahead.</p>
                              <div style={{ textAlign: "center", marginTop: "20px" }}><img src="/images/eva_2.png" style={{ maxWidth: "50%", height: "auto" }} alt="EVA 2025 Theme" /></div>
                              <div style={{ textAlign: "center", marginTop: "20px" }}><img src="/images/eva_3.png" style={{ maxWidth: "50%", height: "auto" }} alt="EVA 2025 Calendar" /></div>

                              <div className="text-center" style={{ marginTop: "50px" }}>
                                <p style={{ fontWeight: "bold", fontSize: "1.2rem", textAlign: "center" }}>How to register:</p>
                                <ol style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
                                  <li>Click the button above or this link:&nbsp;
                                    <a 
                                      href="#" 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        this.openPopup("https://events.teams.microsoft.com/event/ed4c4f6b-61d0-4782-88ad-b6b42d2e44cd@ac1e81b8-89df-4ff5-9a1b-a0d231273335");
                                      }}
                                    >
                                      <b>REGISTRATION LINK</b>
                                    </a>
                                  </li>
                                  <li>Select “Register.”</li>
                                  <li>Fill out the registration form; please register the email address you’ll use to join the event.</li>
                                  <li>Click “Register” again to confirm.</li>
                                  <li>You’ll receive an email confirmation once successfully registered.</li>
                                  <li>The event will be reflected on your calendar.</li>
                                </ol>
                                <p style={{ fontWeight: "bold", fontSize: "1.2rem", textAlign: "center", marginTop: "30px" }}>Let’s celebrate 15 years of growth, grit, and global connection — together, let’s weave new memories across borders</p>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Content>
                    </form>
                  )}
                </Formik>
              </Modal.Body>
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

const validationSchemaEVA = Yup.object().shape({
    // eva_year:                   Yup.string().required("This field is required").nullable(),
    // eva_quarter:                Yup.string().required("This field is required").nullable(),
    attended_via:               Yup.string().required("This field is required").nullable(),
    job_performance_clarity:    Yup.string().required("This field is required").nullable(),
    work_output_contribution:   Yup.string().required("This field is required").nullable(),
    management_recognition:     Yup.string().required("This field is required").nullable(),
    member_value:               Yup.string().required("This field is required").nullable(),
    platform_link:              Yup.string().required("This field is required").nullable(),
    program_flow:               Yup.string().required("This field is required").nullable(),
    content_messages:           Yup.string().required("This field is required").nullable(),
    information_usefulness:     Yup.string().required("This field is required").nullable(),
    overall_satisfaction:       Yup.string().required("This field is required").nullable(),
    opportunities:              Yup.string().required("This field is required").nullable(),
    questions:                  Yup.string().required("This field is required").nullable(),
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
      addNhoSurvey    : ( post_data ) => dispatch( addNhoSurvey( post_data ) ),
      getNhoSurvey    : () => dispatch( getNhoSurvey() ),
      addUserAsset    : ( post_data ) => dispatch( addUserAsset( post_data) ),
      getUserAssets   : () => dispatch( getUserAssets() ),
      addEvaSurvey    : ( post_data ) => dispatch( addEvaSurvey( post_data ) ),
      getEvaSurvey    : () => dispatch( getEvaSurvey() ),
      getUserCoc      : () => dispatch( getUserCoc() ),
      acknowledgeCOC  : () => dispatch( acknowledgeCOC() ),
      getEvaReg       : () => dispatch( getEvaReg() ),
      submitEvaReg    : () => dispatch( submitEvaReg() ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);