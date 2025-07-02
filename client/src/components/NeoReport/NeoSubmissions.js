import React, { useState, useEffect } from "react"
import { ContainerBody, ContainerWrapper } from "../GridComponent/AdminLte"
import Wrapper from "../Template/Wrapper"
import { Table } from "react-bootstrap"
import { Link } from "react-router-dom"

const NeoSubmissions = () => {
  const [submissions, setSubmissions] = useState({});

  useEffect(() => {
    // call .net api to get list of newly onboarded employees
    setSubmissions([
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
      },
      {
        id: 2,
        emp_num: 888,
        bhr_num: 67890,
        first_name: "Stephen",
        middle_name: "GS",
        last_name: "Curry",
        nick_name: "Steph",
        department: "OPS - Recruitment",
        job_title: "Recruitment Officer",
        work_email: "stephencurry@eastvantage.com",
        hire_date: "2023-11-30",
        submission_date: "2023-12-30",
      },
      {
        id: 3,
        emp_num: 777,
        bhr_num: 98765,
        first_name: "Juan",
        middle_name: "Santos",
        last_name: "Dela Cruz",
        nick_name: "J",
        department: "Ethan",
        job_title: "CSR",
        work_email: "juansdelacruz@ethan.eastvantage.com",
        hire_date: "2024-02-14",
        submission_date: "2025-02-15",
      }
    ]);
  }, []);

  return (
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
          <h2 className="page-title">NEO Submission Report</h2>

          <div className="content-table neo-report-table">
            <div className="mt-4 mb-3">
              <Table striped bordered hover tableheader>
                <thead>
                  <tr>
                    <th className="tableheader">BHR No</th>
                    <th className="tableheader">Employee No</th>
                    <th className="tableheader">Name</th>
                    <th className="tableheader">Department</th>
                    <th className="tableheader">Job Title</th>
                    <th className="tableheader">Email</th>
                    <th className="tableheader">Hire Date</th>
                    <th className="tableheader">Submission Date</th>
                    <th className="tableheader" style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions && submissions.length > 0 && submissions.map((user) => (
                    <tr>
                      <td>{user.bhr_num}</td>
                      <td>{user.emp_num}</td>
                      <td>{user.first_name} {user.middle_name} {user.last_name}</td>
                      <td>{user.department}</td>
                      <td>{user.job_title}</td>
                      <td>{user.work_email}</td>
                      <td>{user.hire_date}</td>
                      <td>{user.submission_date}</td>
                      <td style={{ textAlign: "center" }}>
                        <Link to={{ pathname: global.links.neo_report_submissions + user.id, resetInitialState: true }} title="View NEO Submissions">
                          <i className="fa fa-eye ev-color" aria-hidden="true"></i>
                        </Link>
                      </td>
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

export default NeoSubmissions