import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Table } from 'react-bootstrap';
import moment from 'moment';
import Validator from "../../../services/Validator.js";
import "./HRTeamAttendanceSummaryPanel.css";
import { connect } from 'react-redux'
import { setSelectedAttendanceSummary } from "../../../store/actions/report/reportActions";
import Authenticator from "../../../services/Authenticator";

const HRTeamAttendanceSummaryPanel = (props) => {

  const { team_attendance_summary } = props;
  const { scheduled_employees,
    attendance,
    unplanned_leaves,
    planned_leaves,
    total_rest_day_work,
    total_overtime,
    dtr_collection,
    total_headcount } = team_attendance_summary;
  const selected_summary = props.selected_summary
  const scope_type = props.scope_type

  let show_list = props.show_list ?? true;

  return <div className="summary-report">
    <div className="summary-wrapper">
      <div className="total-headcount-container">
        <div>
          <span>{total_headcount}</span> <br />
          <label >Total Headcount</label>
        </div>
      </div>
      <div className="computed-summary-container">
        <div hidden={scope_type != 'day' ? true : false} className={selected_summary == "scheduled_employees" ? "summary-active" : "summary-inactive"}
          onClick={() => {
            props.setSelectedAttendanceSummary("scheduled_employees")
          }}>
          <label className={selected_summary == "scheduled_employees" ? "active-text font-weight-bolder" : ""} >Scheduled Headcount</label><br />
          <span>{scheduled_employees?.total_count}</span>
          {/* &nbsp;<small>({scheduled_employees?.total_count})</small> <br /> */}
          {/* <div className="target"><small>TARGET: {scheduled_employees?.target_percentage}%</small></div> */}
        </div>
        <div className={selected_summary == "attendance" ? "summary-active" : "summary-inactive"}
          onClick={() => {
            props.setSelectedAttendanceSummary("attendance")
          }}>
          <label className={selected_summary == "attendance" ? "active-text font-weight-bolder" : ""}
          >Recorded Attendance</label><br />
          <span className={(attendance?.total_percentage >= attendance?.target_percentage ? "green" : "red")}>{attendance?.total_percentage}%</span>&nbsp;<small>({attendance?.total_count})</small> <br />
          <div className="target"><small>TARGET: {attendance?.target_percentage}%</small></div>
        </div>

        <div className={selected_summary == "planned_leaves" ? "summary-active" : "summary-inactive"}
          onClick={() => {
            props.setSelectedAttendanceSummary("planned_leaves")
          }}>
          <label className={selected_summary == "planned_leaves" ? "active-text font-weight-bolder" : ""}>Recorded Planned Leaves</label><br />
          <span className={(planned_leaves?.total_percentage <= planned_leaves?.target_percentage ? "green" : "red")}>{planned_leaves?.total_percentage}%</span>&nbsp;<small>({planned_leaves?.total_count})</small> <br />
          <div className="target"><small>TARGET: {planned_leaves?.target_percentage}%</small></div>
        </div>

        <div className={selected_summary == "unplanned_leaves" ? "summary-active" : "summary-inactive"}
          onClick={() => {
            props.setSelectedAttendanceSummary("unplanned_leaves")
          }}>
          <label className={selected_summary == "unplanned_leaves" ? "active-text font-weight-bolder" : ""}
          >Recorded Unplanned Leaves</label><br />
          <span className={(unplanned_leaves?.total_percentage <= unplanned_leaves?.target_percentage ? "green" : "red")}>{unplanned_leaves?.total_percentage}%</span>&nbsp;<small>({unplanned_leaves?.total_count})</small> <br />
          <div className="target"><small>TARGET: {unplanned_leaves?.target_percentage}%</small></div>
        </div>

      </div>
      <div className="computed-payroll-items-container">
        <div className={selected_summary == "total_rest_day_work" ? "summary-active" : "summary-inactive"}
          onClick={() => {
            props.setSelectedAttendanceSummary("total_rest_day_work")
          }}>
          <label className={selected_summary == "total_rest_day_work" ? "active-text font-weight-bolder" : ""}>Rest Day Work</label><br />
          <span>{total_rest_day_work?.total_hours}</span>&nbsp;<small>({total_rest_day_work?.total_count})</small> <br />
        </div>
        <div className={selected_summary == "total_overtime" ? "summary-active" : "summary-inactive"}
          onClick={() => {
            props.setSelectedAttendanceSummary("total_overtime")
          }}>
          <label className={selected_summary == "total_overtime" ? "active-text font-weight-bolder" : ""}>Overtime</label><br />
          <span>{total_overtime?.total_hours}</span>&nbsp;<small>({total_overtime?.total_count})</small> <br />
        </div>
      </div>
    </div>
    <br />
    {show_list == true && team_attendance_summary[selected_summary]?.users?.length > 0 &&
      <div className="dtr-list">
        <Table bordered hover>
          <thead>
            <tr>
              <th className="name">Name</th>
              <th className="name">Employee Number</th>
              <th className="job-title">Job Title</th>
              <th className="date">Date</th>
              <th className="status">Status</th>
            </tr>
          </thead>
          <tbody>
            {team_attendance_summary[selected_summary].users?.map(function (item) {

              return (
                <tr >
                  
                  <td><Link to={Authenticator.scanLevel("HR")? global.links.dtr + item.user_id : global.links.profile + item.user_id}>{item.name} </Link> </td>
                  <td>{item.emp_num}</td>
                  <td>{item.job_title}</td>
                  <td>{moment(item.date).format("MMM D")}</td>
                  <td className={"status " + item.status.replace(/\s+/g, '-').toLowerCase()}>
                    {item.status} {Validator.isValid(item.hours) && "(" + item.hours + ")"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </div>
    }
  </div>

}

const mapStateToProps = (state) => {
  return {}
}

const mapDispatchToProps = (dispatch) => {
  return {
    setSelectedAttendanceSummary: (data) => dispatch(setSelectedAttendanceSummary(data))
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(HRTeamAttendanceSummaryPanel);