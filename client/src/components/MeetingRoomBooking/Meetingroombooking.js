import React, { useState, useEffect } from "react";
import {
  Table,
  Col,
  Form,
  Badge,
  Button,
  Row,
  ToggleButton,
  ButtonGroup,
} from "react-bootstrap";
import Pagination from "react-bootstrap-4-pagination";
import "./MeetingRoom.css";
import { Link } from "react-router-dom";
import Authenticator from "../../services/Authenticator";
import axios from "axios";
import {
  ContainerWrapper,
  ContainerBody,
  Content,
} from "../../components/GridComponent/AdminLte.js";
import {
  InputDate,
  InputTime,
} from "../../components/DatePickerComponent/DatePicker.js";
import PreLoader from "./PreLoader";
import { useDispatch } from "react-redux";
import {
  filterClick,
  requestPagenationclick,
  statusChange,
  viewBookingdetails,
} from "./MeetingApprovalapi";
const Meetingroombooking = () => {
  const dispatch = useDispatch();
  const [bookedlist, setBookedlist] = useState([]);
  const [totalpagecount, setTotalpagecount] = useState(1);
  const [currentpagecount, setCurrentpagecount] = useState(1);
  const [statuscount, setStatuscount] = useState([]);
  const [status, setStatus] = useState("All");
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [loader, setLoader] = useState(false);
  useEffect(() => {
    dispatch(
      viewBookingdetails(
        setBookedlist,
        setTotalpagecount,
        setCurrentpagecount,
        setStatuscount
      )
    );
  }, []);

  let paginationConfig = {
    totalPages: totalpagecount,
    currentPage: currentpagecount,
    showMax: 10,
    size: "sm",
    threeDots: true,
    prevNext: true,
    borderColor: "#0097a7",
    activeBorderColor: "#0097a7",
    activeBgColor: "#0097a7",
    disabledBgColor: "white",
    activeColor: "white",
    color: "white",
    disabledColor: "white",
    // circle: true,
    // shadow: true,
    onClick: function (page) {
      console.log(page);
      setCurrentpagecount(page);
      dispatch(
        requestPagenationclick(
          status,
          page,
          fromdate,
          todate,
          setBookedlist,
          setTotalpagecount
        )
      );
    },
  };

  const handlefilterclick = () => {
    dispatch(
      filterClick(
        status,
        fromdate,
        todate,
        setBookedlist,
        setTotalpagecount,
        setStatuscount
      )
    );
  };

  const handleclearfilterclick = () => {
    setFromdate("");
    setTodate("");
    dispatch(
      viewBookingdetails(
        setBookedlist,
        setTotalpagecount,
        setCurrentpagecount,
        setStatuscount
      )
    );
  };

  const Capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handlestatuschange = (status) => {
    dispatch(
      statusChange(
        status,
        setBookedlist,
        setTotalpagecount,
        setStatus,
        fromdate,
        todate,
        setStatuscount
      )
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

  return (
    <div>
      {loader && <PreLoader />}

      <ContainerWrapper>
        <ContainerBody>
          <Content label="Create Room">
            <h2 className="page-title">Meeting Room Request</h2>

            <ButtonGroup toggle className="mb-2 myrequests">
              <ToggleButton
                type="checkbox"
                variant="secondary"
                className="request_list_btn"
                checked={status == "All"}
                // checked={status=null}
                onClick={() => {
                  handlestatuschange("All");
                }}
              >
                <i
                  class="fa fa-circle request_i request_list_i-cancelled"
                  aria-hidden="true"
                ></i>
                All Status &nbsp;
                <Badge className="counter-request" variant="light">
                  {statuscount.All}
                </Badge>
                {/* <Badge variant="light">{statuscount.All}</Badge>
                &nbsp;All Status */}
              </ToggleButton>
            </ButtonGroup>
            <ButtonGroup toggle className="mb-2 myrequests">
              <ToggleButton
                type="checkbox"
                variant="secondary"
                className="request_list_btn"
                checked={status=="pending"}
                onClick={() => {
                  handlestatuschange("pending");
                }}
              >
                <i
                  class="fa fa-circle request_i request_list_i-pending"
                  aria-hidden="true"
                ></i>
                pending &nbsp;
                <Badge className="counter-request" variant="light">
                  {statuscount.pending}
                </Badge>
                {/* <Badge className="pending" variant="light">
                  {statuscount.pending}
                </Badge>
                &nbsp;Pending */}
              </ToggleButton>
            </ButtonGroup>
            <ButtonGroup toggle className="mb-2 myrequests">
              <ToggleButton
                type="checkbox"
                variant="secondary"
                className="request_list_btn"
                checked={status=="approved"}
                onClick={() => {
                  handlestatuschange("approved");
                }}
              >
                <i
                  class="fa fa-circle request_i request_list_i-approved"
                  aria-hidden="true"
                ></i>
                Approved &nbsp;
                <Badge className="counter-request" variant="light">
                  {statuscount.approved}
                </Badge>
                {/* <Badge className="approved" variant="light">
                  {statuscount.approved}
                </Badge>
                &nbsp;Approved */}
              </ToggleButton>
            </ButtonGroup>

            <ButtonGroup toggle className="mb-2 myrequests">
              <ToggleButton
                type="checkbox"
                variant="secondary"
                className="request_list_btn"
                checked={status=="declined"}
                onClick={() => {
                  handlestatuschange("declined");
                }}
              >
                <i
                  class="fa fa-circle request_i request_list_i-declined"
                  aria-hidden="true"
                ></i>
                Declined &nbsp;
                <Badge className="counter-request" variant="light">
                  {statuscount.declined}
                </Badge>
                {/* <Badge className="denied" variant="light">
                  {statuscount.declined}
                </Badge>
                &nbsp;Declined */}
              </ToggleButton>
            </ButtonGroup>
            <Row className="date-range">
              <Col xs={3}>
                <label>Date Range:</label>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col xs={3}>
                <input
                  type="date"
                  className="form-control"
                  value={fromdate}
                  onChange={(e) => {
                    setFromdate(e.target.value);
                  }}
                />
              </Col>
              <Col xs={3}>
                <input
                  type="date"
                  className="form-control"
                  value={todate}
                  onChange={(e) => {
                    setTodate(e.target.value);
                  }}
                />
              </Col>
              <Col className="filter-button filterbtn">
                <Button
                  variant="primary"
                  type="button"
                  onClick={handlefilterclick}
                >
                  <i className="fa fa-filter" /> Filter
                </Button>
              </Col>
              <Col className="filter-button">
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleclearfilterclick}
                >
                  <i className="fa fa-filter" /> Reset
                </Button>
              </Col>
            </Row>
            {/* <MyTeamListFilter pagenation={pagenation} bookedlist={bookedlist}/> */}
            <div className="mt-4 mb-3">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Sno</th>
                    <th>RoomName</th>
                    <th>StartDate</th>
                    <th>EndDate</th>
                    <th>TotalHours</th>
                    <th>Created By</th>
                    <th>Status</th>
                    <th>Approved By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookedlist.map((room, pos) => (
                    <tr>
                      {/* <td>   <Form.Check
                      type="checkbox"
                      value={room.id}
                      onChange={(e) => {
                      //  alert(e.target.value);

                      }}
                    /></td> */}
                      <td>{pos + 1}</td>
                      <td>{room.name}</td>
                      <td>{room.start_date}</td>
                      <td>{room.end_date}</td>
                      <td>{room.total_hours} </td>
                      <td>{room.created_by} </td>
                      <td>
                        <Status status={Capitalize(room.status)} />
                      </td>
                      <td>{room.approved_by} </td>

                      <td className="actions">
                        <span>
                          <Link
                            to={{
                              pathname:
                                global.links.meetingroom_approval + room.id,
                              resetInitialState: true,
                            }}
                            title="View Booked Details"
                          >
                            <i
                              className="fa fa-eye ev-color"
                              aria-hidden="true"
                            ></i>
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
             

              {/* <p>{props.pagenation}</p> */}
            </div>
            <Pagination {...paginationConfig} />
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </div>
  );
};

export default Meetingroombooking;
