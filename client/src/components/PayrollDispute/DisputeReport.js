import React, { useState, useEffect } from "react";
import {Table} from 'react-bootstrap';
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { Link } from "react-router-dom"; 
import Authenticator from "../../services/Authenticator";
import Validator from "../../services/Validator";
import axios from "axios";
import "./Dispute.css";
import { connect,useDispatch } from 'react-redux';
import {
    ContainerWrapper,
    ContainerBody,
    Content,
    Row,Col
  } from "../../components/GridComponent/AdminLte.js";
import { now } from "moment";
const DisputeReport = (props) => {

  const { settings } = props;
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
        API.call({
            method: "get",
            url: "/getdispute",
            params: filters
        })
        .then(result => {
       
        setDisputes(result.data.content);
                   
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
          link.setAttribute('download', 'Dispute.csv');
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
      ["startDate"]: Validator.isValid(settings.current_payroll_cutoff) ?  
      settings.current_payroll_cutoff.start_date : null,
      ["endDate"]: Validator.isValid(settings.current_payroll_cutoff) ?  
      settings.current_payroll_cutoff.end_date : null,
     });
    fetchDisputes();
    fetchDepartment();
   
  }, []); // Dependency on filters to refetch when any filter is updated

  // Handler for filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

      setFilters({ ...filters, [name]: value });

  };
        

       
  return (
    <div  style={{ "margin-left": "20px" }}>

    <ContainerWrapper>
     
    
        <h2 className="">Dispute Report</h2>
        <div>
            <Row>
            <Col size="2">
        {/* <div className="form-group">
        <label>
          Department:
          </label>
          <input
            type="text"
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
             className="form-control"
          />
       </div> */}
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
										  { department.map(function(department){
											  return  <option value={department.Id} label={department.Name} />
										  })}
										</select>
									</div>
       </Col>
       <Col size="2">
       <div className="form-group">
        <label>
          Dispute Type:
          </label>
          <input
            type="text"
            name="disputeType"
            value={filters.disputeType}
            onChange={handleFilterChange}
             className="form-control"
          />
       </div>
       </Col>
       <Col size="2">
       <div className="form-group">
        <label>
          Start Date:
        </label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
             className="form-control"
          />
       </div>
       </Col>
       <Col size="2">
       <div className="form-group">
        <label>
          End Date:
        </label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="form-control"
          />
      </div>
      </Col>
      <Col size="1" style={{"text-align":"center"}}>
      <div className="form-group mt-4">
                  <button onClick={fetchDisputes} className="btn btn-primary">Filter</button>
                </div>
                </Col>
                <Col size="2" >
      <div className="form-group mt-4">
                  <button onClick={handleExport} className="btn btn-primary">Export</button>
                </div>
                </Col>
                </Row>
      </div>
        <div className="mb-3 table-container">
        <Table striped bordered hover >
          <thead>
          <tr>

        <th>Employee ID</th>
        <th>Employee Name</th>
        <th>Employee Department</th>
        <th>Dispute Type</th>
        <th>Description</th>
        <th>Created By</th>
        <th>Status</th>
        <th>LWOP</th>
        <th>UT</th>
        <th>Tardiness</th>
        <th>Late</th>
        <th>Night Shift Diff</th>
        <th>Overtime</th>
        <th>OT with NSD</th>
        <th>Rest Day</th>
        <th>Rest Day 200</th>
        <th>Rest Day Work with NSD</th>
        <th>Rest Day Work with OT</th>
        <th>Rest Day Work NSD with OT</th>
        <th>Legal Holiday</th>
        <th>Legal Holiday with NSD</th>
        <th>Legal Holiday with Overtime</th>
        <th>Legal Holiday OT with OT</th>
        <th>Special Holiday</th>
        <th>Special Holiday 200</th>
        <th>Special Holiday with NSD</th>
        <th>Special Holiday with Overtime</th>
        <th>Special Holiday OT with OT</th>
        <th>Referral Fee</th>
        <th>Bonus</th>
        <th>LWOP Adjustment</th>
        <th>Commission</th>
        <th>Payroll Period</th>
        <th>Payroll Cutoff</th>
        <th>BP's Remarks</th>
        <th>BP's Date Encoded</th>
        <th>Payroll Remarks</th>
        <th>Payout Inclusion</th>
        {(Authenticator.scanLevel("Payroll")) && ( <th>Action</th> )}
      </tr>
          </thead>
          <tbody>
            {disputes.length > 0 &&
              disputes.map((dispute, pos) => (
               
          <tr>
          <td>{dispute.employee_id}</td>
          <td>{dispute.EmployeeName}</td>
          <td>{dispute.Department}</td>
          <td>{dispute.dispute_type}</td>
          <td>{dispute.description}</td>
          <td>{dispute.created_by}</td>
          <td>{dispute.status}</td>
          <td>{dispute.LWOP}</td>
          <td>{dispute.UT}</td>
          <td>{dispute.TARDINESS}</td>
          <td>{dispute.Late}</td>
          <td>{dispute.Night_Shift_Diff}</td>
          <td>{dispute.Overtime}</td>
          <td>{dispute.OT_with_NSD}</td>
          <td>{dispute.Rest_Day}</td>
          <td>{dispute.Rest_Day_200}</td>
          <td>{dispute.Rest_Day_Work_with_NSD}</td>
          <td>{dispute.Rest_Day_Work_with_OT}</td>
          <td>{dispute.Rest_Day_Work_NSD_with_OT}</td>
          <td>{dispute.Legal_Holiday}</td>
          <td>{dispute.Legal_Holiday_with_NSD}</td>
          <td>{dispute.Legal_Holiday_with_Overtime}</td>
          <td>{dispute.Legal_Holiday_OT_with_OT}</td>
          <td>{dispute.Special_Holiday}</td>
          <td>{dispute.Special_Holiday_200}</td>
          <td>{dispute.Special_Holiday_with_NSD}</td>
          <td>{dispute.Special_Holiday_with_Overtime}</td>
          <td>{dispute.Special_Holiday_OT_with_OT}</td>
          <td>{dispute.Referral_Fee}</td>
          <td>{dispute.Bonus}</td>
          <td>{dispute.LWOP_Adjustment}</td>
          <td>{dispute.Commission}</td>
          <td>{dispute.Payroll_Period}</td>
          <td>{dispute.Payroll_Cutoff}</td>
          <td>{dispute.BPs_Remarks}</td>
          <td>{dispute.BPs_Date_Encoded}</td>
          <td>{dispute.Payroll_Remarks}</td>
          <td>{dispute.Payout_Inclusion}</td>
          {(Authenticator.scanLevel("Payroll")) && ( <td> <Link
                          to={{
                            pathname: global.links.payroll_dispute + dispute.id,
                            resetInitialState: true,
                          }}
                          title="View Location Details"
                        >
                          <i
                            className="fa fa-eye ev-color"
                            aria-hidden="true"
                          ></i>
                        </Link></td>)}
        </tr>
                  
              ))}
          </tbody>
        </Table>
</div>
    </ContainerWrapper>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    settings        : state.settings
  }
}

export default connect(mapStateToProps)(DisputeReport);
