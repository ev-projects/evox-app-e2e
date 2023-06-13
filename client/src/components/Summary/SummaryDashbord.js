import React, { useState, useEffect } from "react";
import { Table, Card, Button, Tabs, Tab } from "react-bootstrap";
import { connect, dispatch } from "react-redux";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
  Row,
  Col,
} from "../../components/GridComponent/AdminLte.js";
import { useDispatch } from "react-redux";

import { useParams, useHistory } from "react-router-dom";
import "./SummaryDashboard.css";
import BirthdayAnniversary from "../Dashboard/BirthdayAnniversary/BirthdayAnniversary.js";
import {
  fetchStatusNumbers_dashboard,
  myfetchStatusNumbers_dashboard,
  eventclick,
  get_today_leaves,
  get_tommrow_leaves,
  get_dashboard_holiday,
} from "../../store/actions/filters/requestListActions";
import { format, getDate } from "date-fns";
import PageLoading from "../../container/PageLoading/PageLoading.js";
import PageLoadingCard from "../../container/PageLoadingCard.js/PageLoadingCard.js";
import Holiday from "../Dashboard/Holiday/Holiday.js";
import moment from "moment";
export const SummaryDashbord = (props) => {
  let history = useHistory();
  const dispatch = useDispatch();
  const [altercount, setaltercount] = useState(0);
  const [overtimecount, setOvertimecount] = useState(0);
  const [restdayworkcount, setRestdayworkcount] = useState(0);
  const [changeschedulecount, setChangeschedulecount] = useState(0);
  const [myaltercount, setMyaltercount] = useState(0);
  const [myovertimecount, setMyOvertimecount] = useState(0);
  const [myrestdayworkcount, setMyRestdayworkcount] = useState(0);
  const [mychangeschedulecount, setMyChangeschedulecount] = useState(0);
  const [todayleaves, setTodayleaves] = useState([]);
  const [tommrowleaves, setTommrowleaves] = useState([]);
  const [taskcompletestatus, setTaskcompletestatus] = useState(false);
  const [taskcompletestatus1, setTaskcompletestatus1] = useState(false);
  const [holiday, setHoliday] = useState([]);
  useEffect(() => {
    var currentdate = moment().format("YYYY-MM-DD");
    var enddate = moment().format("YYYY") + '-12-31';

    // API CALL 
    dispatch(get_today_leaves(setTodayleaves));
    dispatch(get_tommrow_leaves(setTommrowleaves));
    dispatch(get_dashboard_holiday(setHoliday,currentdate,enddate));

    dispatch(
      fetchStatusNumbers_dashboard(
        setaltercount,
        setOvertimecount,
        setRestdayworkcount,
        setChangeschedulecount,
        setTaskcompletestatus
      )
    );

    dispatch(
      myfetchStatusNumbers_dashboard(
        setMyaltercount,
        setMyOvertimecount,
        setMyRestdayworkcount,
        setMyChangeschedulecount,
        setTaskcompletestatus1
      )
    );
    // alert(dashboard.alterrequest)
  }, []);
  const { dashboard } = props;

  const onHandelClick = async (e) => {
    await dispatch(eventclick("alteration"));
    history.push(global.links.my_team_all_requests);
  };

  const onHandelClick1 = async (e) => {
    await dispatch(eventclick("overtime"));
    history.push(global.links.my_team_all_requests);
  };

  const onHandelClick2 = async (e) => {
    await dispatch(eventclick("rest_day_work"));
    history.push(global.links.my_team_all_requests);
  };

  const onHandelClick3 = async (e) => {
    await dispatch(eventclick("change_schedule"));
    history.push(global.links.my_team_all_requests);
  };

  const onHandelClickmy = async (e) => {
    await dispatch(eventclick("alteration"));
    history.push(global.links.my_overall_request);
  };

  const onHandelClickmy1 = async (e) => {
    await dispatch(eventclick("overtime"));
    history.push(global.links.my_overall_request);
  };

  const onHandelClickmy2 = async (e) => {
    await dispatch(eventclick("rest_day_work"));
    history.push(global.links.my_overall_request);
  };

  const onHandelClickmy3 = async (e) => {
    await dispatch(eventclick("change_schedule"));
    history.push(global.links.my_overall_request);
  };

  return (
    <div className="main-card mt-4">
      <div class="card-list mt-4">
        <div class="row">
          <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
            <div class="card blue" style={{ borderRadius: "12px !important" }}>
              {/* <div class="title">My Request - Pending Request</div> */}
              <i className="zmdi fa fa-inbox" aria-hidden="true"></i>

              {/* <div class="value">
                {taskcompletestatus && taskcompletestatus1 ? (
                  <span>
                    <a className="request_count" onClick={onHandelClickmy}>
                      {myaltercount} 
                    </a>
                    <span> - </span>
                    <a className="request_count" onClick={onHandelClick}>
                      {altercount}
                    </a>
                  </span>
                ) : (
                  <PageLoadingCard />
                )}
              </div> */}
              <div class="row">
                <div class="col-sm-5">
                  <div class="row title">
                    <span>My Request</span>
                  </div>
                  {dashboard.myalterrequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClickmy}>
                        {dashboard.myalterrequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
                <div class="col-sm-5">
                  <div class="row title">
                    <span>Team Request</span>
                  </div>
                  {dashboard.alterrequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClick}>
                        {dashboard.alterrequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
              </div>

              <div class="stat">Alteration Pending Request</div>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
            <div class="card green">
              {/* <div class="title">My Request - Pending Request</div> */}
              <i className="zmdi fa fa-inbox" aria-hidden="true"></i>
              {/* <div class="value">
                {taskcompletestatus && taskcompletestatus1 ? (
                  <span>
                    <a className="request_count" onClick={onHandelClickmy1}>
                      {myovertimecount}
                    </a>
                    <span> - </span>
                    <a className="request_count" onClick={onHandelClick1}>
                      {overtimecount}
                    </a>
                  </span>
                ) : (
                  <PageLoadingCard />
                )} */}
              {/* </div> */}
              <div class="row">
                <div class="col-sm-5">
                  <div class="row title">
                    <span>My Request</span>
                  </div>
                  {dashboard.myovertimerequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClickmy1}>
                        {dashboard.myovertimerequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
                <div class="col-sm-5">
                  <div class="row title">
                    <span>Team Request</span>
                  </div>
                  {dashboard.overtimerequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClick1}>
                        {dashboard.overtimerequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
              </div>
              <div class="stat">OverTime Pending Request</div>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
            <div class="card orange">
              {/* <div class="title">My Request - Pending Request</div> */}
              <i className="zmdi fa fa-inbox" aria-hidden="true"></i>
              {/* <div class="value">
                {taskcompletestatus && taskcompletestatus1 ? (
                  <span>
                    <a className="request_count" onClick={onHandelClickmy2}>
                      {myrestdayworkcount}
                    </a>
                    <span> - </span>
                    <a className="request_count" onClick={onHandelClick2}>
                      {restdayworkcount}
                    </a>
                  </span>
                ) : (
                  <PageLoadingCard />
                )}
              </div> */}
              <div class="row">
                <div class="col-sm-5">
                  <div class="row title">
                    <span>My Request</span>
                  </div>
                  {dashboard.myrestdayrequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClickmy2}>
                        {dashboard.myrestdayrequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
                <div class="col-sm-5">
                  <div class="row title">
                    <span>Team Request</span>
                  </div>
                  {dashboard.restdayrequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClick2}>
                        {dashboard.restdayrequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
              </div>
              <div class="stat">RestdayWork Pending Request</div>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
            <div class="card red">
              {/* <div class="title">My Request - Pending Request</div> */}
              <i className="zmdi fa fa-inbox" aria-hidden="true"></i>
              {/* <div class="value">
                {taskcompletestatus && taskcompletestatus1 ? (
                  <span>
                    <a className="request_count" onClick={onHandelClickmy3}>
                      {mychangeschedulecount}
                    </a>
                    <span> - </span>
                    <a className="request_count" onClick={onHandelClick3}>
                      {changeschedulecount}
                    </a>
                  </span>
                ) : (
                  <PageLoadingCard />
                )}
              </div> */}
              <div class="row">
                <div class="col-sm-5">
                  <div class="row title">
                    <span>My Request</span>
                  </div>
                  {dashboard.mychangeschedulerequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClickmy3}>
                        {dashboard.mychangeschedulerequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
                <div class="col-sm-5">
                  <div class="row title">
                    <span>Team Request</span>
                  </div>
                  {dashboard.changeschedulerequest !== null ? (
                    <div class="row value">
                      <a className="request_count" onClick={onHandelClick3}>
                        {dashboard.changeschedulerequest}
                      </a>
                    </div>
                  ) : (
                    <PageLoadingCard />
                  )}
                </div>
              </div>
              <div class="stat">ChangeSchedule Pending Request</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row celebration">
        {/* <div class="col-12 col-md-6 col-lg-6 col-xl-6 mb-4">
          <Card className="cardstyle">
            <div className="div-content">
              <span>
                <i class="fa fa-birthday-cake" aria-hidden="true"></i>{" "}
                Celebrations
              </span>
            </div>
            <BirthdayAnniversary />
          </Card>
        </div> */}
        <div class="col-12 col-md-6 col-lg-6 col-xl-6 mb-4">
          <Card className="cardstyle">
            {/* <Card.Header>
              <i class="fa fa-calendar" aria-hidden="true"></i> Who's Out
            </Card.Header> */}
            {/* <Card.Body> */}
            <div className="div-content">
              <span>
                <i class="fa fa-calendar" aria-hidden="true"></i> Who's Out
              </span>
            </div>
            <Tabs
              defaultActiveKey="home"
              id="uncontrolled-tab-example"
              className="mb-1 tabstyle pt-3"
            >
              <Tab eventKey="home" title={"Today ("+dashboard.todayleaves.length +")"}>
                <div className="content-table bdr0">
                  <Table striped bordered hover>
                    <tr>
                      <td className="today_count">
                        <span>Today ({dashboard.todayleaves.length})</span>
                      </td>
                    </tr>

                    <tbody>
                      {dashboard.todayleaves ? (
                        dashboard.todayleaves.map((data, pos) => (
                          <tr>
                            <td>
                              {data.user_name} <br></br>
                              <span className="leave_type">{data.type}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <div className="celebration_notfound">
                          No Leaves Found
                        </div>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Tab>
              <Tab eventKey="profile" title={"Tommorow (" +dashboard.tommorowleaves.length +")" }>
                <div className="content-table bdr0">
                  <Table striped bordered hover>
                    <tr>
                      <td className="today_count">
                        <span>
                          Tommorow ({dashboard.tommorowleaves.length})
                        </span>
                      </td>
                    </tr>

                    <tbody>
                      {dashboard.tommorowleaves ? (
                        dashboard.tommorowleaves.map((data, pos) => (
                          <tr>
                            <td>
                              {data.user_name} <br></br>
                              <span className="leave_type">{data.type}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <div className="celebration_notfound">
                          No Leaves Found
                        </div>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Tab>
            </Tabs>
            {/* </Card.Body> */}
          </Card>
        </div>
        <div class="col-12 col-md-6 col-lg-6 col-xl-6 mb-4">
          <Card className="cardstyle">
            {/* <Card.Header>
              <i class="fa fa-calendar" aria-hidden="true"></i> Who's Out
            </Card.Header> */}
            {/* <Card.Body> */}
            <div className="div-content">
              <span>
                <i class="fa fa-calendar" aria-hidden="true"></i> Holidays
              </span>
            </div>
            <div className="content-table bdr0">
                  <Table striped bordered hover>
                    
                    <tbody>
                      {dashboard.dashboardholiday.length > 0 ? (
                        dashboard.dashboardholiday.map((data, pos) => (
                          <tr>
                            <td>
                              {data.name} <br></br>
                              <span className="leave_type">{data.start}</span>
                              {/* <span className="leave_type">{format(Date.parse(data.date), "yyyy-MM-dd")}</span> */}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <div className="holiday_notfound">
                          No Holidays Found
                        </div>
                      )}
                    </tbody>
                  </Table>
                </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
const mapStateToProps = (state) => {
  return {
    overrallstatusNumbers: state.myTeamRequestList.overrallstatusNumbers,
    dashboard: state.dashboard,
  };
};

export default connect(mapStateToProps)(SummaryDashbord);
