import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Authenticator from "../../services/Authenticator";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import Wrapper from "../Template/Wrapper";
import { connect,useDispatch } from 'react-redux';
import { useParams, useHistory} from "react-router-dom";
import { Button } from 'react-bootstrap';
import {
  payrollperiod
} from "../../store/actions/filters/requestListActions";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
  Row,
  Col,
} from "../../components/GridComponent/AdminLte.js";
import {fetchUserRolePermission,assignRolesPermissions,  fetchUserFeatures, assignLevelFeatures,fetchUserDispute } from '../../store/actions/admin/assignRoleActions';
import { getDisputeReport } from '../../store/actions/report/reportActions';

function DisputeForm(props) {
  let history = useHistory();
  const { userLists,user, payroll, dispute_record} = props;
  const inputRef = useRef(null);
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);
  const inputref3 = useRef(null);
  const inputref4 = useRef(null);
  const dispatch = useDispatch();
  const [employeeName, setEmployeeName] = useState('');
  const [validatename, setValidateName] = useState(true);
  const [validateeid, setValidateeid] = useState(true);
  const [cutoffname, setCutoffname] = useState('');
  const [startdate, setStartdate] = useState('');
  const [enddate, setEnddate] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState({});
  const [cutoff, setCutoff] = useState('');
  const [userid,setUserid] = useState('')
  const [validationResult, setValidationResult] = useState('');
  const [validbtn, setValidbtn] = useState(false);
  const [formData1, setFormData1] = useState({
    first_name:'',
    last_name:'',
    emp_num:'',
    department_name:''
  });

  const [formvalidate1, setFormvalidate1] = useState({
    dispute_type:'',
    description:'',
  });

  const [formvalidate, setFormvalidate] = useState({
    LWOP: '',
    UT: '',
    TARDINESS: '',
    Late: '',
    Night_Shift_Diff: '',
    Overtime: '',
    OT_with_NSD: '',
    Rest_Day: '',
    Rest_Day_200: '',
    Rest_Day_Work_With_NSD: '',
    Rest_Day_Work_With_OT: '',
    Rest_Day_Work_NSD_With_OT: '',
    Legal_Holiday: '',
    Legal_Holiday_With_NSD: '',
    Legal_Holiday_With_Overtime: '',
    Legal_Holiday_OT_With_OT: '',
    Special_Holiday: '',
    Special_Holiday_200: '',
    Special_Holiday_With_NSD: '',
    Special_Holiday_With_Overtime: '',
    Special_Holiday_OT_With_OT: '',
  });

  const [formData5, setFormData5] = useState({
    Payroll_Period:'',
  });


  const [formData, setFormData] = useState({
    employee_id:null,
    created_by:null,
    dispute_type:"",
    description:"",
    status: "pending",
    LWOP: '',
    UT: '',
    TARDINESS: '',
    Late: '',
    Night_Shift_Diff: '',
    Overtime: '',
    OT_with_NSD: '',
    Rest_Day: '',
    Rest_Day_200: '',
    Rest_Day_Work_With_NSD: '',
    Rest_Day_Work_With_OT: '',
    Rest_Day_Work_NSD_With_OT: '',
    Legal_Holiday: '',
    Legal_Holiday_With_NSD: '',
    Legal_Holiday_With_Overtime: '',
    Legal_Holiday_OT_With_OT: '',
    Special_Holiday: '',
    Special_Holiday_200: '',
    Special_Holiday_With_NSD: '',
    Special_Holiday_With_Overtime: '',
    Special_Holiday_OT_With_OT: '',
    Referral_Fee: '',
    Bonus: '',
    LWOP_Adjustment: '',
    Commission: '',
    Payroll_Period:'',
    Payroll_Cutoff: '',
    BPs_Remarks: '',
    BPs_Date_Encoded: '',
    Payroll_Remarks: '',
    Payout_Inclusion: '',
    Valid_From:'',
    Valid_To:'',
    Remarks:''
  });

  const validateNumber = (value) => {
    // Regular expression to check if it's a valid number
    const numberPattern = /^[+-]?\d+(\.\d+)?$/;
    if (numberPattern.test(value)) {
      if (value.includes('.')) {
        return 1;
      } else {
        return 0;
      }
    } else {
      return 1;
    }
  };

  const stringFields = [
    'LWOP', 'UT', 'TARDINESS',
    'Late', 'Night_Shift_Diff', 'Overtime', 'OT_with_NSD', 'Rest_Day',
    'Rest_Day_200', 'Rest_Day_Work_With_NSD', 'Rest_Day_Work_With_OT',
    'Rest_Day_Work_NSD_With_OT', 'Legal_Holiday', 'Legal_Holiday_With_NSD',
    'Legal_Holiday_With_Overtime', 'Legal_Holiday_OT_With_OT', 'Special_Holiday',
    'Special_Holiday_200', 'Special_Holiday_With_NSD', 'Special_Holiday_With_Overtime',
    'Special_Holiday_OT_With_OT', 'Referral_Fee', 'Bonus', 'LWOP_Adjustment',
    'Commission', 'BPs_Remarks', 'BPs_Date_Encoded'
  ];
  


  useEffect(() => {
    if (!props.params.id) {
      dispatch(fetchUserDispute());
      const mon = '01';
      const mon1 = '12';
      const month = new Date().getMonth() + 1;
      const date =  new Date().getDate();
      const year =  new Date().getFullYear();
      const formattedDay = String(date).padStart(2, '0');
      // const fromdate = year+"-"+ month -1+"-"+15;
      // const todate = year+"-"+ month+"-"+16;

      setValidbtn(true);

      if(formattedDay > 15){
        if(month === 12){
          handleCutoff(year+"-"+ (month)+"-"+"16",(year+1)+"-"+ (mon) +"-"+"15");
        }else{
          handleCutoff(year+"-"+ (month)+"-"+"16",year+"-"+ (month+1) +"-"+"15");
        }

      }else{
        if(month === 1){
        handleCutoff((year-1)+"-"+ (mon1) +"-"+"16",year+"-"+ (month) +"-"+"15");
        }else{
          handleCutoff(year+"-"+ (month-1) +"-"+"16",year+"-"+ (month) +"-"+"15")
        }
      }
    }else{
      // fetchDisputes();
      dispatch(getDisputeReport(props.params.id));
    }
  }, [payroll]);

  // useEffect(() => {
    
  //   setFormData5({
  //     ...formData5,
  //     ["Payroll_Period"]:payroll
  //   });
  // }, [payroll]);


    // Function to fetch disputes from the API
    const fetchDisputes = async () => {
      try {
  
          API.call({
              method: "get",
              url: "/getuserdispute/"+ props.params.id,
          })
          .then(result => {
            setFormData({
              ...formData,
              employee_id: result.data.content[0].employee_id,
              dispute_type:result.data.content[0].dispute_type,
              description: result.data.content[0].description,
              status: result.data.content[0].status,
              LWOP: result.data.content[0].LWOP,
              UT: result.data.content[0].UT,
              TARDINESS: result.data.content[0].TARDINESS,
              Late: result.data.content[0].Late,
              Night_Shift_Diff: result.data.content[0].Night_Shift_Diff,
              Overtime: result.data.content[0].Overtime,
              OT_with_NSD: result.data.content[0].OT_with_NSD,
              Rest_Day: result.data.content[0].Rest_Day,
              Rest_Day_200: result.data.content[0].Rest_Day_200,
              Rest_Day_Work_With_NSD: result.data.content[0].Rest_Day_Work_with_NSD,
              Rest_Day_Work_With_OT: result.data.content[0].Rest_Day_Work_with_OT,
              Rest_Day_Work_NSD_With_OT: result.data.content[0].Rest_Day_Work_NSD_with_OT,
              Legal_Holiday: result.data.content[0].Legal_Holiday,
              Legal_Holiday_With_NSD: result.data.content[0].Legal_Holiday_with_NSD,
              Legal_Holiday_With_Overtime: result.data.content[0].Legal_Holiday_with_Overtime,
              Legal_Holiday_OT_With_OT: result.data.content[0].Legal_Holiday_OT_with_OT,
              Special_Holiday: result.data.content[0].Special_Holiday,
              Special_Holiday_200: result.data.content[0].Special_Holiday_200,
              Special_Holiday_With_NSD: result.data.content[0].Special_Holiday_with_NSD,
              Special_Holiday_With_Overtime: result.data.content[0].Special_Holiday_with_Overtime,
              Special_Holiday_OT_With_OT: result.data.content[0].Special_Holiday_OT_with_OT,
              Referral_Fee: result.data.content[0].Referral_Fee,
              Bonus: result.data.content[0].Bonus,
              LWOP_Adjustment: result.data.content[0].LWOP_Adjustment,
              Commission: result.data.content[0].Commission,
              BPs_Remarks: result.data.content[0].BPs_Remarks,
              BPs_Date_Encoded: result.data.content[0].BPs_Date_Encoded,
              Payroll_Remarks: result.data.content[0].Payroll_Remarks,
              Payout_Inclusion: result.data.content[0].Payout_Inclusion,
              Valid_From: result.data.content[0].Valid_From,
              Valid_To: result.data.content[0].Valid_To,
              Payroll_Cutoff:result.data.content[0].Payroll_Cutoff,
            });
            setFormData1({
              ...formData1,
              ["first_name"]: result.data.content[0].first_name,
              ["last_name"]: result.data.content[0].last_name,
              ["emp_num"]:result.data.content[0].emp_num,
              ["department_name"]: result.data.content[0].Department,
            });
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


  const handleCutoff = async (fromdate,todate) => {
    try {

       await API.call({
            method: "get",
            url: "/getpayrollcutoff/"+fromdate+"/"+todate,
        })
        .then(result => {
          if(result.data.length > 0){
            dispatch(payrollperiod(result.data[0].name));
            setCutoffname(result.data[0].name);
            payroll && inputRef1.current.focus();
            setFormData({
              ...formData,
              ["Valid_From"]: fromdate,
              ["Valid_To"]: todate,
              ["Payroll_Cutoff"]: fromdate + " To " + todate,
              ["created_by"]: user.id,
              ["Payroll_Period"]:payroll
            });
            setValidbtn(false);
          }else{
            setValidbtn(true);
            dispatch(Formatter.alert_error_message("Cut Off Details Not Found, Please Contact Projects Team."));
          }
         
         
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });

        inputref4.current.focus();
        setFormData({
          ...formData,
          ["Valid_From"]: fromdate,
          ["Valid_To"]: todate,
          ["Payroll_Cutoff"]: fromdate + " To " + todate,
          ["created_by"]: user.id,
          ["Payroll_Period"]:payroll
        });
       
      

    //   const response = await axios.get(process.env.REACT_APP_API_BASE_URL+'/user/search-user-dispute/'+employeeName);
    //   setEmployeeDetails(response.data[0] || {}); // Assume first match for simplicity
    } catch (error) {
      console.error("Error fetching employee details:", error);
    }
  };

//   // Function to search for an employee and auto-populate details
  const handleEmployeeSearch = async () => {
    try {
     
     
        API.call({
            method: "get",
            url: "/user/search-user-dispute/" + employeeName,
        })
        .then(result => {
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            if(result.data.length > 0){
              alert("test1");
                            setEmployeeDetails(result.data[0]);
            setFormData({
                ...formData,
                ["employee_id"]: result.data[0].id,
                ["Rest_Day_200"]: 0,
                ["Special_Holiday_200"]: 0,
              });
            setValidateName(true); 
            setValidateeid(true);   
            }else{
              alert("test2");
              setFormData({
                ...formData,
                ["employee_id"]: result.data[0].id,
                ["Rest_Day_200"]: 0,
                ["Special_Holiday_200"]: 0,
              });
            setValidateName(true); 
            setValidateeid(true);  
            }
            
          }else{
            setValidateName(false);
            alert("test3");
          }
          
        })
        .catch(e => {
          alert("test4");
            dispatch( Formatter.alert_error( e ) ) 
        });

    //   const response = await axios.get(process.env.REACT_APP_API_BASE_URL+'/user/search-user-dispute/'+employeeName);
    //   setEmployeeDetails(response.data[0] || {}); // Assume first match for simplicity
    } catch (error) {
      console.error("Error fetching employee details:", error);
    }
  };

  // Function to handle input changes
  const handleChange = (e) => {
    const name = e.target.name;
    if(formvalidate[name]!== undefined){
      setFormvalidate({
        ...formvalidate,
        [e.target.name]: "",
      });
      const validationnumber = validateNumber(e.target.value);
      if (validationnumber !== 1){
  
        setFormData({
          ...formData,
          [e.target.name]: e.target.value,
        });
  
      }else{
        setFormData({
          ...formData,
          [e.target.name]: '',
        });
        setFormvalidate({
          ...formvalidate,
          [e.target.name]: "Allow Only Numeric ",
        });
      }
    }else{
    if(formvalidate1[name]!== undefined){
      setFormvalidate1({
        ...formvalidate1,
        [e.target.name]: "",
      });
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }else{
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }
  }
  
  };

  // Function to handle form submission
  const handleSubmit = async (e, action) => {
    e.preventDefault();
    try {
        API.call({
          method: "put",
          url: `/updatedispute/${props.params.id}`,
          data: {
            status : action,
            remarks : formData.Remarks
          },
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            history.push(global.links.payroll_dispute_view);
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    } catch (error) {
      console.error("Error updating dispute:", error);
    }
    // alert(formData5.Payroll_Period);
    // if(!formData.dispute_type && !formData.description){
    //   e.preventDefault();    
    //   setFormvalidate1({
    //     ...formvalidate,
    //     ["dispute_type"]: "Please Enter DisputeType",
    //     ["description"]: "Please Enter Description",
        
    //   });
    //   window.scrollTo(0, 0);
    //   inputRef.current.focus();
    // }else if(!formData.dispute_type){
    //   e.preventDefault();    
    //   setFormvalidate1({
    //     ...formvalidate,
    //     ["dispute_type"]: "Please Enter DisputeType",
    //   });
    //   window.scrollTo(0, 0);
    //   inputRef.current.focus();
    // }else if(!formData.description){
    //   e.preventDefault();    
    //   setFormvalidate1({
    //     ...formvalidate,
    //     ["description"]: "Please Enter Description",
    //   });
    //   window.scrollTo(0, 0);
    //   inputRef1.current.focus();
    // }else{
    //   e.preventDefault();
    //   const allEmpty = stringFields.every(field => formData[field] === "");
    //   if(allEmpty){
    //     e.preventDefault();   
    //     dispatch(Formatter.alert_error_message("Please fill in at least one dispute value."));
    //     window.scrollTo(0, 0);
    //     inputref3.current.focus();
    //   }
    //   else if(!formData.employee_id){
    //     e.preventDefault();
    //     dispatch(Formatter.alert_error_message("Please select an employee."));
    //     // setValidateeid(false);   
    //   }else{
    //     e.preventDefault();    
    //     // setFormData({
    //     //   ...formData,
    //     //   ["Payroll_Period"]: inputref4.current.value,
    //     // });
    //   try {
    //       API.call({
    //           method: "post",
    //           url: "/storedispute",
    //           data: formData
    //       })
    //       .then(result => {
    //           dispatch( Formatter.alert_success( result, 3000 ));
    //         setEmployeeName('');
    //         window.scrollTo(0, 0);
    //         setUserid("");
    //         handleblur();

    //       })
    //       .catch(e => {
    //           dispatch( Formatter.alert_error( e ) ) 
    //       });
    //   } catch (error) {
    //     console.error("Error submitting dispute:", error);
    //   }
    // }
    // }
  };

   // Function to handle form submission
   const handleUpdate = async (e) => {

  
     e.preventDefault();
    try {
        API.call({
          method: "put",
          url: `/updatedispute/${props.params.id}`,
          data: {
            Payroll_Remarks : formData.Payroll_Remarks,
            Payout_Inclusion : formData.Payout_Inclusion,
            status : formData.status

          },
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            history.push(global.links.payroll_dispute_view);
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    } catch (error) {
      console.error("Error submitting dispute:", error);
    }

  };
  const defaultFormData = {
    employee_id: null,
    dispute_type: "",
    description: "",
    LWOP: '',
    UT: '',
    TARDINESS: '',
    Late: '',
    Night_Shift_Diff: '',
    Overtime: '',
    OT_with_NSD: '',
    Rest_Day: '',
    Rest_Day_200: '',
    Rest_Day_Work_With_NSD: '',
    Rest_Day_Work_With_OT: '',
    Rest_Day_Work_NSD_With_OT: '',
    Legal_Holiday: '',
    Legal_Holiday_With_NSD: '',
    Legal_Holiday_With_Overtime: '',
    Legal_Holiday_OT_With_OT: '',
    Special_Holiday: '',
    Special_Holiday_200: '',
    Special_Holiday_With_NSD: '',
    Special_Holiday_With_Overtime: '',
    Special_Holiday_OT_With_OT: '',
    Referral_Fee: '',
    Bonus: '',
    LWOP_Adjustment: '',
    Commission: '',
    BPs_Remarks: '',
    BPs_Date_Encoded: '',
    Payroll_Remarks: '',
    Payout_Inclusion: '',
  };
  
  const defaultFormData1 = {
    first_name: '',
    last_name: '',
    emp_num: '',
    department_name: '',
  };


 const handleblur = (e) =>{

    setFormData({
      ...formData,
      employee_id: null,
      dispute_type: "",
      description: "",
      LWOP: '',
      UT: '',
      TARDINESS: '',
      Late: '',
      Night_Shift_Diff: '',
      Overtime: '',
      OT_with_NSD: '',
      Rest_Day: '',
      Rest_Day_200: '',
      Rest_Day_Work_With_NSD: '',
      Rest_Day_Work_With_OT: '',
      Rest_Day_Work_NSD_With_OT: '',
      Legal_Holiday: '',
      Legal_Holiday_With_NSD: '',
      Legal_Holiday_With_Overtime: '',
      Legal_Holiday_OT_With_OT: '',
      Special_Holiday: '',
      Special_Holiday_200: '',
      Special_Holiday_With_NSD: '',
      Special_Holiday_With_Overtime: '',
      Special_Holiday_OT_With_OT: '',
      Referral_Fee: '',
      Bonus: '',
      LWOP_Adjustment: '',
      Commission: '',
      BPs_Remarks: '',
      BPs_Date_Encoded: '',
      Payroll_Remarks: '',
      Payout_Inclusion: '',
    });
    setFormData1({
      ...formData1,
      ["first_name"]: '',
      ["last_name"]: '',
      ["emp_num"]:'',
      ["department_name"]: '',
    });

    // setFormData(defaultFormData);
    // setFormData1(defaultFormData1);
  }

  return (

    <div>
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
        <Content col="12" label="Create Room">
          <form onSubmit={!props.params.id ? handleSubmit : handleUpdate}>
            {!props.params.id ? <h2>Create Dispute</h2> : (Authenticator.scanLevel("Payroll")) ? (  <h2>Dispute Form</h2> ) : <h2>Dispute Form</h2>} 
            {/* <input type='text'
                   value={payroll && payroll}
                   name='Payroll_Period'
                   onBlur={handleChange}
                   ref={inputref4}
                   disabled
                  //  style={{"visibility":"hidden"}}
            ></input> */}
            <Row>
            {/* {!props.params.id && (
            <Col size="4">
            <div className="form-group">
								<label>Search Name:</label>
								
										<div>
										<input type="textfield" className="form-control" 
                    onChange={(e) => { setEmployeeName(e.target.value); if(e.target.value.length>2){dispatch(fetchUserDispute(e.target.value));} }} 
                    onBlur={handleblur}
                    ref={inputRef2}
                    variant="primary" 
                    placeholder="Enter Name..." 
                    name="nameFilter" 
                    value={employeeName} />
                          
										</div>
								
							</div>
            </Col>
          
            )} */}
              {!props.params.id && (
            <Col size="4">
            {/* { userLists?.length > 0  ?  */}
								<div>
									<div className="form-group">
										<label>Select User:</label>
										<select
											className="form-control" 
											name="selectedUser"
											value={userid}
											onChange={(e) => { 
                        setUserid(e.target.value);
                        const selectedOption = e.target.selectedOptions[0];
                          setFormData({
                          ...formData,
                          ["employee_id"]: e.target.value,
                        });
                        setFormData1({
                          ...formData1,
                          ["first_name"]: selectedOption.dataset.value1,
                          ["last_name"]: selectedOption.dataset.value2,
                          ["emp_num"]:selectedOption.dataset.value3,
                          ["department_name"]: selectedOption.dataset.value4,
                          ["Rest_Day_200"]: 0,
                          ["Special_Holiday_200"]: 0,
                        });
                      
                                                }}
											style={{ display: 'block' }}>
										  <option  value = {""}  label="Select Name" />
										  { userLists && userLists.length > 0 && userLists.map(function(user){
											  return  <option value={user.id}  data-value1 ={user.first_name} data-value2 = {user.last_name} data-value3 = {user.emp_num} 
                        data-value4 = {user.department_name}  label={user.first_name + ' ' + user.last_name + ' - ' + user.emp_num } />
										  })}
										</select>
									</div>
								</div>
								{/* : 
								<div>
									<div className="form-group">
										<label>Select User:</label>
										<select
											className="form-control" 
											name="selectedUser"
											value={"Test"}
											style={{ display: 'block' }}
                                            disabled
										>
										<option    label="Select Name" />
										</select>
									</div>
								</div>
							 }  */}
                            </Col>
              )}
            <Col size = "4">
                <div className="form-group">
                  {dispute_record && ( 
                    <div>
                      <p>
                        Employee Number: {dispute_record.Employee_Number} <br></br>
                        Name: {dispute_record.Employee_Name} <br></br>
                        Department: {dispute_record.Department_Name}<br></br>
                      </p>
                    </div>
                  )}
                </div>
            </Col>
                     
                            </Row>
              {/* <Row> */}

                            {/* <Col size="4">
                <div className="form-group">
                  <label>Payroll Period:</label>
                  <select
                      
											className="form-control" 
											name="Payroll_Period"
											value={cutoffname}
                      
											onChange={(e) => { 
                        const selectedOption = e.target.selectedOptions[0];
                        setCutoffname(e.target.value);
                        // alert(selectedOption.dataset.value1);
                        setStartdate(selectedOption.dataset.value1);
                        setEnddate(selectedOption.dataset.value2);
                        setFormData({
                          ...formData,
                          ["Payroll_Cutoff"]:selectedOption.dataset.value1 + " To " + selectedOption.dataset.value2,
                          ["Valid_From"]:selectedOption.dataset.value1,
                          ["Valid_To"]:selectedOption.dataset.value2,
                          ["Payroll_Period"]:e.target.value
                        });
                                                }}
											style={{ display: 'block' }}
										>
										<option    label="Select Name" />
										{ cutoff.map(function(cutoff){
											return  <option key={cutoff.id} value={cutoff.name}   data-value1={cutoff.start_date}
                      data-value2={cutoff.end_date} label={cutoff.name} />
										})}
										</select> */}
                  {/* <input
                    type="text"
                    placeholder="Enter Payroll Period"
                    className="form-control"
                    name='Payroll_Period'
                    value={formData.Payroll_Period}
                    onChange={handleChange}
                  /> */}
                {/* </div>
              </Col> */}
              
         
              {/* { validatename == true ? 
            <Col size="3">
           
            <label></label>
                <div className="form-group">
                 {employeeDetails && ( <div> <p>Employee Number: {formData1.emp_num} <br></br> Department: {formData1.department_name}</p></div> )}
                </div>
              </Col> :
               <Col size="3" className="mt-4">
           
               <label>Name Not Found....</label>
                 </Col>
            }
              { validatename == true &&  <Col size="3" mt-2>
              <label></label>
                <div className="form-group">
                 {employeeDetails && ( <div><p>First Name: {formData1.first_name} <br></br> Last Name: {formData1.last_name}</p></div> )}
                </div>
              </Col>
                }
                
              </Row>               */}
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>Login Date:</label>
                  <input
                    type="text"
                    placeholder="Enter Payroll Cutoff"
                    className="form-control"
                    disabled  
                    name='Payroll_Cutoff'
                    style={{"font-weight": "bold","color":"green !important"}}
                    value={dispute_record.login_date}
                    onChange={handleChange}
                  />
                </div>
              </Col>  
              {/* <Col size="3">
                <div className="form-group">
                  <label>Type of Dispute:* {formvalidate1.dispute_type && <span style={{"color" : "red"}}>{formvalidate1.dispute_type}</span>}</label>
                  <input
                    type="text"
                    placeholder="Enter Type"
                    className="form-control"
                    name='dispute_type'
                    value={formData.dispute_type}
                    onChange={handleChange}
                    disabled = {!props.params.id ? false : true }
                    ref={inputRef}
                  />
                </div>
              </Col> */}
            </Row>

            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="Rendered Hours"
                    className="form-control"
                    name='Render_Hr'
                    ref={inputref3}
                    value={dispute_record.Render_Hr}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Night Differential</label>
                  <input
                    type="number"
                    placeholder="Night Differential"
                    className="form-control"
                    name='Night_Diff'
                    value={dispute_record.Night_Diff}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Overtime</label>
                  <input
                    type="number"
                    placeholder="Overtime"
                    className="form-control"
                    name='OverTime'
                    value={dispute_record.OverTime}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="Overtime Night Differential"
                    className="form-control"
                    name='OT_ND'
                    value={dispute_record.OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="Rest Day Rendered Hours"
                    className="form-control"
                    name='RD_Render_HR'
                    value={dispute_record.RD_Render_HR}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Night Differential</label>
                  <input
                    type="number"
                    placeholder="Rest Day Night Differential"
                    className="form-control"
                    name='RD_ND'
                    value={dispute_record.RD_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Overtime</label>
                  <input
                    type="number"
                    placeholder="Rest Day Overtime"
                    className="form-control"
                    name='RD_OT'
                    value={dispute_record.RD_OT}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="Rest Day Overtime Night Differential"
                    className="form-control"
                    name='RD_OT_ND'
                    value={dispute_record.RD_OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="Legal Holiday Rendered Hours"
                    className="form-control"
                    name='LH_Render_HR'
                    value={dispute_record.LH_Render_HR}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday Night Differential</label>
                  <input
                    type="number"
                    placeholder="Legal Holiday Night Differential"
                    className="form-control"
                    name='LH_ND'
                    value={dispute_record.LH_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday Overtime</label>
                  <input
                    type="number"
                    placeholder="Legal Holiday Overtime"
                    className="form-control"
                    name='LH_OT'
                    value={dispute_record.LH_OT}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="Legal Holiday Overtime Night Differential"
                    className="form-control"
                    name='LH_OT_ND'
                    value={dispute_record.LH_OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="Special Holiday Rendered Hours"
                    className="form-control"
                    name='SH_Render_Hr'
                    value={dispute_record.SH_Render_Hr}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday Night Differential</label>
                  <input
                    type="number"
                    placeholder="Special Holiday Night Differential"
                    className="form-control"
                    name='SH_ND'
                    value={dispute_record.SH_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday Overtime</label>
                  <input
                    type="number"
                    placeholder="Special Holiday Overtime"
                    className="form-control"
                    name='SH_OT'
                    value={dispute_record.SH_OT}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="Special Holiday Overtime Night Differential"
                    className="form-control"
                    name='SH_OT_ND'
                    value={dispute_record.SH_OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>DSH Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="DSH Rendered Hours"
                    className="form-control"
                    name='DSH_Render_HR'
                    value={dispute_record.DSH_Render_HR}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>DSH Night Differential</label>
                  <input
                    type="number"
                    placeholder="DSH Night Differential"
                    className="form-control"
                    name='DSH_ND'
                    value={dispute_record.DSH_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>DSH Overtime</label>
                  <input
                    type="number"
                    placeholder="DSH Overtime"
                    className="form-control"
                    name='DSH_OT'
                    value={dispute_record.DSH_OT}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>DSH Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="DSH Overtime Night Differential"
                    className="form-control"
                    name='DSH_OT_ND'
                    value={dispute_record.DSH_OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>DLH Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="DLH Rendered Hours"
                    className="form-control"
                    name='DLH_Render_HR'
                    value={dispute_record.DLH_Render_HR}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>DLH Night Differential</label>
                  <input
                    type="number"
                    placeholder="DLH Night Differential"
                    className="form-control"
                    name='DLH_ND'
                    value={dispute_record.DLH_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>DLH Overtime</label>
                  <input
                    type="number"
                    placeholder="DLH Overtime"
                    className="form-control"
                    name='DLH_OT'
                    value={dispute_record.DLH_OT}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>DLH Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="DLH Overtime Night Differential"
                    className="form-control"
                    name='DLH_OT_ND'
                    value={dispute_record.DLH_OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>SLH Rendered Hours</label>
                  <input
                    type="number"
                    placeholder="SLH Rendered Hours"
                    className="form-control"
                    name='SLH_Render_HR'
                    value={dispute_record.SLH_Render_HR}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>SLH Night Differential</label>
                  <input
                    type="number"
                    placeholder="SLH Night Differential"
                    className="form-control"
                    name='SLH_ND'
                    value={dispute_record.SLH_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>SLH Overtime</label>
                  <input
                    type="number"
                    placeholder="SLH Overtime"
                    className="form-control"
                    name='SLH_OT'
                    value={dispute_record.SLH_OT}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>SLH Overtime Night Differential</label>
                  <input
                    type="number"
                    placeholder="SLH Overtime Night Differential"
                    className="form-control"
                    name='SLH_OT_ND'
                    value={dispute_record.SLH_OT_ND}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <div className="form-group">
                  <label>Late</label>
                  <input
                    type="number"
                    placeholder="Late"
                    className="form-control"
                    name='Late'
                    value={dispute_record.late}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Undertime</label>
                  <input
                    type="number"
                    placeholder="Undertime"
                    className="form-control"
                    name='Undertime'
                    value={dispute_record.undertime}
                    onChange={handleChange}
                    disabled="true"
                  />
                </div>
              </Col>
              <Col size="6">
                <div className="form-group">
                  <label>Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    name='Remarks'
                    onChange={handleChange}
                  />
                </div>
              </Col>
            </Row>

            <span>
              <Button style={ props.style? props.style : null} type="button" className="back-button btn btn-secondary" onClick={() => props.history.goBack() } ><i className="fa fa-arrow-circle-left" /> Back</Button>
              <div style={{ "float":"right" }}>
                <span>
                  <Button type="submit" className="btn btn-primary-2" onClick={(e)=> { handleSubmit(e, 1);  }} ><i className="fa  is-green fa-thumbs-up" /> Approve</Button> &nbsp;
                  <Button type="submit" className="btn btn-danger" onClick={(e)=> { handleSubmit(e, 2);  }} ><i className="fa  fa-thumbs-down" /> Decline</Button>  &nbsp;
                </span>
              </div>
            </span>

            {/* <Row>
             { !props.params.id ? 
              <Col size="12">
                <div className="form-group">
                  <button type="submit" className="btn btn-primary" disabled={validbtn} >Submit Dispute </button>
                  { validateeid === false ?
                  <label style={{"color":"red"}}>*Employee ID Not Found</label> :
                  ""}
                </div>
              </Col>
              :              
              (Authenticator.scanLevel("Payroll")) && ( 
                <Col size="12">
               <div className="form-group">
                <button type="submit" className="btn btn-primary">Submit</button>
                { validateeid === false ?
                <label style={{"color":"red"}}>*Employee ID Not Found</label> :
                ""}
              </div>
            </Col>
            )
             }
            </Row> */}
          </form>
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </Wrapper>
  </div>
  
  );
  
}

const mapStateToProps = (state) => {
	return {
    user: state.user,

    userLists     						: state.dashboard.user_list,
    payroll     						: state.assignRole.payroll, 
    isUserListLoaded     				: state.assignRole.isUserListLoaded,

    // isRolesLoaded     				: state.assignRole.isRolesLoaded,
    // roles     						: state.assignRole.roles,
    roles             					: state.lookup.roles,
    features             				: state.lookup.features,

    userRole     						: state.assignRole.userRole,
    userPermission     					: state.assignRole.userPermission,
    userLevel 							: state.assignRole.userLevel,
    userFeatures 						: state.assignRole.userFeatures,
    isUserRolesPermissionsLoaded     	: state.assignRole.isUserRolesPermissionsLoaded,

    dispute_record : state.report.dispute_record
  }
}
  
const mapDispatchToProps = (dispatch) => {
  return {
    // fetchUserDispute       		: () => dispatch( fetchUserDispute() ),
    fetchUserRolePermission       	: ( user_id ) => dispatch( fetchUserRolePermission( user_id ) ),
    fetchUserFeatures       	: ( user_id ) => dispatch( fetchUserFeatures( user_id ) ),

    assignRolesPermissions  : ( user_id , post_data ) => dispatch( assignRolesPermissions( user_id , post_data ) ),
    assignLevelFeatures  : ( user_id , post_data ) => dispatch( assignLevelFeatures( user_id , post_data ) ),
    getDisputeReport  : ( dispute_id ) => dispatch( getDisputeReport( dispute_id ) ),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DisputeForm);

