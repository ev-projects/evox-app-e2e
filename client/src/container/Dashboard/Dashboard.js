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
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { fetchUser } from "../../store/actions/userActions";

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
  getcurrentdate,
  getenddate
} from "../../services/Helper";
class Dashboard extends Component {
  constructor(props) {
    super(props);
  }

  state = {
    run: false,
    steps: Authenticator.check(
      ["supervisor", "team_leader"],
      ["supervisor_access", "team_leader_access"]
    )
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
  };

  componentDidMount() {
    // alert(this.props.dashboard?.worktour);
    // const user = localStorage.getItem('user');
    // const userid = user ? JSON.parse(user) : null;
    // alert(userid);
    //   if(userid !== this.props.user?.id || userid === null){
    //     this.setState({ run: this.props.dashboard?.worktour });
    //   }

    var exdate = Date.parse("2023-05-31");
    var expiredate = format(exdate, "yyyy-MM-dd");
    const current = new Date();
    const date = `${current.getFullYear()}-${
      current.getMonth() + 1
    }-${current.getDate()}`;
    var cudate = Date.parse(date);
    var currentdate = format(cudate, "yyyy-MM-dd");
    if (expiredate >= currentdate) this.setState({ run: this.props.dashboard?.worktour });
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
            {Authenticator.check(["employee"], ["employee_access"]) ? (
              <EmployeeDashboard {...this.props} />
            ) : null}
            {/* { Authenticator.check(['supervisor', 'team_leader', 'client'], ['supervisor_access', 'team_leader_access', 'client_access']) ? 
                          <HandlerDashboard {...this.props} />
                          :
                          null
                        } */}
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.user,
    dashboard: state.dashboard,
  };
};

export default connect(mapStateToProps, null)(Dashboard);
