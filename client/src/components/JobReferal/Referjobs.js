import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Form, Button, Accordion, Card } from "react-bootstrap";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
  Row,
  Col,
} from "../../components/GridComponent/AdminLte.js";
import { connect, dispatch } from "react-redux";
import APICALL from "../../services/APICALL.js";
import { useParams, useLocation, useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ApplyReferaljob, FecthJobdetails } from "./JobReferalapi.js";
import Referalmachanisam from "./Referalmachanisam.js";
import "./JobReferalstyle.css";
const Referjobs = (props) => {
  const aRef = useRef(null);

  const { user } = props;
  let history = useHistory();
  const dispatch = useDispatch();
  const [submitiondata, SetName] = useState({
    fName: "",
    lName: "",
    email: "",
    Mname: "",
    Nname: "",
    MobileNumber: "",
    Address: "",
    City: "",
    Refer: "1",
    Terms: "",
    myFile: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [valfname, setValidatefname] = useState(false);
  const [vallname, setValidatelname] = useState(false);
  const [valemail, setValidateemail] = useState(false);
  const [valphone, setValidatephone] = useState(false);
  const [valfile, setValidatefile] = useState(false);
  const [valterms, setValidateterms] = useState(false);
  const [valterms1, setValidateterms1] = useState(false);
  const [files, setFiles] = useState();
  const [validated, setValidated] = useState(false);
  const [data, setData] = useState([]);
  const [jobdetails, setJobdetails] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isreferral, setReferral] = useState(false);
  const [jobid, setJobid] = useState(false);
  const [validateemail, setValidateemailid] = useState(false);
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };
  const handleFileUpload = async (e) => {
    setValidatefile(false);
    const MAX_FILE_SIZE = 5120; // 5MB
    const file = e.target.files[0];
    setIsSuccess(false);
    const fileSizeKiloBytes = file.size / 1024;
    const fileext = file.type;
    const filename = file.name;
    const ext1 = filename.split(".");
    let ext = ext1.pop();
    if (fileSizeKiloBytes > MAX_FILE_SIZE) {
      console.log("File size is Grater than 5MB");

      e.target.value = null;
      setIsSuccess(true);
      setErrorMsg("File size is Grater than 5MB");
      return;
    } else if (
      ext === "pdf" ||
      ext === "png" ||
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "doc" ||
      ext === "docx" ||
      ext === "odt"
    ) {
      const base64 = await convertToBase64(file);
      const b64 = base64.replace(`data:${fileext};base64,`, "");
      console.log(b64);
      SetName({ ...submitiondata, myFile: b64 });
    } else {
      console.log(fileext);
      e.target.value = null;
      setIsSuccess(true);
      setErrorMsg("Please Select PDF,doc,docx,jpg,png,jpeg File");
      return;
    }
  };

  function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  let textInput = null;
  let textInput1 = null;
  let textInput2 = null;
  let textInput3 = null;
  let textInput4 = null;
  let textInput5 = null;
  let textInput6 = null;
  const handleSubmit = async (event) => {

    
    console.log(submitiondata);
    setValidatefname(false);
    setValidatelname(false);
    setValidateemail(false);
    setValidatephone(false);
    setValidatefile(false);
    setValidateterms1(false);
    setReferral(false);
    event.preventDefault();
    if (submitiondata.fName == "") {
      setValidatefname(true);
    }
    if (submitiondata.lName == "") {
      setValidatelname(true);
    }
    if (submitiondata.email == "") {
      setValidateemail(true);
    }
    if (!isValidEmail(submitiondata.email)) {
    
      setValidateemail(true);
    } 
    if (submitiondata.MobileNumber == "") {
      setValidatephone(true);
    }
    if (submitiondata.myFile == "") {
      setValidatefile(true);
    }
    if (valterms == false) {
      setValidateterms1(true);
    }
    if (submitiondata.Refer == "") {
      setReferral(true);
    }
    if (submitiondata.fName == "") {
      textInput.focus();
    } else if (submitiondata.lName == "") {
      textInput1.focus();
    } else if (submitiondata.email == "") {
      textInput2.focus();
    } else if (submitiondata.MobileNumber == "") {
      textInput3.focus();
    } else if (submitiondata.myFile == "") {
      textInput4.focus();
    } else if (valterms == false) {
      textInput5.focus();
    } else if (submitiondata.Refer == "") {
      textInput6.focus();
    }

    if (
      submitiondata.fName !== "" &&
      submitiondata.lName !== "" &&
      submitiondata.email !== "" &&
      submitiondata.MobileNumber !== "" &&
      submitiondata.myFile !== "" &&
      valterms !== false &&
      submitiondata.Refer !== "" &&
      isValidEmail(submitiondata.email)
    ) {
      console.log(valfname);
      event.preventDefault();
      await dispatch(
        ApplyReferaljob(
          jobid,
          submitiondata.fName,
          submitiondata.Mname,
          submitiondata.lName,
          submitiondata.Nname,
          submitiondata.email,
          submitiondata.MobileNumber,
          submitiondata.Address,
          submitiondata.City,
          submitiondata.myFile,
          user.emp_num
        )
      );

      SetName((submitiondata) => ({
        ...submitiondata,
        Mname: "",
        lName: "",
        fName: "",
        Nname: "",
        email: "",
        MobileNumber: "",
        Address: "",
        City: "",
        myFile: "",
      }));

      aRef.current.value = null;
      clearcheck();
    }
  };

  const clearcheck = () => {
    setValidateterms1(false);
    setValidateterms(false);
  };

  useEffect(() => {
    dispatch(FecthJobdetails(setJobdetails));
  }, []);
  return (
    <>
      <div>
        <ContainerWrapper>
          <ContainerBody>
            <Content col="10" label="Create Room">
              <form>
                <h2>Job Referral</h2>
                <div>
                  <Referalmachanisam />
                  <Row>
                    <Col size="6">
                      <div className="form-group">
                        <label>
                          Referal Name<span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Referal Name"
                          className="form-control"
                          required
                          ref={(button) => {
                            textInput = button;
                          }}
                          value={submitiondata.fName}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              fName: e.target.value,
                            });
                            setValidatefname(false);
                          }}
                        ></input>
                        {valfname && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                           <i class="fa fa-times" aria-hidden="true"></i> Please Enter ReferalName
                          </span>
                        )}
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>
                          Last Name<span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Last Name"
                          className="form-control"
                          required
                          ref={(button) => {
                            textInput1 = button;
                          }}
                          value={submitiondata.lName}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              lName: e.target.value,
                            });
                            setValidatelname(false);
                          }}
                        ></input>
                        {vallname && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                            <i class="fa fa-times" aria-hidden="true"></i> Please Enter LastName
                          </span>
                        )}
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>Middle Name</label>
                        <input
                          type="text"
                          placeholder="Middle Name"
                          className="form-control"
                          value={submitiondata.Mname}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              Mname: e.target.value,
                            });
                          }}
                        ></input>
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>Nick Name</label>
                        <input
                          type="text"
                          placeholder="Nick Name"
                          className="form-control"
                          value={submitiondata.Nname}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              Nname: e.target.value,
                            });
                          }}
                        ></input>
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>
                          Referral's Email
                          <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Referral's Email"
                          className="form-control"
                          required
                          value={submitiondata.email}
                          ref={(button) => {
                            textInput2 = button;
                          }}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              email: e.target.value,
                            });
                            setValidateemail(false);
                          }}
                        ></input>
                        {valemail && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                           <i class="fa fa-times" aria-hidden="true"></i> Please Enter EmailID
                          </span>
                        )}
                      </div>
                    </Col>
                    <Col size="6">
                      <div className="form-group">
                        <label>
                          Referral's Mobile Number (Along With Code)
                        </label>
                        <input
                          type="number"
                          placeholder="Referral's Mobile Number"
                          className="form-control"
                          required
                          value={submitiondata.MobileNumber}
                          ref={(button) => {
                            textInput3 = button;
                          }}
                          onChange={(e) => {
                            if (e.target.value.length < 14) {
                              SetName({
                                ...submitiondata,
                                MobileNumber: e.target.value,
                              });
                              setValidatephone(false);
                            }
                          }}
                        ></input>
                        {valphone && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                          <i class="fa fa-times" aria-hidden="true"></i> Please Enter MobileNumber
                          </span>
                        )}
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>Address</label>
                        <input
                          type="text"
                          placeholder="Address"
                          className="form-control"
                          value={submitiondata.Address}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              Address: e.target.value,
                            });
                          }}
                        ></input>
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>City</label>
                        <input
                          type="text"
                          placeholder="City"
                          className="form-control"
                          value={submitiondata.City}
                          onChange={(e) => {
                            SetName({ ...submitiondata, City: e.target.value });
                          }}
                        ></input>
                      </div>
                    </Col>

                    <Col size="6">
                      <div className="form-group">
                        <label>
                          Job applying for
                          <span style={{ color: "red" }}>*</span>
                        </label>
                        <select
                          name="type"
                          className="form-control"
                          required
                          ref={(button) => {
                            textInput6 = button;
                          }}
                          bsPrefix={isreferral && "validatemessage"}
                          //   style={{ borderColor:"red !important" }}
                          onChange={(e) => {
                            setJobid(e.target.value);
                            setReferral(false);
                          }}
                        >
                          <option value="_none">- Select Job -</option>
                          {isLoading ? (
                            <option value=""></option>
                          ) : (
                            jobdetails.map((items, pos) => (
                              <option value={items.jobid}>
                                {items.jobCategory}
                              </option>
                            ))
                          )}
                        </select>
                        {isreferral && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                            <i class="fa fa-times" aria-hidden="true"></i> Please Select Your Referal Name
                          </span>
                        )}
                      </div>
                    </Col>
                    <Col size="6">
                      <div className="form-group">
                        <label>
                          Upload Resume<span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          type="file"
                          placeholder="Referral's Mobile Number"
                          className="form-control uploadfile"
                          required
                          ref={aRef}
                          onChange={(e) => handleFileUpload(e)}
                        ></input>
                        {isSuccess && valfile == false && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                            {errorMsg}
                          </span>
                        )}
                        {valfile && (
                          <span style={{ color: "red", fontSize: "12px" }}>
                           <i class="fa fa-times" aria-hidden="true"></i> Please Upload Resume
                          </span>
                        )}
                      </div>
                    </Col>
                  </Row>

                  <Row>
                    <Col size="12">
                      <Form.Group className="mt-2" id="formGridCheckbox">
                        <Form.Check
                          type="checkbox"
                          label="I have fully read, understood and agree with the EV Buddy Referral Mechanics"
                          value="Terms"
                          checked={valterms}
                          onChange={(e) => {
                            SetName({
                              ...submitiondata,
                              Terms: e.target.value,
                            });
                            valterms
                              ? setValidateterms(false)
                              : setValidateterms(true);
                            setValidateterms1(false);
                          }}
                          ref={(button) => {
                            textInput5 = button;
                          }}
                          // ref={cRef}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                
                    {valterms1 && (
                    <span style={{ color: "red", fontSize: "12px" }}>
                      <i class="fa fa-times" aria-hidden="true"></i> Please select the terms
                    </span>
                  )}
                  
                  
                </div>
                <div className="row">
                  <div className="col-3">
                    <Button
                      type="button"
                      className="btn btn-primary applybtn"
                      onClick={handleSubmit}
                    >
                      <i className="fa fa-location-arrow" /> Apply
                    </Button>
                  </div>
                </div>
              </form>
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </div>
    </>
  );
};

// export default Referjobs;
const mapStateToProps = (state) => {
  return {
    user: state.user,
    myTeamList: state.myTeamList,
  };
};

export default connect(mapStateToProps)(Referjobs);
