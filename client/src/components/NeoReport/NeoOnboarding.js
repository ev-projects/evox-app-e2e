import React, { useState, useEffect} from "react"
import { useDispatch } from 'react-redux';
import Wrapper from "../Template/Wrapper"
import { ContainerBody, ContainerWrapper } from "../GridComponent/AdminLte"
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
        user_id: user.id
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
          <h2 className="page-title">NEO Onboarding List</h2>

          <div className="content-table neo-report-table">
            <div className="mt-4 mb-3">
              {onboarding && onboarding.length <= 0 ? (
                <h3>No results found</h3>
              ) : (
                <Table striped bordered hover tableheader>
                  <thead>
                    <tr>
                      <th className="tableheader">BHR No</th>
                      <th className="tableheader">Employee No</th>
                      <th className="tableheader">Name</th>
                      <th className="tableheader">Job Title</th>
                      <th className="tableheader">Email</th>
                      <th className="tableheader">Hire Date</th>
                      <th className="tableheader" style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboarding.map((user, key) => (
                      <tr key={key}>
                        <td>{user.bhrNumber}</td>
                        <td>{user.emp_num ?? <span className="tba-label">To be assigned</span>}</td>
                        <td>{user.firstName} {user.middleName} {user.lastName}</td>
                        <td>{user.job_title ?? <span className="tba-label">To be assigned</span>}</td>
                        <td>{user.email}</td>
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
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
  )
}

export default NeoOnboarding