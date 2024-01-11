import React, { Component } from "react";
import "./NavPuncher.css";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import Validator from "../../../services/Validator";
import { Link } from "react-router-dom";
import { logOut } from '../../../store/actions/userActions'
import { Modal, Form, Container, Row, Col, Table, Image, Spinner, Button, Badge, Tab, Tabs, Dropdown } from 'react-bootstrap';
import moment from 'moment';
import { biometrixLog } from '../../../store/actions/dtr/quickpunchActions'
import $ from 'jquery';
import Authenticator from "../../../services/Authenticator";
import { getRecentDtr } from '../../../store/actions/dashboard/dashboardActions'
import { Formik, FieldArray, Field, ErrorMessage, getIn } from 'formik';
import * as Yup from 'yup';



class NavPuncher extends Component {
  constructor(props) {
    super(props);
    this.timer = 0;
    this.state = {
      time: new Date(),
      compare_to_clock_in: new Date(),
      NavHasLoaded: false,
      offsetHasLoaded: false,
      earlyOutShow: false
    };
  }

  handleOnhide = () => {
    this.setState({
      earlyOutShow: false
    });
  }

  onSubmitHandler = async (values) => {
    // this.onUIHandler();

    var formData = new FormData();

    for (var key in values) {

      if (values[key] != null) {
        switch (key) {
          default:
            formData.set(key, values[key]);
            break;
        }
      }
    }

    if (this.props.dashboard?.recent_dtr[1]?.id != undefined && values["dtr_id"] == null) {
      if (this.props.dashboard?.recent_dtr[1]?.before_time_in_half == true && (values["early_clock_out"] == null)) {
        this.setState({
          earlyOutShow: true
        });
      }
      else {
        console.log("PASS1");
        formData.set("dtr_id", this.props.dashboard?.recent_dtr[1].id);
        this.props.biometrixLog(formData, this.props.user.id);
      }

    }

    if (this.props.dashboard?.recent_dtr[0]?.id != undefined && this.props.dashboard?.recent_dtr[0]?.with_in_time == true && this.props.dashboard?.recent_dtr[1]?.with_in_time != true) {
      console.log("PASS0");
      formData.set("dtr_id", this.props.dashboard?.recent_dtr[0].id);
      this.props.biometrixLog(formData, this.props.user.id);
    }

  }


