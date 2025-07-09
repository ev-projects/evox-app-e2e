import React, { useState, useEffect } from "react"
import { useDispatch } from 'react-redux';
import { ContainerBody, ContainerWrapper } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table, Button } from "react-bootstrap"
import API from "../../services/API"
import Formatter from "../../services/Formatter"
import moment from 'moment';

const NeoDetails = (props) => {
  const DISABLED_FIELDS = ['guid', 'email'];
  const [submissionData, setSubmissionData] = useState({});
  const [markedFields, setMarkedFields] = useState({});
  const [hrData, setHrData] = useState({});
  const dispatch = useDispatch();

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
        setSubmissionData(result.data.data.submissions);
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

    setHrData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  const handleSubmit = (action) => {
    if (action === 'approve') {
      API.call({
        method: "post",
        url: "/approve_submissions/",
        params: {
          guid: props.params.guid,
          approvedBy: props.user.full_name,
          department: "Human Resources",
          notes: hrData.hr_note
        }
      })
      .then((result) => {
        if (result.status === 200) {
          dispatch({
            'type'      : 'SET_REDIRECT',
            'link'      : global.links.neo_report_submissions
          })
        }
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
    } else {
      API.call({
        method: "post",
        url: "/request_for_resubmission/",
        params: {
          userGuid: props.params.guid,
          fieldsToResubmit: markedFields,
          reason: hrData.hr_note,
          requestedBy: props.user.full_name
        }
      })
      .then((result) => {
        if (result.status === 200) {
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

  return (
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
                  {submissionData && Object.keys(submissionData).length > 0 && Object.entries(submissionData).map(([key, data]) => (
                    <tr key={key}>
                      <td style={{ textAlign: "center" }}><input type="checkbox" name={data.fieldName} onChange={handleCheckboxChange} disabled={DISABLED_FIELDS.includes(data.fieldName)}></input></td>
                      <td>{data.fieldName.replace(/([A-Z])/g, ' $1').toUpperCase()}</td>
                      <td>{data.fieldValue && data.fieldValue !== "{}" ? data.fieldValue : <span className="tba-label">Not Provided</span>}</td>
                      <td>{data.submittedAt ? moment( data.submittedAt ).format("MMM DD, YYYY") : null}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <div>
              <div className="col-12">
                <textarea className="form-control mb-3" rows="3" name="hr_note" placeholder="Please enter note" onChange={handleInputChange}></textarea>
              </div>
              <div className="col-12">
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
          </div>
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
  )
}

export default NeoDetails