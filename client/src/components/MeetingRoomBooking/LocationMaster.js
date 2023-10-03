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
import { useParams, useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { connect, dispatch } from "react-redux";
import {
  createLocationmaster,
  deleteLocationmaster,
  fecthLocationdetails,
  updateLocationmaster,
} from "./Createlocationapi.js";
import API from "../../services/API";
import Formatter from "../../services/Formatter";

const LocationMaster = (props) => {
  let history = useHistory();
  const dispatch = useDispatch();
  const [locationname, setLocationname] = useState("");
  const [validlocationname, setvalidlocationname] = useState(false);
  const [loader, setLoader] = useState(false);
  const {meetingroom} = props;
  useEffect(() => {
    if (props.params.id !== "0") {
      dispatch(fecthLocationdetails(props.params.id));
    }
  }, []);


  const handledelete = async (e) => {
    if (window.confirm("Are you sure you want to Delete this?")) {
      await dispatch(deleteLocationmaster(props.params.id));
      setTimeout(function () {
        history.push(global.links.location_list);
      }, 1000);
    }
  };

  const handlesave = async (e) => {
    alert(meetingroom.location);
    if (meetingroom.location !== "") {
      await API.call({
        method: "post",
        url: "/storelocation",
        data: {
          Locationname: locationname,
        },
      })
        .then((result) => {
          // console.log(result)
          dispatch(Formatter.alert_success(result, 3000));
          if (result.data.status == 200) {
            history.push(global.links.location_list);
          }
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
    } else {
      if (locationname == "") {
        setvalidlocationname(true);
      }
    }
  };

  const handleupdate = async (e) => {
    if (meetingroom.location !== "") {
      await API.call({
        method: "put",
        url: `/UpdateLocationDetails/${props.params.id}`,
        data: {
          Locationname: meetingroom.location,
        },
      })
        .then((result) => {
          dispatch(Formatter.alert_success(result, 3000));
          if (result.data.status == 200) {
            history.push(global.links.location_list);
          }
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
    } else {
      if (meetingroom.location == "") {
        setvalidlocationname(true);
      }
    }
  };

  return (
    <div>
      <ContainerWrapper>
        <ContainerBody>
          <Content col="6" label="Create Room">
            {props.params.id !== "0" ?
            <form>
            <h2>Create Location</h2>
            <Row>
              <Col size="12">
                <div className="form-group">
                  <label>Location Name:</label>
                  <input
                    type="text"
                    placeholder="Enter Location"
                    className="form-control"
                    required
                    onChange={(e) => {
                      setLocationname(e.target.value);
                     
                      if (e.target.value == "") {
                        setvalidlocationname(true);
                      } else {
                        setvalidlocationname(false);
                      }
                    }}
                    value={meetingroom.location}
                  ></input>
                  {validlocationname && (
                    <label style={{ color: "red" }}>
                      Please Enter Location Name
                    </label>
                  )}
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
              {props.params.id !== "0" && (
                <div className="col-3">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handledelete}
                  >
                    <i className="fa fa-trash" /> Delete
                  </button>
                </div>
              )}
            </div>
          </form>:<form>
              <h2>Create Location</h2>
              <Row>
                <Col size="12">
                  <div className="form-group">
                    <label>Location Name:</label>
                    <input
                      type="text"
                      placeholder="Enter Location"
                      className="form-control"
                      required
                      onChange={(e) => {
                        setLocationname(e.target.value);
                        dispatch({
                          type: "UPDATE_LOCATION",
                          location: e.target.value,
                        });
                        if (e.target.value == "") {
                          setvalidlocationname(true);
                        } else {
                          setvalidlocationname(false);
                        }
                      }}
                      value={locationname}
                    ></input>
                    {validlocationname && (
                      <label style={{ color: "red" }}>
                        Please Enter Location Name
                      </label>
                    )}
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
                {props.params.id !== "0" && (
                  <div className="col-3">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handledelete}
                    >
                      <i className="fa fa-trash" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </form>}
            
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    meetingroom:state.meetingroom,
  };
};

export default connect(mapStateToProps)(LocationMaster);