  addSeconds(date, seconds) {
    date.setSeconds(date.getSeconds() + seconds);
    return date;
  }
  subtractSeconds(date, seconds) {
    //console.log('oms', date.getTime());
    //console.log('s', seconds);
    //console.log('-ms', date.getTime() - Math.abs(seconds * 1000));  
    return new Date(date.getTime() - Math.abs(seconds * 1000));
  }
  componentWillMount = async () => {
    // const { user, constant, dashboard } = this.props;
    this.timer = setInterval(() => {
      if (localStorage.getItem("access_token") == null) return;
      var timeStamp = localStorage.getItem("user_local_timestamp_mils");
      var offSet = localStorage.getItem("user_local_offset_mils");
      //console.log('TS', timeStamp);
      var now = new Date;
      //console.log('cDate', now);
      if (offSet != null) {
        var utcDate = this.subtractSeconds(now, now.getTimezoneOffset() * 60);
        //console.log('uDate', utcDate);
        now = new Date(utcDate.getTime() + parseInt(offSet));
        //console.log('uDate+', now);
      }
      if (timeStamp != null) {
        var currTimeStamp = now.getTime();
        //console.log('tsDate', new Date(parseInt(timeStamp)));
        var diffTimeStamp = currTimeStamp - timeStamp;
        now = new Date(parseInt(timeStamp) + diffTimeStamp);
        //console.log('lsDate', now);
      }
      this.setState({
        time: now
      });
      //console.log(date);
      /*this.setState({
        time: this.props.user?.user_server_timestamp_mils != null || this.props.user?.user_server_timestamp_mils != undefined ?
          this.state.offsetHasLoaded ? this.addSeconds(this.state.time, 1) : (new Date(this.props.user?.user_server_timestamp_mils + (date.getTimezoneOffset() * 60 * 1000)))

          : new Date(),
        // time: this.props.user?.user_server_timestamp_mils != null ||  this.props.user?.user_server_timestamp_mils != undefined? new Date(this.props.user?.user_server_timestamp_mils- (date.getTimezoneOffset() * 3600*1000)): new Date(),

      });

      this.setState({
        offsetHasLoaded: this.props.user?.user_server_timestamp_mils != null || this.props.user?.user_server_timestamp_mils != undefined ? true : false,

      });*/

      //this.componentWillMount();
    }, 1000);




    var from = moment().subtract(1, 'days').format("YYYY-MM-DD");
    var to = moment().format("YYYY-MM-DD");
    // }

  }
  onUIHandler = async () => {
    $(document).on('click', 'nav-clock-dropdown .dropdown .dropdown-menu', function (e) {
      e.stopPropagation();
    });

  }
  componentWillUnmount() {
    clearInterval(this.timer);
  }
  canClockOut(clock_in) {
    // console.log(new Date(clock_in));
    // console.log(this.state.compare_to_clock_in);
    if (!clock_in && !this.state.compare_to_clock_in)
      return 0;
    var diff = (this.state.compare_to_clock_in.getTime() - new Date(clock_in)) / 1000;
    diff /= 60;
    diff /= 60;
    // console.log(Math.abs(Math.round(diff)));
    return Math.abs(Math.round(diff));
  }
  render = () => {
    const initialValue = {
      quickpunch: null
    }

    const { recent_dtr } = this.props.dashboard;
    // show previous day button
    var target_previous = false;
    var range = 0
    if (this.props.dashboard?.recent_dtr[0]?.end_datetime != null && this.props.dashboard?.recent_dtr[1]?.start_datetime != null) {
      range = (this.props.dashboard?.recent_dtr[1]?.raw_time.start_datetime - this.props.dashboard?.recent_dtr[0]?.raw_time.end_datetime) / 2;
      if ((Math.floor(Date.now() / 1000) - this.props.dashboard?.recent_dtr[0]?.raw_time.end_datetime < range)) {
        if (this.props.dashboard?.recent_dtr[0]?.time_in == null || this.props.dashboard?.recent_dtr[0]?.time_out == null) {
          target_previous = true;
        }

      }
    }
    // console.log(this.props.dashboard?.recent_dtr[0]?.with_in_time == true);



    const user = this.props.user;
    // console.log(this.props.dashboard?.isNavDtrLoaded, this.props.dashboard?.recent_dtr[0]?.with_in_time == true)
    return (
      <div className="nav-puncher">



        <div className="div-col ">

          {(Authenticator.check("employee", "user_multi_login") && Authenticator.check_department_permissions()) ? <>
            <Button type="submit" className="nav-clock-button dropdown  btn-secondary newfeature" disabled> <i className="fa fa-calendar-times-o" /> Clock In</Button>
          </>
            :
            <>
              <Formik
                enableReinitialize
                onSubmit={
                  this.onSubmitHandler
                }
                validationSchema={validationSchema}
                initialValues={initialValue}>
                {
                  ({ values, errors, setFieldValue, field, touched, handleSubmit, handleReset, handleChange }) => (
                    <form onSubmit={handleSubmit}>
                      {this.props.dashboard?.recent_dtr.length > 1 ? (
                        this.props.dashboard?.recent_dtr[1]?.is_rest_day == 1 ? (
                          this.props.dashboard?.recent_dtr[0]?.is_rest_day == 1
                            || (this.props.dashboard?.recent_dtr[0]?.is_rest_day == 0 && this.props.dashboard?.recent_dtr[0]?.with_in_time == false)
                            || (this.props.dashboard?.recent_dtr[1]?.is_rest_day == 1 && this.props.dashboard?.recent_dtr[0]?.is_rest_day == 0 && this.props.dashboard?.recent_dtr[0]?.time_in != null && this.props.dashboard?.recent_dtr[0]?.time_out != null && this.props.dashboard?.recent_dtr[0]?.with_in_time == true) ? (
                            <>

                              <Button type="submit" className="nav-clock-button dropdown  btn-secondary newfeature" disabled> <i className="fa fa-calendar-times-o" /> Rest Day</Button>
                            </>
                          ) : (

                            <>
                              {
                                (this.props.dashboard?.recent_dtr[0]?.time_in == null) ?
                                  //CLOCK IN/OUT for YESTERDAY ONLY
                                  (<>
                                    <Button className="nav-clock-button dropdown newfeature"
                                      onClick={(e) => {
                                        setFieldValue('quickpunch', 'in');
                                        setFieldValue('dtr_id', this.props.dashboard?.recent_dtr[0]?.id);
                                      }}
                                      type="submit" ><i className="fa fa-history" /> Clock In
                                    </Button>
                                  </>)
                                  :

                                  (<>
                                    <Button className="nav-clock-button dropdown newfeature"
                                      onClick={(e) => {
                                        setFieldValue('quickpunch', 'out');
                                        setFieldValue('dtr_id', this.props.dashboard?.recent_dtr[0]?.id);
                                      }}
                                      type="submit" >
                                      <i className="fa fa-history" /> Clock Out
                                    </Button>
                                  </>)
                              }

                            </>
                          )
                        ) : (
                          <>

                            {!(this.props.dashboard?.recent_dtr[1]?.time_in || (this.props.dashboard?.recent_dtr[0]?.with_in_time == true && this.props.dashboard?.recent_dtr[0]?.time_in)) ? (
                              <>
                                <Button className="nav-clock-button dropdown newfeature" type="submit" onClick={(e) => { setFieldValue('quickpunch', 'in'); }} >
                                  <i className="fa fa-clock-o" /> Clock In</Button>
                              </>
                            ) : (
                              ((this.props.dashboard?.recent_dtr[1]?.time_in && this.props.dashboard?.recent_dtr[1]?.time_out) || (this.props.dashboard?.recent_dtr[0]?.with_in_time == true && this.props.dashboard?.recent_dtr[0]?.time_out && this.props.dashboard?.recent_dtr[0]?.time_in)) ?
                                (<><Button type="submit" className="nav-clock-button dropdown  btn-secondary newfeature" disabled> <i className="fa fa-sun-o" /> Day Completed</Button></>) :

                                (<><Button className="nav-clock-button dropdown newfeature" onClick={(e) => { setFieldValue('quickpunch', 'out'); }} type="submit" >
                                  <i className="fa fa-history" /> Clock Out</Button>
                                  {
                                    this.state.earlyOutShow &&
                                    <EarlyOutModal
                                      props={this.props}
                                      handleModalClose={() => { this.handleOnhide() }}
                                    />
                                  }
                                </>)
                            )}

                          </>
                        )
                      ) :
                        this.props.dashboard?.isNavDtrLoaded == true ? (
                          <>


                            <Button className="nav-clock-button dropdown newfeature" type="submit" onClick={(e) => { setFieldValue('quickpunch', 'in'); }} ><i className="fa fa-clock-o" /> Clock In and Generate</Button>


                          </>)
                          : (
                            <>


                              <Button type="submit" className="nav-clock-button dropdown neutral newfeature"><i className=" fa fa-clock-o" /> Loading</Button>

                            </>)


                      }


                    </form>
                  )}

              </Formik>
            </>}

        </div>

        <Dropdown.Toggle className="nav-clock" >
          <div className="nav-clock-dropdown nav-clock div-col">
            <div className=" time-info " >
              <div>
                <div className="nav-date">	{moment(this.state.time).format("dddd, Do MMMM")}    </div>
              </div>
              <div>
                <div className="nav-time">
                  <div className="nav-time-clock">
                  {moment(this.state.time).format("hh")} : {moment(this.state.time).format("mm")} : {moment(this.state.time).format("ss")}  {moment(this.state.time).format("A")} 
                  </div>
                {
                  this.props.user.timezone !== undefined ? <>
                   <div className="timezone-item">
                { this.props.user.timezone }

                </div>
                
                <div className="timezone-item-tooltip">
                <a href="#" data-tool-tip={ "Your Timezone is "  + this.props.user.timezone + ", since your country set by HR is " + this.props.user.country }><i className="fa  fa-question-circle "/></a>
                </div>
                  </> : <></>
                }
               

          
                
                 </div>
              </div>
              <i class="fa fa-angle-down  icon-dropdown-dtr" aria-hidden="true"></i>
            </div>


          </div>
        </Dropdown.Toggle  >
      </div>




    );
  };
}

