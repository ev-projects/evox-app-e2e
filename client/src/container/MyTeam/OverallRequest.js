import React, { useState, useEffect } from "react";
import {
  Container,
  Col,
  Tabs,
  Tab,
  Badge,
  Table,
  Button,
  Pagination,
  FormControl,
  Row,
  ToggleButton,
  ButtonGroup,
} from "react-bootstrap";
import { format } from "date-fns";
import { connect, dispatch } from "react-redux";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
} from "../../components/GridComponent/AdminLte.js";
import { Link } from "react-router-dom";
import Validator from "../../services/Validator";
const OverallRequest = (props) => {
  const { user } = props;
  const { payrollcut } = props;
  const [startdate, setStartdate] = useState();
  const [enddate, setEnddate] = useState();

  useEffect(() => {
    // Get Payroll cutoff Start Date And End Date and Assign to the Date Field
    setStartdate(payrollcut &&  format(Date.parse(payrollcut.start_date),'yyyy-MM-dd'));
    setEnddate(payrollcut &&  format(Date.parse(payrollcut.end_date),'yyyy-MM-dd')); 
  }, []);
  return (
    <>
      <ContainerWrapper>
        <ContainerBody>
          <Content label="Create Room">
            <Row className="date-range">
              <Col xs={3}>
                <label>Date Range:</label>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col xs={2}>
              <input
                  type="date"
                  className="form-control"
                  value={startdate}
                  onChange={(e) => {
                    setStartdate(e.target.value);
                  }}
                />
              </Col>
              <Col xs={2}>
                <input
                  type="date"
                  className="form-control"
                  value={enddate}
                  onChange={(e) => {
                    setEnddate(e.target.value);
                  }}
                />
              </Col>
              <Col className="dept">
                <div className="form-group ">
                  <select
                    className="form-control"
                    name="department_id"
                    style={{ display: "block" }}
                  >
                    <option label="- Department -" />
                    {user.departments_handled.map(function (item) {
                      return (
                        <option value={item.id} label={item.department_name} />
                      );
                    })}
                  </select>
                </div>
              </Col>
              <Col className="search-name">
                <div className="form-group">
                  <input
                    type="textfield"
                    className="form-control"
                    variant="primary"
                    placeholder="Enter name"
                    name="name"
                  />
                </div>
              </Col>
              <Col className="filter-button filterbtn">
                <Button variant="primary" type="button">
                  <i className="fa fa-filter" /> Filter
                </Button>
              </Col>
              <Col className="filter-button">
                <Button variant="primary" type="button">
                  <i className="fa fa-filter" /> Reset
                </Button>
              </Col>
            </Row>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Empno</th>
                  <th>Name</th>
                  <th>Type of Request</th>
                  <th>Status</th>
                  <th>Approverd By</th>
                  <th>created at</th>
                  <th>updated at</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="request_list">
                {/* {request_list.data.map(function(item){ */}
                {/* return    */}
                <tr>
                  <td>1</td>
                  <td> <b>{3537}</b></td>
                  <td>
                    <b>{"Lakshmanaswamy S"}</b>
                    {/* <br />{" "}
                    <small style={{ fontSize: "100%" }}>
                      {""}
                    </small> */}
                  </td>
                  <td>Alter Log</td>
                  <td className="status">
                    <div className={"Pending"}>
                      <Status status={"Pending"} />
                    </div>
                  </td>
                  <td>Dummy Manager</td>
                  <td>2023-06-02 13:20:00</td>
                  <td>2023-06-02 13:20:00</td>
                  <td>
                    <Link
                      to={{
                        pathname: global.links.overallrequest,
                        resetInitialState: true,
                      }}
                      title="View Location Details"
                    >
                      <i className="fa fa-eye ev-color" aria-hidden="true"></i>
                    </Link>{" "}
                  </td>
                </tr>
                {/* })} */}
              </tbody>
            </Table>
          </Content>
        </ContainerBody>
      </ContainerWrapper>

      {/* <Paginate pagination={request_list} /> */}
    </>
  );
};

const Status = (props) => {
  let pagination = [];
  switch (props.status) {
    case "Pending":
      pagination.push(
        <Badge variant="secondary">
          <span></span>
          {props.status}
        </Badge>
      );
      break;
    case "Canceled":
      pagination.push(
        <Badge variant="dark">
          <span></span>
          {props.status}
        </Badge>
      );
      break;
    case "Approved":
      pagination.push(
        <Badge variant="success">
          <span></span>
          {props.status}
        </Badge>
      );
      break;
    case "Declined":
      pagination.push(
        <Badge variant="danger">
          <span></span>
          {props.status}
        </Badge>
      );
      break;
  }
  return pagination;
};

const mapStateToProps = (state) => {
  return {
    user: state.user,
    myTeamList: state.myTeamList,
    settings: state.settings,
    payrollcut:state.settings.current_payroll_cutoff
  };
};

export default connect(mapStateToProps)(OverallRequest);
