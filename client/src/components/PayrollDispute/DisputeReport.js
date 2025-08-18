import React, { useState, useEffect } from "react";
import {Table} from 'react-bootstrap';
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { Link } from "react-router-dom"; 
import Authenticator from "../../services/Authenticator";
import Validator from "../../services/Validator";
import axios from "axios";
import "./Dispute.css";
import {
  fecthdepartment,fecthdispute
} from "./Disouteapi.js";
import { connect,useDispatch } from 'react-redux';
import {
    ContainerWrapper,
    ContainerBody,
    Content,
    Row,Col
  } from "../../components/GridComponent/AdminLte.js";
import moment from "moment";
const DisputeReport = (props) => {

  const { settings,userdepartment,dispute, geos } = props;

    // State variables to store disputes and filters
  const [disputes, setDisputes] = useState([]);
  const [department, setDepartment] = useState([]);
  const [departmentid, setDepartmentId]= useState([]);
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({
    department: '',
    disputeType: '',
    startDate:  '',
    endDate: '',
    status:'',
    geo:''
  });

    // Function to fetch disputes from the API
    const fetchDepartment= async () => {
      try {
  
          API.call({
              method: "get",
              url: "/department/get_department_all",
          })
          .then(result => {
         
          setDepartment(result.data.content);
                     
          })
          .catch(e => {
              dispatch( Formatter.alert_error( e ) ) 
          });
      //   const response = await axios.get('/api/storedispute', { params: filters });
      //   setDisputes(response.data); // Update state with fetched data
      } catch (error) {
        console.error("Error fetching disputes:", error); // Log any errors
      }
    };

  // Function to fetch disputes from the API
  const fetchDisputes = async () => {
    try {

      dispatch(fecthdispute(filters));
        // API.call({
        //     method: "get",
        //     url: "/getdispute",
        //     params: filters
        // })
        // .then(result => {
       
        // setDisputes(result.data.content);
                   
        // })
        // .catch(e => {
        //     dispatch( Formatter.alert_error( e ) ) 
        // });
    } catch (error) {
      console.error("Error fetching disputes:", error); // Log any errors
    }
  };

  const handleExport =  async () => {
    await API.call({
      method: "get",
      url: "/getdisputeExport",
      params: filters
    })
      .then((result) => {

        const url = window.URL.createObjectURL(new Blob([result.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Dispute_Tracker_' + moment(new Date(filters.startDate)).format("DDMMMYYYY") + '_' + moment(new Date(filters.endDate)).format("DDMMMYYYY") + '.csv');
        document.body.appendChild(link);
        link.click();
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
    });
  }

  // Fetch disputes when filters change
  useEffect(() => {
    setFilters({ ...filters, 
      ["startDate"]: Validator.isValid(settings.current_payroll_cutoff) ? settings.current_payroll_cutoff.start_date : null,
      ["endDate"]: Validator.isValid(settings.current_payroll_cutoff) ? settings.current_payroll_cutoff.end_date : null,
     });
    dispatch(fecthdispute(filters));
    dispatch(fecthdepartment());
   
  }, []); // Dependency on filters to refetch when any filter is updated

  // Handler for filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

      setFilters({ ...filters, [name]: value });

  };
        

       
  return (
    <div  style={{ "margin-left": "20px" }}>
      <ContainerWrapper>
      <ContainerBody>
        <Content label="Create Room">
          <h2 className="">Payroll Dispute Report</h2>
          <div>
            <Row>
              {!Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) && (
                <Col size="2">
                  <div className="form-group">
                    <label>Select Department:</label>
                    <select
                      className="form-control"
                      name="department"
                      value={filters.department}
                      onChange={
                        handleFilterChange}
                      style={{ display: 'block' }}>
                      <option    label="Select Department" />
                        { userdepartment && userdepartment.length > 0 &&  userdepartment.map(function(userdepartment){
                          return  <option value={userdepartment.id} label={userdepartment.department_name} />
                        })}
                    </select>
                  </div>
                </Col>
              )}
              {Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) && (
                <Col size="2">
                  <div className="form-group">
                    <label>Select Geo:</label>
                    <select
                      className="form-control"
                      name="geo"
                      value={filters.geo}
                      onChange={
                        handleFilterChange}
                      style={{ display: 'block' }}>
                      <option    label="Select Geo" />
                        { geos && geos.length > 0 &&  geos.map(function(geo){
                          return  <option value={geo.country_id} label={geo.country_name} />
                        })}
                    </select>
                  </div>
                </Col>
              )}
              {/* <Col size="2">
                <div className="form-group">
                  <label>Dispute Type:</label>
                  <input
                    type="text"
                    name="disputeType"
                    value={filters.disputeType}
                    onChange={handleFilterChange}
                    className="form-control"
                  />
                </div>
              </Col> */}
              {!Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) && (
              <Col size="2">
                <div className="form-group">
                  <label>Status:</label>
                  <select
                      className="form-control" 
                      name="status"
                      required
                      value={filters.status}
                      style={{ display: 'block' }}
                              onChange={handleFilterChange}
                  >
                    <option value="0" label={"Pending"} />
                    <option value="1" label={"Approved"} />
                    <option value="2" label={"Rejected"} />
                  </select>
                </div>
              </Col>
              )}
              {Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) && (
                <Col size="2">
                  <div className="form-group">
                    <label>Request Date Range:</label>
                    <input
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="form-control"
                    />
                  </div>
                </Col>  
              )}
              {Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) && (
              <Col size="2">
                <div className="form-group">
                  <label>&nbsp;</label>
                  <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                    className="form-control"
                  />
                </div>
              </Col>
              )}
              <Col size="2" style={{"text-align":"center"}}>
                <Row>
                  <div className="form-group mt-4">
                    <button onClick={fetchDisputes} className="btn btn-primary" ><i className="fa fa-filter" /> Filter</button>
                  </div>
                  {Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) && (
                    <div className="form-group mt-4">
                      <button onClick={handleExport} className="btn btn-primary btnspace" >Export</button>
                    </div>
                  )}
                </Row>
              </Col>
            </Row>
          </div>
          <div className="mb-3 table-container">
            {Authenticator.scanLevel(["Payroll", "IND_Payroll", "BGR_Payroll", "MAR_Payroll"]) ? (
              <Table striped bordered hover className="tablealignment">
                <thead>
                  <tr>
                    <th>Emp No</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Cut Off</th>
                    <th>Payroll Period</th>
                    <th>BP's Date of Approval</th>
                    <th>Date of Filing</th>
                    <th>Remarks</th>
                    <th>Unpaid Leave</th>
                    <th>Late</th>
                    <th>Undertime</th>
                    <th>Rendered Hours</th>
                    <th>Night Differential</th>
                    <th>Overtime</th>
                    <th>Overtime Night Differential</th>
                    <th>Rest Day Rendered Hours</th>
                    <th>Rest Day Night Differential</th>
                    <th>Rest Day Overtime</th>
                    <th>Rest Day Overtime Night Differential</th>
                    <th>Legal Holiday Rendered Hours</th>
                    <th>Legal Holiday Night Differential</th>
                    <th>Legal Holiday Overtime</th>
                    <th>Legal Holiday Overtime Night Differential</th>
                    <th>Special Holiday Rendered Hours</th>
                    <th>Special Holiday Night Differential</th>
                    <th>Special Hoiday Overtime</th>
                    <th>Special Holiday Overtime Night Differential</th>
                    <th>Double Special Holiday Rendered Hours</th>
                    <th>Double Special Holiday Night Differential</th>
                    <th>Double Special Holiday Overtime</th>
                    <th>Double Special Holiday Overtime Night Differential</th>
                    <th>Double Legal Holiday Rendered Hours</th>
                    <th>Double Legal Holiday Night Differential</th>
                    <th>Double Legal Holiday Overtime</th>
                    <th>Double Legal Holiday Overtime Night Differential</th>
                    <th>Special Legal Holiday Rendered Hours</th>
                    <th>Special Legal Holiday Night Differential</th>
                    <th>Special Legal Holiday Overtime</th>
                    <th>Special Legal Holiday Overtime Night Differential</th>
                  </tr>
                </thead>
                <tbody>
                  { dispute && dispute.length > 0 &&
                    dispute.map((dispute, pos) => (
                      <tr>
                        <td>{dispute.Employee_Number}</td>
                        <td>{dispute.Employee_Name}</td>
                        <td>{dispute.Department_Name}</td>
                        <td>{dispute.Cutoff}</td>
                        <td>{dispute.PayrollPeriod}</td>
                        <td>{dispute.ApprovedDate}</td>
                        <td>{dispute.datefilling}</td>
                        <td>{dispute.Remarks}</td>
                        <td>{dispute.unpaid_leave}</td>
                        <td>{dispute.reg_late}</td>
                        <td>{dispute.reg_undertime}</td>
                        <td>{dispute.Render_Hr}</td>
                        <td>{dispute.Night_Diff}</td>
                        <td>{dispute.OverTime}</td>
                        <td>{dispute.OT_ND}</td>
                        <td>{dispute.RD_Render_HR}</td>
                        <td>{dispute.RD_ND}</td>
                        <td>{dispute.RD_OT}</td>
                        <td>{dispute.RD_OT_ND}</td>
                        <td>{dispute.LH_Render_HR}</td>
                        <td>{dispute.LH_ND}</td>
                        <td>{dispute.LH_OT}</td>
                        <td>{dispute.LH_OT_ND}</td>
                        <td>{dispute.SH_Render_Hr}</td>
                        <td>{dispute.SH_ND}</td>
                        <td>{dispute.SH_OT}</td>
                        <td>{dispute.SH_OT_ND}</td>
                        <td>{dispute.DSH_Render_HR}</td>
                        <td>{dispute.DSH_ND}</td>
                        <td>{dispute.DSH_OT}</td>
                        <td>{dispute.DSH_OT_ND}</td>
                        <td>{dispute.DLH_Render_HR}</td>
                        <td>{dispute.DLH_ND}</td>
                        <td>{dispute.DLH_OT}</td>
                        <td>{dispute.DLH_OT_ND}</td>
                        <td>{dispute.SLH_Render_HR}</td>
                        <td>{dispute.SLH_ND}</td>
                        <td>{dispute.SLH_OT}</td>
                        <td>{dispute.SLH_OT_ND}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            ) : 
              <Table striped bordered hover className="tablealignment">
                <thead>
                  <tr>
                    <th>Emp No</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Rendered Hours</th>
                    <th>OT</th>
                    <th>RD</th>
                    <th>LH</th>
                    <th>SH</th>
                    <th style={{ "text-align" : "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  { dispute && dispute.length > 0 &&
                    dispute.map((dispute, pos) => (
                      <tr>
                        <td>{dispute.Employee_Number}</td>
                        <td>{dispute.Employee_Name}</td>
                        <td>{dispute.Department_Name}</td>
                        <td>{moment(new Date(dispute.login_date)).format("MMMM D, YYYY")}</td>
                        <td>{dispute.Render_Hr}</td>
                        <td>{dispute.OverTime}</td>
                        <td>{dispute.RD_Render_HR}</td>
                        <td>{dispute.LH_Render_HR}</td>
                        <td>{dispute.SH_Render_Hr}</td>
                        <td style={{ "text-align" : "center" }}>
                          <Link
                            to={{
                              pathname: global.links.payroll_dispute + dispute.id,
                              resetInitialState: true,
                            }}
                            title="View Complete Details"
                          >
                            <i
                              className="fa fa-eye ev-color"
                              aria-hidden="true"
                            ></i>
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            }
          </div>
        </Content>
      </ContainerBody>
    </ContainerWrapper>
  </div>
  );
};

const mapStateToProps = (state) => {
  return {
    settings        : state.settings,
    userdepartment: state.dashboard.my_department,
    dispute: state.dashboard.dispute_list,
    geos: state.settings.countries
  }
}

export default connect(mapStateToProps)(DisputeReport);