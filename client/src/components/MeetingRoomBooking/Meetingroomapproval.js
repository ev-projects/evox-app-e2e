import React, { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
  Row,
  Col,
} from "../../components/GridComponent/AdminLte.js";
import axios from "axios";
import { useParams, useHistory } from "react-router-dom";
import { connect, dispatch } from "react-redux";
import PreLoader from "./PreLoader.js";
import { useDispatch } from "react-redux";
import { fecthBookedroomdetails, updateApprovalstatus } from "./Meetingroomrequestapi.js";
const Meetingroomapproval = (props) => {
  const [loader, setLoader] = useState(false);
  let history = useHistory();
  // const { id } = props.params.id;
  //   const [locationname, setLocationname] = useState("");
  const [roomname, setRoomname] = useState("");
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [note, setNote] = useState("");
  const [approvalnote, setApprovalnote] = useState("");
  const [userid, setUserid] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [validateapproval, setValidateapproval] = useState(false);

  const dispatch = useDispatch();
  useEffect(() => {
   
    if ( props.params.id !== "0") {
     dispatch(fecthBookedroomdetails(props.params.id,setRoomname,setStartdate,setEnddate,setNote,setUsername,setUserid,setStatus))
    }
  }, []);

  const { user } = props;
  const handleupdatestatus = async (evetstatus) => {
    
    await dispatch(updateApprovalstatus(props.params.id,evetstatus,approvalnote,userid,startdate,enddate,setValidateapproval))
    history.push(global.links.booked_list);
  };

  return (
    <div>
      {loader && <PreLoader />}
      <ContainerWrapper>
        <ContainerBody>
          <Content col="6" label="Create Room">
            <h3>{roomname}</h3>
            <div>
              <h5>Created By: {username}</h5>
            </div>
            <form>
              <Row>
                <Col size="6">
                  <div className="form-group">
                    <label>Start Date:</label>
                    <input
                      type="text"
                      placeholder="Room Name"
                      className="form-control"
                      value={startdate}
                      disabled
                    ></input>
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label>End Date:</label>
                    <input
                      type="text"
                      placeholder="Enter Location"
                      className="form-control"
                      value={enddate}
                      disabled
                    ></input>
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label>Note:</label>
                    <p>{note}</p>
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label>Approval Note</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="approvalnote"
                      placeholder="Enter Approval Note..."
                      onChange={(e) => {
                        setApprovalnote(e.target.value);
                      }}
                    ></textarea>
                    {validateapproval && (
                      <label style={{ color: "red" }}>
                        Please Enter Approval Note
                      </label>
                    )}
                  </div>
                </Col>
              </Row>
              <div className="row" style={{marginLeft:"20px !important", marginRight:"10px !important"}}>
                <div className="col-4">
                {status == "pending" && (
                    <Button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleupdatestatus(1)}
                    >
                      <i className="fa fa-thumbs-up" /> Approved
                    </Button>
                  )}
                </div>
                <div className="col-3">
                <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleupdatestatus(2)}
                    style={{ backgroundColor: "#dc3545 !important"}}
                  >
                    <i className="fa fa-thumbs-down" /> Deny
                  </button>
                </div>
              </div>
               
            </form>
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    user: state.user,
    myTeamList: state.myTeamList,
  };
};

export default connect(mapStateToProps)(Meetingroomapproval);
