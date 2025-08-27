import React, { useState, useEffect} from "react"
import { useDispatch } from 'react-redux';
import Wrapper from "../Template/Wrapper"
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import { Button, Table } from "react-bootstrap"
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import NeoReportStyles from "./NeoReportStyles.css";
import moment from 'moment';

const NeoOnboarding = ({ user }) => {
  const [onboarding, setOnboarding] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    // call .net api to get list of newly onboarded employees
    getNeoOnboardingUsers();
  }, []);

  const getNeoOnboardingUsers = async() => {
    await API.call({
      method: "get",
      url: "/get_neo_onboarding_users/",
      params: {
        country: user.country
      }
    })
    .then((result) => {
      if (result.status === 200) {
        setOnboarding(result.data.data.users);
      }
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
  }

  const sendLink = async(guid) => {
    await API.call({
      method: "post",
      url: "/send_onboarding_link/",
      params: {
        guid: guid,
        user_id: user.id,
        country: user.country
      }
    })
    .then((result) => {
      if (result.status === 200) {
        dispatch(Formatter.alert_success(result, 3000));

        // Refresh the onboarding list
        getNeoOnboardingUsers();
      }
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
  }

  const handleSendLink = (guid) => {
    // call api to send the neo link to the user
    sendLink(guid);
  }

  return (
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <Content>
            <h2 className="page-title" style={{ marginLeft: "0"}}>NEO Onboarding List</h2>

            <div className="neo-report-table">
              <div className="mt-4 mb-3">
                {onboarding && onboarding.length <= 0 ? (
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
                      {onboarding.map((user, key) => (
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

export default NeoOnboarding