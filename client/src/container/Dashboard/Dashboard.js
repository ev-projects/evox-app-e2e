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
  Modal
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { fetchUser, addNhoSurvey } from "../../store/actions/userActions";
import { Formik, ErrorMessage,getIn  } from 'formik';
import { InputDate,InputTime } from '../../components/DatePickerComponent/DatePicker.js';
import * as Yup from 'yup';
import RequestSubtitle from "../../components/RequestComponent/RequestButtons/RequestSubtitle";

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
    showModal: false
  };

  componentDidMount() {
    // check if user is valid for NHO survey
    const start_date = new Date(this.props.user.date_hired);
    const end_date = new Date(this.props.user.date_hired);
    end_date.setDate(end_date.getDate() + 14);
    const today = new Date();
    const nho_survey_valid = (today >= start_date && today <= end_date);

    if (nho_survey_valid && !this.props.user.nho_survey) {
      this.setState({ showModal : true });
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
    formData.set('nho_date', this.state.nho_date);
    formData.set('onboarding_exp_rating', this.state.onboarding_exp_rating);
    formData.set('recruitment_exp_rating', this.state.recruitment_exp_rating);
    formData.set('schedule_awareness_rating', this.state.schedule_awareness_rating);
    formData.set('topic_relevance_rating', this.state.topic_relevance_rating);
    formData.set('facilitator_id', this.state.facilitator_id);
    formData.set('facilitator_knowledge_rating', this.state.facilitator_knowledge_rating);
    formData.set('facilitator_presentation_rating', this.state.facilitator_presentation_rating);
    formData.set('facilitator_response_rating', this.state.facilitator_response_rating);
    formData.set('equipment_rating', this.state.equipment_rating);
    formData.set('accessibility_rating', this.state.accessibility_rating);
    formData.set('welcome_rating', this.state.welcome_rating);
    formData.set('suggestions', this.state.suggestions);
    formData.set('nho_overall_feedback', this.state.nho_overall_feedback);

    this.props.addNhoSurvey(formData);
    this.onHide();
    window.open("https://www.glassdoor.co.in/Reviews/Eastvantage-Business-Solutions-Reviews-E1084085.htm", "_blank", "noopener");

  }

  onHide = () => {
    this.setState({ showModal: false });
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
    const initialValue = {};
    let title = "2025 New Hire Orientation Experience and Feedback Survey";

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
        <ContainerWrapper className="full-wrapper">
          <ContainerBody>
            {true ? (
              <EmployeeDashboard {...this.props} />
            ) : null}
            {/* { Authenticator.check(['supervisor', 'team_leader', 'client'], ['supervisor_access', 'team_leader_access', 'client_access']) ? 
                          <HandlerDashboard {...this.props} />
                          :
                          null
                        } */}

              <Modal className="remark-modal" show={this.state.showModal} onHide={this.onHide} size="xl">
                <Modal.Header closeButton>
                  <Modal.Title>NHO Survey Form</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Formik 
                    enableReinitialize
                    onSubmit={this.onSubmitHandler}
                    validationSchema={validationSchema} 
                    initialValues={initialValue}
                    >
                    {({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                      <form onSubmit={handleSubmit}>
                        <ContainerWrapper style={{ marginLeft: "0 !important;" }}>
                          <ContainerBody style={{ marginLeft: "5px !important;" }}>
                            <Content col="12" title={title} subtitle={<RequestSubtitle method={"store"} user={user} />}>
                              <Row>  
                                <Col size="12"> 
                                  <div className="form-group">
                                    <label>1. When did you have your New Hire Orientation? (Date of NHO)</label>
                                    <input type="date" name="nho_date" className="form-control" onChange={this.handleChange}/>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>2. How would you rate your Over-all Week-1 Employee Onboarding Experience with Eastvantage? (5 being the highest)</label><br/>
                                    <input name="onboarding_exp_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="onboarding_exp_rating">1&nbsp;</label>
                                    <input name="onboarding_exp_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="onboarding_exp_rating">2&nbsp;</label>
                                    <input name="onboarding_exp_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="onboarding_exp_rating">3&nbsp;</label>
                                    <input name="onboarding_exp_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="onboarding_exp_rating">4&nbsp;</label>
                                    <input name="onboarding_exp_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="onboarding_exp_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>3. How would you rate your Over-all Experience with the Recruitment process? (5 being the highest)</label><br/>
                                    <input name="recruitment_exp_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="recruitment_exp_rating">1&nbsp;</label>
                                    <input name="recruitment_exp_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="recruitment_exp_rating">2&nbsp;</label>
                                    <input name="recruitment_exp_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="recruitment_exp_rating">3&nbsp;</label>
                                    <input name="recruitment_exp_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="recruitment_exp_rating">4&nbsp;</label>
                                    <input name="recruitment_exp_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="recruitment_exp_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>4. I am aware of the New Hire Orientation Schedule. (5 being the highest)</label><br/>
                                    <input name="schedule_awareness_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="schedule_awareness_rating">1&nbsp;</label>
                                    <input name="schedule_awareness_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="schedule_awareness_rating">2&nbsp;</label>
                                    <input name="schedule_awareness_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="schedule_awareness_rating">3&nbsp;</label>
                                    <input name="schedule_awareness_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="schedule_awareness_rating">4&nbsp;</label>
                                    <input name="schedule_awareness_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="schedule_awareness_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>5. The topics covered during New Hire Orientation are relevant as a new hire. (5 being the highest)</label><br/>
                                    <input name="topic_relevance_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="topic_relevance_rating">1&nbsp;</label>
                                    <input name="topic_relevance_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="topic_relevance_rating">2&nbsp;</label>
                                    <input name="topic_relevance_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="topic_relevance_rating">3&nbsp;</label>
                                    <input name="topic_relevance_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="topic_relevance_rating">4&nbsp;</label>
                                    <input name="topic_relevance_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="topic_relevance_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="4">
                                  <div className="form-group">
                                    <label>6. Choose your Facilitator</label>
                                    {/* <select className="form-control" name="facilitator_id" onChange={handleChange} style={{ display: 'block' }}>
                                        <option  value = {0}  label="Select Country" />
                                        {countries && countries.length > 0 &&
                                            countries.map((country, pos) => (
                                            <option value={country.country_id}>
                                                {country.country_name}
                                            </option>
                                        ))}
                                    </select> */}
                                    <select className="form-control" name="facilitator_id" onChange={this.handleChange} style={{ display: 'block' }}>
                                        <option value="4713">Vennize Perol</option>
                                        <option value="4698">Marjorie Villegas</option>
                                        <option value="3310">Toiba Qureshi</option>
                                        <option value="4661">Antoeneta Antonova</option>
                                        <option value="5794">Haitam Achou</option>
                                    </select>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>7. The facilitator/s were highly knowledgeable about the topics. (5 being the highest)</label><br/>
                                    <input name="facilitator_knowledge_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="facilitator_knowledge_rating">1&nbsp;</label>
                                    <input name="facilitator_knowledge_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="facilitator_knowledge_rating">2&nbsp;</label>
                                    <input name="facilitator_knowledge_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="facilitator_knowledge_rating">3&nbsp;</label>
                                    <input name="facilitator_knowledge_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="facilitator_knowledge_rating">4&nbsp;</label>
                                    <input name="facilitator_knowledge_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="facilitator_knowledge_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>8. The facilitator/s were able to present in a clear and understandable manner. (5 being the highest)</label><br/>
                                    <input name="facilitator_presentation_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="facilitator_presentation_rating">1&nbsp;</label>
                                    <input name="facilitator_presentation_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="facilitator_presentation_rating">2&nbsp;</label>
                                    <input name="facilitator_presentation_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="facilitator_presentation_rating">3&nbsp;</label>
                                    <input name="facilitator_presentation_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="facilitator_presentation_rating">4&nbsp;</label>
                                    <input name="facilitator_presentation_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="facilitator_presentation_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>9. The facilitator/s were able to answer my questions. (5 being the highest)</label><br/>
                                    <input name="facilitator_response_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="facilitator_response_rating">1&nbsp;</label>
                                    <input name="facilitator_response_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="facilitator_response_rating">2&nbsp;</label>
                                    <input name="facilitator_response_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="facilitator_response_rating">3&nbsp;</label>
                                    <input name="facilitator_response_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="facilitator_response_rating">4&nbsp;</label>
                                    <input name="facilitator_response_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="facilitator_response_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>10. My EV equipment is working properly. (5 being the highest)</label><br/>
                                    <input name="equipment_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="equipment_rating">1&nbsp;</label>
                                    <input name="equipment_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="equipment_rating">2&nbsp;</label>
                                    <input name="equipment_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="equipment_rating">3&nbsp;</label>
                                    <input name="equipment_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="equipment_rating">4&nbsp;</label>
                                    <input name="equipment_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="equipment_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>11. I was able to login to my webmail, EVOX and BHR during my Day 1. (5 being the highest)</label><br/>
                                    <input name="accessibility_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="accessibility_rating">1&nbsp;</label>
                                    <input name="accessibility_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="accessibility_rating">2&nbsp;</label>
                                    <input name="accessibility_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="accessibility_rating">3&nbsp;</label>
                                    <input name="accessibility_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="accessibility_rating">4&nbsp;</label>
                                    <input name="accessibility_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="accessibility_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>12. I am welcomed by Eastvantage on my first day. (5 being the highest)</label><br/>
                                    <input name="welcome_rating" type="radio" value="1" onChange={this.handleChange}/><label htmlFor="welcome_rating">1&nbsp;</label>
                                    <input name="welcome_rating" type="radio" value="2" onChange={this.handleChange}/><label htmlFor="welcome_rating">2&nbsp;</label>
                                    <input name="welcome_rating" type="radio" value="3" onChange={this.handleChange}/><label htmlFor="welcome_rating">3&nbsp;</label>
                                    <input name="welcome_rating" type="radio" value="4" onChange={this.handleChange}/><label htmlFor="welcome_rating">4&nbsp;</label>
                                    <input name="welcome_rating" type="radio" value="5" onChange={this.handleChange}/><label htmlFor="welcome_rating">5&nbsp;</label>
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>13. What suggestions/recommendations do you have to improve our EV New Hire Orientation.</label>
                                    <textarea className="form-control" rows="3" name="suggestions" onChange={this.handleChange}></textarea>
                                    {/* <Form.Control.Feedback type="invalid">
                                      &nbsp;{errors.suggestions && touched.suggestions && errors.suggestions}
                                    </Form.Control.Feedback> */}
                                  </div>
                                </Col>
                              </Row><br/>
                              <Row>
                                <Col size="12">
                                  <div className="form-group">
                                    <label>14. Let us know your Over-all New Hire Orientation Feedback.</label>
                                    <textarea className="form-control" rows="3" name="nho_overall_feedback" onChange={this.handleChange}></textarea>
                                    {/* <Form.Control.Feedback type="invalid">
                                      &nbsp;{errors.nho_overall_feedback && touched.nho_overall_feedback && errors.nho_overall_feedback}
                                    </Form.Control.Feedback>  */}
                                  </div>
                                </Col>
                              </Row>
                            </Content>
                          </ContainerBody>
                        </ContainerWrapper>
                      </form>
                    )}
                  </Formik>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={this.onHide}>Cancel</Button>
                  <Button variant="primary" onClick={this.onSubmitHandler}>Submit</Button>
                </Modal.Footer>
              </Modal>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    );
  }
}

const validationSchema = Yup.object().shape({
    nho_date:           Yup.string().required("This field is required").nullable(),
    start_time:     Yup.date().required("This field is required").nullable(),
    end_time:       Yup.date().required("This field is required").nullable(),
    // break_time:     Yup.date().required("This field is required").nullable().max( DateFormatter.get_specific_datetime( null, '01:00:01' ) , 'Please select valid break time.'),
    employee_note:  Yup.string().nullable(),
    approver_note:  Yup.string().nullable()
});

const mapStateToProps = (state) => {
  return {
    user: state.user,
    dashboard: state.dashboard,
  };
};

const mapDispatchToProps = (dispatch) => {
    return {
      addNhoSurvey    : ( post_data ) => dispatch( addNhoSurvey( post_data ) ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
