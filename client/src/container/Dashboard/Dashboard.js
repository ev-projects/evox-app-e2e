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
    personal_equipment: '',
    equipment_type: '',
    serial_no: '',
    asset_tag: '',
    add_equipment_type: '',
    showItamModal: false,
    equipment_list: [],
  };

  componentDidMount() {
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
    if (["DivisionHead", "Client", "Board"].includes(this.props.user.lvl_name)) {
      this.setState({ showItamModal : false });
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
      } else {
        this.props.addNhoSurvey(formData);
      }
    }
  }

  onHide = () => {
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
      personal_equipment: '',
      equipment_type: '',
      serial_no: '',
      asset_tag: '',
      add_equipment_type: '',
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
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    );
  }
}

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
    settings: state.settings,
  };
};

const mapDispatchToProps = (dispatch) => {
    return {
      addUserAsset    : ( post_data ) => dispatch( addUserAsset( post_data) ),
      getUserAssets   : () => dispatch( getUserAssets() ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);