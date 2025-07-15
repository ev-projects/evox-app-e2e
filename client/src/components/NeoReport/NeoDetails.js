import React, { useState, useEffect } from "react"
import { useDispatch } from 'react-redux';
import { ContainerBody, ContainerWrapper } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table, Button, Container } from "react-bootstrap"
import API from "../../services/API"
import Formatter from "../../services/Formatter"
import moment from 'moment';
import { da } from "date-fns/locale";
import Modal from "react-bootstrap/Modal";
import FileViewer from 'react-file-viewer';

const NeoDetails = (props) => {
  const DISABLED_FIELDS = ['guid', 'bhrNumber', 'empId', 'workEmail'];
  const [submissionData, setSubmissionData] = useState({});
  const [markedFields, setMarkedFields] = useState({});
  const [bhrNUmber, setBhrNumber] = useState(0);
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
        if (resData && Object.keys(resData).length > 0) {
           Object.entries(resData).map(([key, data]) => {
              if (data.fieldName === 'bhrNumber') {
                setBhrNumber(data.fieldValue);
              }
           });
        }
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setHrNote(value);
    setError('');
  }

  const viewFile = (fileId) => {
    API.call({
        method: "get",
        url: "/get_neo_file/" + 50101 + "/" + fileId
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

  const handleSubmit = (action) => {
    // validation for the hr note
    if (!hrNote) {
      setError('This field is required');
      return;
    }

    if (action === 'approve') {
      if (window.confirm("Do you confirm that all data submitted by the employee were accurate and wish to continue with the approval process?")) {
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
      if (window.confirm("Kindly verify that all marked fields will be returned to the employee for resubmission.")) {
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
          <Container>
            {/*<FileViewer
            fileType={mimeToExtension[neoFile.mimeType]}
            filePath={neoFilePath}
            errorComponent={<><div>An error occurred while viewing the file. Please check file support compatibility.</div></>}
            onError={onViewerError}/>*/}
            <iframe src={neoFilePath} width={'100%'} height={'100%'}></iframe>
          </Container>
        </Modal.Body>
      </Modal>
    )}
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <h2 className="page-title">NEO Submission Details</h2>

          <div className="content-table neo-report-table">
            <div className="mt-4 mb-3">
              <p>We kindly request that you review all submitted data and mark any fields that may require the onboarding employee to resubmit.</p>
              <Table striped bordered hover tableheader>
                <thead>
                  <tr>
                    <th className="tableheader"></th>
                    <th className="tableheader">Field Required</th>
                    <th className="tableheader">Data Submitted</th>
                    <th className="tableheader">Submission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionData && Object.keys(submissionData).length > 0 &&
                    Object.entries(submissionData).map(([key, data]) => {
                      if (data.fieldName === 'guid') return null; // skip rendering this row
                      const isGUIDValue = typeof data.fieldValue === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(data.fieldValue);
                      return (
                        <tr key={key}>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              name={data.fieldName}
                              onChange={handleCheckboxChange}
                              disabled={DISABLED_FIELDS.includes(data.fieldName)}
                            />
                          </td>
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
                          <td>
                            {data.submittedAt
                              ? moment(data.submittedAt).format("MMM DD, YYYY")
                              : null}
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
                  {markedFields && Object.keys(markedFields).length > 0 ? (
                    <Button type="submit" className="btn btn-primary-2" onClick={() => handleSubmit('resubmission')}><i className="fa  is-green fa-location-arrow" /> Request for Resubmission</Button>
                    ) :
                    <Button type="submit" className="btn btn-primary-2" onClick={() => handleSubmit('approve')}><i className="fa  is-green fa-location-arrow" /> Approve</Button>
                  }
                </div>
              </div>
            </div>
            )}
          </div>
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
    </>
  )
}

export default NeoDetails