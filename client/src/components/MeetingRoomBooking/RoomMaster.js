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
import { useParams, useLocation, useHistory } from "react-router-dom";
import LoaderContainer from "../Template/LoaderContainer/LoaderContainer.js";
import PreLoader from "./PreLoader.js";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { CreateMasterroom, deleteRoomdetails, drpdownLocationlist, fecthRoomdetails, updatedRoomdetails } from "./Createroomapi.js";
import { useDispatch } from "react-redux";
const RoomMaster = (props) => {
  // const { id } = useParams();
  const [name, setRoomname] = useState("");
  const [location, setLocation] = useState("");
  const [seat, setSeats] = useState("");
  const [description, setdescription] = useState("");
  const [validroomname, setvalidroomname] = useState(false);
  const [validlocation, setvalidlocation] = useState(false);
  const [validseat, setvalidseat] = useState(false);
  const [datalocation, setDatalocation] = useState([]);
  const [loader, setLoader] = useState(false);
  let history = useHistory();
  const dispatch = useDispatch();
  // const locations = useLocation();
  // const navigation = useNavigation();
  useEffect(() => {
    if (props.params.id !== "0") {
        dispatch(fecthRoomdetails(props.params.id,setRoomname,setLocation,setdescription,setSeats));
    }
    dispatch(drpdownLocationlist(setDatalocation));
  }, []);

  const handledelete = async (e) => {
   
    await dispatch(deleteRoomdetails(props.params.id));
    setTimeout(function() {
      history.push(global.links.room_list);
  }, 2000);
   
   
   
  };



  const handlesave = async (e) => {

    await dispatch(CreateMasterroom(name,location,seat,description,setvalidroomname,setvalidlocation,setvalidseat));
    setTimeout(function() {
      history.push(global.links.room_list);
  }, 2000);
    
  };

  const handleupdate = async(e) => {
  
  await dispatch(updatedRoomdetails(props.params.id, name, location, seat, description, setvalidroomname, setvalidlocation, setvalidseat));
  setTimeout(function() {
    history.push(global.links.room_list);
}, 2000);
  };

  return (
    <div>
      {loader && <PreLoader />}

      <ContainerWrapper>
        <ContainerBody>
          <Content col="6" label="Create Room">
            <h2>Create Master</h2>
            <form>
              <Row>
                <Col size="6">
                  <div className="form-group">
                    <label>RoomName:</label>
                    <input
                      type="text"
                      placeholder="RoomName"
                      className="form-control"
                      required
                      onChange={(e) => {
                        setRoomname(e.target.value);
                        if (e.target.value == "") {
                          setvalidroomname(true);
                        } else {
                          setvalidroomname(false);
                        }
                      }}
                      value={name}
                    ></input>
                    {validroomname && (
                      <label style={{ color: "red" }}>
                        Please Enter Room Name
                      </label>
                    )}
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label>Location:</label>
                    <select
                      name="type"
                      className="form-control"
                      required
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (e.target.value == "") {
                          setvalidlocation(true);
                        } else {
                          setvalidlocation(false);
                        }
                      }}
                    >
                      <option value="">- Select Location -</option>
                      {datalocation.length > 0 &&
                        datalocation.map((location, pos) => (
                          <option value={location.id}>
                            {location.location_name}
                          </option>
                        ))}
                    </select>
                    {validlocation && (
                      <label style={{ color: "red" }}>
                        Please Select Location
                      </label>
                    )}
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label>No of Seats:</label>
                    <input
                      type="text"
                      placeholder="Seats"
                      className="form-control"
                      required
                      value={seat}
                      onChange={(e) => {
                        setSeats(e.target.value);
                        if (e.target.value == "") {
                          setvalidseat(true);
                        } else {
                          setvalidseat(false);
                        }
                      }}
                    ></input>
                    {validseat && (
                      <label style={{ color: "red" }}>Please Enter Seats</label>
                    )}
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="employee_note"
                      value={description}
                      placeholder="Enter Description..."
                      onChange={(e) => {
                        setdescription(e.target.value);
                      }}
                    ></textarea>
                  </div>
                </Col>
              </Row>

              <div className="row">
                <div className="col-3">
                  {props.params.id == "0" ? (
                    <Button
                      type="button"
                      className="btn btn-primary"
                      onClick={handlesave}
                    >
                      <i className="fa fa-location-arrow" /> Submit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleupdate}
                    >
                      <i className="fa fa-location-arrow" /> Update
                    </Button>
                  )}
                </div>
                <div className="col-3">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handledelete}
                    style={{ backgroundColor: "red !important" }}
                  >
                    <i className="fa fa-trash" /> Delete
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

export default RoomMaster;
