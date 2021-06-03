import React, { Component } from "react"; 
import { Link } from "react-router-dom";
import {Table } from 'react-bootstrap';
import moment from 'moment';
import Validator from "../../../services/Validator.js";
import "./TeamAttendanceSummaryPanel.css";

const TeamAttendanceSummaryPanel = (props) => {
  
  const { team_attendance_summary } = props;
  
return <div className="summary-report">
        <div className="summary-wrapper">
          <div className="total-headcount-container">
            <div>
              <span>{team_attendance_summary.total_headcount}</span> <br/> 
              <label>Total Headcount</label>
            </div>
          </div>
          <div className="computed-summary-container">
            <div>
              <label>Scheduled Headcount</label>
              <span className="green">{team_attendance_summary.scheduled_employees?.total_percentage}%</span>&nbsp;<small>({team_attendance_summary.scheduled_employees?.total_count})</small> 
              <div className="target"><small>TARGET: {team_attendance_summary.scheduled_employees?.target_percentage}%</small></div>
            </div>
            <div>
              <label>Unplanned Leaves</label>
              <span className="red">{team_attendance_summary.unplanned_leaves?.total_percentage}%</span>&nbsp;<small>({team_attendance_summary.unplanned_leaves?.total_count})</small> 
              <div className="target"><small>TARGET: {team_attendance_summary.unplanned_leaves?.target_percentage} %</small></div>
            </div>
            <div>
              <label>Planned Leaves</label>
              <span className="red">{team_attendance_summary.planned_leaves?.total_percentage}%</span>&nbsp;<small>({team_attendance_summary.planned_leaves?.total_count})</small> 
              <div className="target"><small>TARGET: {team_attendance_summary.planned_leaves?.target_percentage} %</small></div>
            </div>
          </div>
          <div className="computed-payroll-items-container">
            <div>
              <label>Rest Day Work</label>
              <span>{team_attendance_summary.total_rest_day_work?.total_hours}</span>&nbsp;<small>({team_attendance_summary.total_rest_day_work?.total_count})</small> <br/> 

            </div>
            <div>
              <label>Overtime</label>
              <span>{team_attendance_summary.total_overtime?.total_hours}</span>&nbsp;<small>({team_attendance_summary.total_overtime?.total_count})</small> <br/> 
            </div>
          </div>
          </div>
          <br /><br />
          {team_attendance_summary?.dtr_collection.length > 0 &&
              <div className="dtr-list">
              <Table bordered hover>
                <thead>
                  <tr>
                    <th className="name">Name</th>
                    <th className="job-title">Job Title</th>
                    <th className="date">Date</th>
                    <th className="status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {team_attendance_summary?.dtr_collection.map(function(item){
                      
                      return (
                      <tr>
                          <td><Link to={ global.links.profile + item.user_id  }>{item.name} </Link> </td>
                          <td>{item.job_title}</td>
                          <td>{moment( item.date ).format("MMM D")}</td>
                          <td className={"status " + item.status.replace(/\s+/g, '-').toLowerCase()}>
                            {item.status} {Validator.isValid( item.hours ) && "("+item.hours+")" }
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


export default TeamAttendanceSummaryPanel;