import React, { useState, useEffect} from "react"
import { connect, useDispatch } from 'react-redux';
import Wrapper from "../Template/Wrapper"
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import { Button, Table } from "react-bootstrap"
import NeoReportStyles from "./NeoReportStyles.css";
import moment from 'moment';
import { fetchNeoOnboardingUsers, sendNeoOnboardingLink } from '../../store/actions/neo/neoActions';

const NeoOnboarding = ( props ) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // call api to get list of newly onboarded employees
    dispatch(fetchNeoOnboardingUsers(props.user.country));
  }, []);

  const handleSendLink = (guid) => {
    // call api to send the neo link to the user
    dispatch(sendNeoOnboardingLink(guid, props.user.id, props.user.country));

    // Refresh the onboarding list
    dispatch(fetchNeoOnboardingUsers(props.user.country));
  }

  return (
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <Content>
            <h2 className="page-title" style={{ marginLeft: "0"}}>NEO Onboarding List</h2>

            <div className="neo-report-table">
              <div className="mt-4 mb-3">
                {props.onboarding && props.onboarding.length <= 0 ? (
                  <h3>No results found</h3>
                ) : (
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>BHR No</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Hire Date</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.onboarding !== undefined && props.onboarding.map((user, key) => (
                        <tr key={key}>
                          <td>{user.bhrNumber}</td>
                          <td>{user.firstName} {user.middleName} {user.lastName}</td>
                          <td>{user.email}</td>
                          <td>{user.department}</td>
                          <td>{user.dateHired ? moment( user.dateHired ).format("MMM DD, YYYY") : null}</td>
                          <td style={{ textAlign: "center" }}>
                            <Button type="submit" className="btn btn-primary-2" onClick={() => handleSendLink(user.userGuid)}><i className="fa fa-paper-plane" aria-hidden="true"></i>&nbsp;Send Link</Button>
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
    onboarding: state.neo.neo_onboarding
  }
}

export default connect(mapStateToProps)(NeoOnboarding)