function EarlyOutModal(props) {
  return (
    <div id="myModal" className="modal-main">
      <div className="modal-content">
        <div className="modal-header">
          <span className="close" onClick={() => props.handleModalClose()}>&times;</span>
        </div>

        <div className="modal-body">
          <h6>Clock Out Early?</h6>


          <p>This could result in undertime on this date.</p>

          <Field>
            {({ field, form }) => (
              <div>
                <Button className="early-out-btn"
                  onClick={(e) => {
                    form.setFieldValue('quickpunch', 'out');
                    form.setFieldValue('dtr_id', props.dashboard?.recent_dtr[1]?.id);
                    form.setFieldValue('early_clock_out', true);

                  }}
                  type="submit" >
                  <i className="fa fa-history" /> Continue
                </Button>
                <Button className="early-out-btn-cancel btn-secondary" onClick={() => props.handleModalClose()}>
                  Cancel
                </Button>
              </div>
            )}
          </Field>
          <br />

        </div>
      </div>
    </div>
  )
}

// function EarlyOutModal(props) {
//   return (
//     <div>
//     <Modal centered show>
//       <Modal.Header >
//         <Modal.Title><b>Early Clock Out.</b></Modal.Title>
//         <span className="close" onClick = {() => props.handleModalClose()}>&times;</span>
//       </Modal.Header>
//       <Modal.Body>
//       <p>This could result in undertime.</p>
//       <Field>
//         {({ field, form }) => (
//           <div>
//                 <Button className="nav-clock-button dropdown newfeature" 
//                 onClick={(e)=> { form.setFieldValue('quickpunch','out'); 
//                 form.setFieldValue('dtr_id', this.props.dashboard?.recent_dtr[1]?.id);  }}  
//                 type="submit" >
//                   <i className="fa fa-history" /> Clock Out
//                 </Button>            
//           </div>
//         )}
//       </Field>
//       <br />
//         <Button onClick = {() => props.handleModalClose()}>
//           Cancel
//         </Button>
//       </Modal.Body>

//     </Modal>
//   </div>
//   )
//   }

const validationSchema = Yup.object().shape({});

const mapStateToProps = (state) => {
  return {
    user: state.user,
    settings: state.settings,
    dashboard: state.dashboard,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    getRecentDtr: (user_id, from, to) => dispatch(getRecentDtr(user_id, from, to)),
    biometrixLog: (post_data, id) => dispatch(biometrixLog(post_data, id)),

  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NavPuncher);

// export default (NavPuncher);
