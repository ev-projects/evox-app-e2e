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
import {useParams,useHistory} from "react-router-dom";
import { useDispatch } from "react-redux";
import { createLocationmaster, deleteLocationmaster, fecthLocationdetails, updateLocationmaster } from "./Createlocationapi.js";

const LocationMaster = (props) => {
  let history = useHistory();
  const dispatch = useDispatch();
    const [locationname, setLocationname] = useState("");
    const [validlocationname, setvalidlocationname] = useState(false);
    const [loader, setLoader] = useState(false);
  
    useEffect(() => {
      if(props.params.id !== "0"){
       dispatch(fecthLocationdetails(props.params.id,setLocationname))
      }
      },[]);
      
  
      const handledelete = async (e) => {
       await dispatch(deleteLocationmaster(props.params.id));
       history.push(global.links.location_list);
      }
  
  
    const handlesave = async (e) => {
     
      await dispatch(createLocationmaster(locationname,setvalidlocationname));
      history.push(global.links.location_list);
      
    };
  
    
    const handleupdate = async (e) => {
      await dispatch(updateLocationmaster(props.params.id,locationname,setvalidlocationname));
     history.push(global.links.location_list);
    };

    
  return (
    <div>    
    <ContainerWrapper>
    <ContainerBody>
      <Content col="6" label="Create Room">
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
                    if(e.target.value == ""){
                        setvalidlocationname(true);
                    }else{
                        setvalidlocationname(false);
                    }
                  }}
                  value={locationname}
                ></input>
                {validlocationname && <label style={{color:"red"}}>Please Enter Location Name</label>}
                
              </div>
            </Col>
            </Row>

            <div className="row">
              <div className="col-3">
              {props.params.id == "0" ? <Button
            type="button"
            className="btn btn-primary"
            onClick={handlesave}
          >
            <i className="fa fa-location-arrow" /> Submit
          </Button> : <Button
            type="button"
            className="btn btn-primary"
            onClick={handleupdate}
          >
            <i className="fa fa-location-arrow" /> Update
          </Button>}
              </div>
              <div className="col-3">
              <button
            type="button"
            className="btn btn-danger"
            onClick={handledelete}
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
  )
}

export default LocationMaster