import React, { useState, useEffect } from "react"
import { connect, useDispatch } from 'react-redux';
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table } from "react-bootstrap"
import { Link } from "react-router-dom"
import moment from 'moment';
import { fetchNeoSubmissionUsers } from '../../store/actions/neo/neoActions';

const NeoSubmissions = ( props ) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // call .net api to get list of newly onboarded employees
    dispatch(fetchNeoSubmissionUsers(props.user.country));
  }, []);

  return (
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <Content>
            <h2 className="page-title" style={{ marginLeft: "0"}}>NEO Submission Report</h2>

            <div className="neo-report-table">
              <div className="mt-4 mb-3">
                {props.submissions && props.submissions.length <= 0 ? (
                  <h3>No results found</h3>
                ) : (
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>BHR No</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Days Pending</th>
                        <th>First Submission</th>
                        <th>Latest Submission</th>
                        <th>Pending Fields</th>
                        <th>Resubmission Fields</th>
                        <th>Uploaded Files</th>
                        <th>Status</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.submissions !== undefined && props.submissions.map((user) => (
                        <tr>
                          <td>{user.bhrNumber}</td>
                          <td>{user.userName}</td>
                          <td>{user.email}</td>
                          <td>{user.daysPending}</td>
                          <td>{user.firstSubmittedAt ? moment( user.firstSubmittedAt ).format("MMM DD, YYYY") : null}</td>
                          <td>{user.latestSubmittedAt ? moment( user.latestSubmittedAt ).format("MMM DD, YYYY") : null}</td>
                          <td>{user.pendingFields}</td>
                          <td>{user.resubmissionFields}</td>
                          <td>{user.uploadedFiles}</td>
                          <td>{user.status}</td>
                          <td style={{ textAlign: "center" }}>
                            <Link to={{ pathname: global.links.neo_report_submissions + user.userGuid, resetInitialState: true }} title="View NEO Submissions">
                              <i className="fa fa-eye ev-color" aria-hidden="true"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </div>
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
  )
}

const mapStateToProps = (state) => {
  return {
    user: state.user,
    submissions: state.neo.neo_submissions
  }
}

export default connect(mapStateToProps)(NeoSubmissions)