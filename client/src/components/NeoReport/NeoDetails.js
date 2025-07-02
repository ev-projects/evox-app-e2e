import React, { useState, useEffect } from "react"
import { ContainerBody, ContainerWrapper } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table } from "react-bootstrap"
import { Link } from "react-router-dom"

const NeoDetails = () => {
  const [submission, setSubmission] = useState({});

  useEffect(() => {
    // call .net api to get list of submitted neo data and requirements of a single employee
    setSubmission(
      {
        id: 1,
        emp_num: 999,
        bhr_num: 12345,
        first_name: "Jose",
        middle_name: "P",
        last_name: "Rizal",
        nick_name: "Pepe",
        department: "Altice",
        job_title: "General Manager",
        work_email: "joserizal@ev.com",
        hire_date: "2025-06-01",
        submission_date: "2025-06-08",
      }
    );
  }, []);

  return (
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <h2 className="page-title">NEO Submission Details</h2>

          <div className="content-table">
            <div className="mt-4 mb-3">
              <Table striped bordered hover tableheader>
                <thead>
                  <tr>
                    <th className="tableheader"></th>
                    <th className="tableheader">Field Required</th>
                    <th className="tableheader">Data Submitted</th>
                    {/* <th className="tableheader">Date Submitted</th> */}
                  </tr>
                </thead>
                <tbody>
                  {submission && Object.keys(submission).length > 0 && Object.entries(submission).map(([key, data]) => (
                    <tr>
                      <td><input type="checkbox" name={key}></input></td>
                      <td>{key}</td>
                      <td>{data}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
  )
}

export default NeoDetails