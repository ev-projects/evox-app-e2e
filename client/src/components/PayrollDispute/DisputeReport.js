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
import { now } from "moment";
const DisputeReport = (props) => {

  const { settings,userdepartment,dispute } = props;

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
    status:''
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
										  { userdepartment && userdepartment.length > 0 &&  userdepartment.map(function(userdepartment){
											  return  <option value={userdepartment.id} label={userdepartment.department_name} />
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
          Status:
          </label>
       <select
				  className="form-control" 
				  name="status"
          required
				  value={filters.status}
				  style={{ display: 'block' }}
                  onChange={handleFilterChange}
				  >
				<option  label="Select Status" />
                <option value={"pending"} label={"Pending"} />
                <option value={"approve"} label={"Approve"} />
                <option value={"reject"} label={"Reject"} />
				</select>
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
      <Col size="2" style={{"text-align":"center"}}>
      <Row>
      <div className="form-group mt-4">
      
      <button onClick={fetchDisputes} className="btn btn-primary" ><i className="fa fa-filter" /> Filter</button>
    </div>
    <div className="form-group mt-4">
      <button onClick={handleExport} className="btn btn-primary btnspace" >Export</button>
    </div>
      </Row>
   
                </Col>
                </Row>
      </div>
        <div className="mb-3 table-container">
        <Table striped bordered hover className="tablealignment table-dispute">
          <thead>
          <tr>

        <th>Emp No</th>
        <th>Name</th>
        <th>Department</th>
        <th>Dispute Type</th>
        <th>Description</th>
        <th>Status</th>
        <th>LWOP</th>
        {/* <th>UT</th> */}
        {/* <th>Tardiness</th> */}
        {/* <th>Late</th> */}
        <th>NSD</th>
        <th>OT</th>
        {/* <th>OT with NSD</th> */}
        <th>RD</th>
        {/* <th>RD 200</th> */}
        {/* <th>RDW with NSD</th> */}
        {/* <th>RDW with OT</th> */}
        {/* <th>RDW NSD with OT</th> */}
        <th>LH</th>
        {/* <th>LH with NSD</th> */}
        {/* <th>LH with OT</th> */}
        {/* <th>LH OT with OT</th> */}
        {/* <th>SH</th> */}
        {/* <th>SH 200</th> */}
        {/* <th>SH with NSD</th> */}
        {/* <th>SH with OT</th> */}
        {/* <th>SH OT with OT</th> */}
        {/* <th>Referral Fee</th> */}
        {/* <th>Bonus</th> */}
        {/* <th>LWOP Adj</th> */}
        {/* <th>Commission</th> */}
        <th>Payroll Period</th>
        {/* <th>Payroll Cutoff</th> */}
        <th>Created BP</th>
        <th>BP's Remarks</th>
        {/* <th>BP's Date Encoded</th> */}
        <th>Payroll Remarks</th>
        <th>Payout Inclusion</th>
        {/* {(Authenticator.scanLevel("Payroll")) && (  */}
          <th>Action</th> 
          {/* )} */}
      </tr>
          </thead>
          <tbody>
            { dispute && dispute.length > 0 &&
              dispute.map((dispute, pos) => (
               
          <tr>
          <td>{dispute.emp_num}</td>
          <td>{dispute.EmployeeName}</td>
          <td>{dispute.Department}</td>
          <td>{dispute.dispute_type}</td>
          <td>{dispute.description}</td>
          <td className="textUC">{dispute.status}</td>
          <td>{dispute.LWOP}</td>
          {/* <td>{dispute.UT}</td> */}
          {/* <td>{dispute.TARDINESS}</td> */}
          {/* <td>{dispute.Late}</td> */}
          <td>{dispute.Night_Shift_Diff}</td>
          <td>{dispute.Overtime}</td>
          {/* <td>{dispute.OT_with_NSD}</td> */}
          <td>{dispute.Rest_Day}</td>
          {/* <td>{dispute.Rest_Day_200}</td> */}
          {/* <td>{dispute.Rest_Day_Work_with_NSD}</td> */}
          {/* <td>{dispute.Rest_Day_Work_with_OT}</td> */}
          {/* <td>{dispute.Rest_Day_Work_NSD_with_OT}</td> */}
          <td>{dispute.Legal_Holiday}</td>
          {/* <td>{dispute.Legal_Holiday_with_NSD}</td> */}
          {/* <td>{dispute.Legal_Holiday_with_Overtime}</td> */}
          {/* <td>{dispute.Legal_Holiday_OT_with_OT}</td> */}
          {/* <td>{dispute.Special_Holiday}</td> */}
          {/* <td>{dispute.Special_Holiday_200}</td> */}
          {/* <td>{dispute.Special_Holiday_with_NSD}</td> */}
          {/* <td>{dispute.Special_Holiday_with_Overtime}</td> */}
          {/* <td>{dispute.Special_Holiday_OT_with_OT}</td> */}
          {/* <td>{dispute.Referral_Fee}</td> */}
          {/* <td>{dispute.Bonus}</td> */}
          {/* <td>{dispute.LWOP_Adjustment}</td> */}
          {/* <td>{dispute.Commission}</td> */}
          <td>{dispute.Payroll_Period}</td>
          {/* <td>{dispute.Payroll_Cutoff}</td> */}
          <td>{dispute.created_by}</td>
          <td>{dispute.BPs_Remarks}</td>
          {/* <td>{dispute.BPs_Date_Encoded}</td> */}
          <td>{dispute.Payroll_Remarks}</td>
          <td>{dispute.Payout_Inclusion}</td>
          {/* {(Authenticator.scanLevel("Payroll")) && (  */}
            <td> <Link
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
                        </Link></td>
                        {/* )} */}
        </tr>
                  
              ))}
          </tbody>
        </Table>
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
  }
}

export default connect(mapStateToProps)(DisputeReport);
