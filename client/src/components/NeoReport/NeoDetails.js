import React, { useState, useEffect } from "react"
import { useDispatch } from 'react-redux';
import { ContainerBody, ContainerWrapper, Content } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table, Button, Container } from "react-bootstrap"
import API from "../../services/API"
import Formatter from "../../services/Formatter"
import moment from 'moment';
import { da } from "date-fns/locale";
import Modal from "react-bootstrap/Modal";
import FileViewer from 'react-file-viewer';

const NeoDetails = (props) => {
  const [submissionData, setSubmissionData] = useState({});
  const [markedFields, setMarkedFields] = useState({});
  const [clickedActions, setClickedActions] = useState({});
  const [bhrNumber, setBhrNumber] = useState(0);
  const [neoFile, setNeoFile] = useState({});
  const [neoFilePath, setNeoFilePath] = useState('');
  const [openViewer, setOpenViewer] = useState(false);
  const [hrNote, setHrNote] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const mimeToExtension = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'audio/mpeg': 'mp3',
    'video/mp4': 'mp4'
    // add others as needed
  };


  useEffect(() => {
    // call .net api to get list of submitted neo data and requirements of a single employee
    getSubmissionData();
  }, []);

  const getSubmissionData = async() => {
    await API.call({
      method: "get",
      url: "/get_user_submissions_data/",
      params: {
        guid: props.params.guid
      }
    })
    .then((result) => {
      if (result.status === 200) {
        const resData = result.data.data.submissions;
        setSubmissionData(resData);
        setBhrNumber(result.data.data.bhrNumber);
      }
    })
    .catch((e) => {
      dispatch(Formatter.alert_error(e));
    });
  }

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;

    setMarkedFields((prev) => {
      if (checked === true) {
        // add marked fields to state for resubmission
        const newIndex = Object.keys(prev).length;
        return {
          ...prev,
          [newIndex]: name,
        };
      } else {
        // remove unchecked fields from state and reindex
        const filteredValues = Object.values(prev).filter((val) => val !== name);
        const reindexed = {};
        filteredValues.forEach((val, idx) => {
          reindexed[idx] = val;
        });
        return reindexed;
      }
    });
  }

  const handleHrActions = (action, fieldName) => {
    // Track clicked action per field
    setClickedActions((prev) => ({
      ...prev,
      [fieldName]: action,
    }));

    setMarkedFields((prev) => {
      if (action === "resubmission") {
        // add resubmission fields to state for resubmission
        const newIndex = Object.keys(prev).length;
        return {
          ...prev,
          [newIndex]: fieldName,
        };
      } else {
        // remove approved fields from state and reindex
        const filteredValues = Object.values(prev).filter((val) => val !== fieldName);
        const reindexed = {};
        filteredValues.forEach((val, idx) => {
          reindexed[idx] = val;
        });
        return reindexed;
      }
    });
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setHrNote(value);
    setError('');
  }

  const viewFile = (fileId) => {
    API.call({
        method: "get",
        url: "/get_neo_file/" + bhrNumber + "/" + fileId
      })
      .then((result) => {
        if (result.status === 200) {
          const theFile =  result.data.content;
          if (theFile.success) {
            setNeoFile(theFile.data);
            const byteCharacters = atob(theFile.data.fileContent);
            const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: theFile.data.mimeType });
            const url = URL.createObjectURL(blob);
            setNeoFilePath(url);
            setOpenViewer(true);
          } else {
            setNeoFile({});
            setOpenViewer(false);
          }
        } else {
          setNeoFile({});
          setOpenViewer(false);
        }
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  }

  const handleSubmit = () => {
    // validation that all fields have actions
    const unmarkedFields = submissionData.filter(field => 
      field.isApproved === false && field.isDisabled === false && !clickedActions[field.fieldName]
    );
    if (unmarkedFields.length > 0) {
      const alertMsg = "Please make sure that all items are labeled as either Approved or Resubmitted.";
      alert(alertMsg);
      return;
    }

    // validation for the hr note
    if (!hrNote) {
      setError('This field is required');
      return;
    }

    if (markedFields && Object.keys(markedFields).length <= 0) {
      if (window.confirm("Do you confirm that all data submitted by the employee is accurate and that you would like to proceed with the approval process?")) {
        API.call({
          method: "post",
          url: "/approve_submissions/",
          params: {
            guid: props.params.guid,
            approvedBy: props.user.full_name,
            department: "Human Resources",
            notes: hrNote,
            country: props.user.country
          }
        })
        .then((result) => {
          if (result.status === 200) {
            dispatch(Formatter.alert_success(result, 3000));
            dispatch({
              'type'      : 'SET_REDIRECT',
              'link'      : global.links.neo_report_submissions
            })
          }
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
      }
    } else {
      if (window.confirm("Please confirm that all items labeled as Resubmit will be sent back to the employee for resubmission.")) {
        API.call({
          method: "post",
          url: "/request_for_resubmission/",
          params: {
            userGuid: props.params.guid,
            fieldsToResubmit: markedFields,
            reason: hrNote,
            requestedBy: props.user.full_name,
            country: props.user.country
          }
        })
        .then((result) => {
          if (result.status === 200) {
            dispatch(Formatter.alert_success(result, 3000));
            dispatch({
              'type'      : 'SET_REDIRECT',
              'link'      : global.links.neo_report_submissions
            })
          }
        })
        .catch((e) => {
          dispatch(Formatter.alert_error(e));
        });
      }
    }
  }

  const closeViewer = () => {
    setOpenViewer(false);
    setNeoFile({});
  }

  const onViewerError = (e) => {
    console.log('file viewer', e);
  }

  const visuallyDisabledStyle = {
    opacity: 0.5,
    pointerEvents: 'auto',
    cursor: 'pointer',
  };

  return (
    <>
    {openViewer && (
      <Modal
        show={openViewer}
        onHide={closeViewer}
        aria-labelledby="contained-modal-title-vcenter"
        size="xl"
        fullscreen="true"
        animation={true}
        className="file-viewer-modal"
      >
        <Modal.Header closeButton className="close-modal">
          <Modal.Title id="contained-modal-title-vcenter" className="header-modal">
            View File
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="show-grid body-modal">
          <Container className="fix">
            {/*<FileViewer
            fileType={mimeToExtension[neoFile.mimeType]}
            filePath={neoFilePath}
            errorComponent={<><div>An error occurred while viewing the file. Please check file support compatibility.</div></>}
            onError={onViewerError}/>*/}
            <div style={{ maxHeight: '800px'}}>
              <iframe src={neoFilePath} width={'100%'} height={'750px'} style={{ border: "none" }}></iframe>
            </div>
          </Container>
        </Modal.Body>
      </Modal>
    )}
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <Content>
            <h2 className="page-title" style={{ marginLeft: "0"}}>NEO Submission Details</h2>

            <div className="neo-report-table">
              <div className="mt-4 mb-3">
                <p>We kindly request that you review all submitted data and mark any fields that may require the onboarding employee to resubmit.</p>
                <Table striped bordered hover tableheader>
                  <thead>
                    <tr>
                      <th>Field Required</th>
                      <th>Data Submitted</th>
                      <th>Submission Date</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionData && Object.keys(submissionData).length > 0 &&
                      Object.entries(submissionData).map(([key, data]) => {
                        if (data.fieldName === 'guid') return null; // skip rendering this row
                        const isGUIDValue = typeof data.fieldValue === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(data.fieldValue);
                        const clicked = clickedActions[data.fieldName];
                        return (
                          <tr key={key}>
                            <td>{data.fieldName.replace(/([A-Z])/g, ' $1').toUpperCase()}</td>
                            <td>
                              {data.fieldValue && data.fieldValue !== "{}" ? (
                                isGUIDValue ? <>
                                <Button type="button" className="btn btn-primary-2" onClick={() => viewFile(data.fieldValue)}><i className="fa  is-green fa-eye" /> View File</Button>
                                </> : data.fieldValue
                              ) : (
                                <span className="tba-label">Not Provided</span>
                              )}
                            </td>
                            <td>{data.submittedAt ? moment(data.submittedAt).format("MMM DD, YYYY") : null}</td>
                            <td style={{ textAlign: "center" }}>
                              {data.isApproved ? (
                                <span className="approved-label">Approved</span>
                              ) : !data.isDisabled ? (
                                <>
                                  <Button type="submit" className="btn btn-primary-2" onClick={() => handleHrActions('approve', data.fieldName)} style={clicked === "resubmission" ? visuallyDisabledStyle : {}}><i className="fa fa-check" /> Approve</Button>
                                  <Button type="submit" className="btn btn-danger" onClick={() => handleHrActions('resubmission', data.fieldName)} style={{ marginLeft: "10px", ...(clicked === "approve" ? visuallyDisabledStyle : {}), }}><i className="fa fa-refresh" /> Resubmit</Button>
                                </>
                              ) : <span className="approved-label">Master Data already updated</span>}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </Table>
              </div>
              {submissionData && Object.keys(submissionData).length > 0 && (
              <div>
                <div className="col-12">
                  <textarea className="form-control" rows="3" name="hr_note" placeholder="Please enter note" onChange={handleInputChange}></textarea>
                  {error ? (
                    <div className="invalid-feedback">
                      <div className="input-feedback">{error}</div>
                    </div>
                  ) : null
                  }
                </div>
                <div className="col-12 mt-3">
                  <div style={{'float': 'right'}}>
                    <Button type="button" className="back-button btn btn-secondary" onClick={() => props.history.goBack() } ><i className="fa fa-arrow-circle-left" /> Back</Button>&nbsp;
                    <Button type="submit" className="btn btn-primary-2" onClick={() => handleSubmit()}><i className="fa  is-green fa-location-arrow" /> Save</Button>
                  </div>
                </div>
              </div>
              )}
            </div>
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
    </>
  )
}

export default NeoDetails