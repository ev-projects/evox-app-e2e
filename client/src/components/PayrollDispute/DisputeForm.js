import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Authenticator from "../../services/Authenticator";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import Wrapper from "../Template/Wrapper";
import { connect,useDispatch } from 'react-redux';
import { useParams, useHistory} from "react-router-dom";
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
import {fetchUserRolePermission,assignRolesPermissions,  fetchUserFeatures, assignLevelFeatures,fetchUserDispute } from '../../store/actions/admin/assignRoleActions'
function DisputeForm(props) {
  let history = useHistory();
  const { userLists,user, payroll} = props;
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
    Valid_To:''
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
    const month = new Date().getMonth() + 1;
    const date =  new Date().getDate();
    const year =  new Date().getFullYear();
    const formattedDay = String(date).padStart(2, '0');
    // const fromdate = year+"-"+ month -1+"-"+15;
    // const todate = year+"-"+ month+"-"+16;
    
   
    if(formattedDay > 15){

      handleCutoff(year+"-"+ (month)+"-"+"16",year+"-"+ (month+1) +"-"+"15");
    }else{

      handleCutoff(year+"-"+ (month-1) +"-"+"16",year+"-"+ (month) +"-"+"15");
    }
  }else{

    fetchDisputes();

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    // alert(formData5.Payroll_Period);
   if(!formData.dispute_type && !formData.description){
    e.preventDefault();    
    setFormvalidate1({
      ...formvalidate,
      ["dispute_type"]: "Please Enter DisputeType",
      ["description"]: "Please Enter Description",
      
    });
    window.scrollTo(0, 0);
    inputRef.current.focus();
   }else if(!formData.dispute_type){
    e.preventDefault();    
    setFormvalidate1({
      ...formvalidate,
      ["dispute_type"]: "Please Enter DisputeType",
    });
    window.scrollTo(0, 0);
    inputRef.current.focus();
   }else if(!formData.description){
    e.preventDefault();    
    setFormvalidate1({
      ...formvalidate,
      ["description"]: "Please Enter Description",
    });
    window.scrollTo(0, 0);
    inputRef1.current.focus();
   }else{
    e.preventDefault();
    const allEmpty = stringFields.every(field => formData[field] === "");
    if(allEmpty){
      e.preventDefault();   
      dispatch(Formatter.alert_error_message("Please fill in at least one dispute value."));
      window.scrollTo(0, 0);
      inputref3.current.focus();
    }
    else if(!formData.employee_id){
      e.preventDefault();
      dispatch(Formatter.alert_error_message("Please select an employee."));
      // setValidateeid(false);   
    }else{
      e.preventDefault();    
      // setFormData({
      //   ...formData,
      //   ["Payroll_Period"]: inputref4.current.value,
      // });
    try {
        API.call({
            method: "post",
            url: "/storedispute",
            data: formData
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
          setEmployeeName('');
          window.scrollTo(0, 0);
          setUserid("");
          handleblur();

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    } catch (error) {
      console.error("Error submitting dispute:", error);
    }
  }
  }
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
            <h2>Create Dispute</h2>
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
           
            <label></label>
                <div className="form-group">
                 {employeeDetails && ( <div> <p>Employee Number: {formData1.emp_num} <br></br> Department: {formData1.department_name}<br></br>First Name: {formData1.first_name} <br></br> Last Name: {formData1.last_name}</p></div> )}
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
                  <label>Payroll Cutoff:</label>
                  <input
                    type="text"
                    placeholder="Enter Payroll Cutoff"
                    className="form-control"
                    disabled  
                    name='Payroll_Cutoff'
                    style={{"font-weight": "bold","color":"green !important"}}
                    value={formData.Payroll_Cutoff}
                    onChange={handleChange}
                  />
                </div>
              </Col>  
              <Col size="3">
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
              </Col>

              <Col size="3">
                <div className="form-group">
                  <label>Description:* {formvalidate1.description && <span style={{"color" : "red"}}>{formvalidate1.description}</span>}</label>
                  <textarea
                    placeholder="Enter Description"
                    className="form-control"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    disabled = {!props.params.id ? false : true }
                    ref={inputRef1}
                  />
                </div>
              </Col>
            </Row>
            <Row>
         
              <Col size="3">
                <div className="form-group">
                  <label>LWOP: {formvalidate.LWOP && <span style={{"color" : "red"}}>{formvalidate.LWOP}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter LWOP"
                    className="form-control"
                    name='LWOP'
                    ref={inputref3}
                    value={formData.LWOP}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>UT: {formvalidate.UT && <span style={{"color" : "red"}}>{formvalidate.UT}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter UT"
                    className="form-control"
                    name='UT'
                    value={formData.UT}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
           
            
              <Col size="3">
                <div className="form-group">
                  <label>Tardiness: {formvalidate.TARDINESS && <span style={{"color" : "red"}}>{formvalidate.TARDINESS}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Tardiness"
                    className="form-control"
                    name='TARDINESS'
                    value={formData.TARDINESS}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                    pattern='[0-9]'
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Late: {formvalidate.Late && <span style={{"color" : "red"}}>{formvalidate.Late}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Late"
                    className="form-control"
                    name='Late'
                    value={formData.Late}
                    disabled = {!props.params.id ?false : true }
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Night Shift Diff: {formvalidate.Night_Shift_Diff && <span style={{"color" : "red"}}>{formvalidate.Night_Shift_Diff}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Night Shift Diff"
                    className="form-control"
                    name='Night_Shift_Diff'
                    value={formData.Night_Shift_Diff}
                    disabled = {!props.params.id ?false : true }
                    onChange={handleChange}
                  />
                </div>
              </Col>
         
              <Col size="3">
                <div className="form-group">
                  <label>Over Time: {formvalidate.Overtime && <span style={{"color" : "red"}}>{formvalidate.Overtime}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter OverTime"
                    className="form-control"
                    name='Overtime'
                    value={formData.Overtime}
                    disabled = {!props.params.id ?false : true }
                    onChange={handleChange}
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>OT with NSD: {formvalidate.OT_with_NSD && <span style={{"color" : "red"}}>{formvalidate.OT_with_NSD}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter OT With NSD"
                    className="form-control"
                    name='OT_with_NSD'
                    value={formData.OT_with_NSD}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day: {formvalidate.Rest_Day && <span style={{"color" : "red"}}>{formvalidate.Rest_Day}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Rest Day"
                    className="form-control"
                    name='Rest_Day'
                    value={formData.Rest_Day}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
            {formData1.department_name === 'Solutions30' ?
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day 200: {formvalidate.Rest_Day_200 && <span style={{"color" : "red"}}>{formvalidate.Rest_Day_200}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Rest Day 200"
                    className="form-control"
                    name='Rest_Day_200'
                    value={formData.Rest_Day_200}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              : ""
              }
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Work with NSD: {formvalidate.Rest_Day_Work_With_NSD && <span style={{"color" : "red"}}>{formvalidate.Rest_Day_Work_With_NSD}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Rest Day Work With NSD"
                    className="form-control"
                    name='Rest_Day_Work_With_NSD'
                    value={formData.Rest_Day_Work_With_NSD}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Work With OT: {formvalidate.Rest_Day_Work_With_OT && <span style={{"color" : "red"}}>{formvalidate.Rest_Day_Work_With_OT}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Rest Day Work With OT"
                    className="form-control"
                    name='Rest_Day_Work_With_OT'
                    value={formData.Rest_Day_Work_With_OT}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
   
              <Col size="3">
                <div className="form-group">
                  <label>Rest Day Work NSD With OT: {formvalidate.Rest_Day_Work_NSD_With_OT && <span style={{"color" : "red"}}>{formvalidate.Rest_Day_Work_NSD_With_OT}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Rest Day Work NSD With OT"
                    className="form-control"
                    name='Rest_Day_Work_NSD_With_OT'
                    value={formData.Rest_Day_Work_NSD_With_OT}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday: {formvalidate.Legal_Holiday && <span style={{"color" : "red"}}>{formvalidate.Legal_Holiday}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Legal Holiday"
                    className="form-control"
                    name='Legal_Holiday'
                    value={formData.Legal_Holiday}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday With NSD: {formvalidate.Legal_Holiday_With_NSD && <span style={{"color" : "red"}}>{formvalidate.Legal_Holiday_With_NSD}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Legal Holiday With NSD"
                    className="form-control"
                    name='Legal_Holiday_With_NSD'
                    value={formData.Legal_Holiday_With_NSD}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
        
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday With Overtime: {formvalidate.Legal_Holiday_With_Overtime && <span style={{"color" : "red"}}>{formvalidate.Legal_Holiday_With_Overtime}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Legal Holiday With Overtime"
                    className="form-control"
                    name='Legal_Holiday_With_Overtime'
                    value={formData.Legal_Holiday_With_Overtime}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Legal Holiday OT With OT: {formvalidate.Legal_Holiday_OT_With_OT && <span style={{"color" : "red"}}>{formvalidate.Legal_Holiday_OT_With_OT}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Legal Holiday OT With OT"
                    className="form-control"
                    name='Legal_Holiday_OT_With_OT'
                    value={formData.Legal_Holiday_OT_With_OT}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday: {formvalidate.Special_Holiday && <span style={{"color" : "red"}}>{formvalidate.Special_Holiday}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Special Holiday"
                    className="form-control"
                    name='Special_Holiday'
                    value={formData.Special_Holiday}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              {formData1.department_name === 'Solutions30' ?
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday 200: {formvalidate.Special_Holiday_200 && <span style={{"color" : "red"}}>{formvalidate.Special_Holiday_200}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Special Holiday 200"
                    className="form-control"
                    name='Special_Holiday_200'
                    value={formData.Special_Holiday_200}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              :""}
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday With NSD: {formvalidate.Special_Holiday_With_NSD && <span style={{"color" : "red"}}>{formvalidate.Special_Holiday_With_NSD}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Special Holiday With NSD"
                    className="form-control"
                    name='Special_Holiday_With_NSD'
                    value={formData.Special_Holiday_With_NSD}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday With Overtime: {formvalidate.Special_Holiday_With_Overtime && <span style={{"color" : "red"}}>{formvalidate.Special_Holiday_With_Overtime}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Special Holiday With Overtime"
                    className="form-control"
                    name='Special_Holiday_With_Overtime'
                    value={formData.Special_Holiday_With_Overtime}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>

              <Col size="3">
                <div className="form-group">
                  <label>Special Holiday OT With OT: {formvalidate.Special_Holiday_OT_With_OT && <span style={{"color" : "red"}}>{formvalidate.Special_Holiday_OT_With_OT}</span>}</label>
                  <input
                    type="number"
                    placeholder="Enter Special Holiday OT With OT"
                    className="form-control"
                    name='Special_Holiday_OT_With_OT'
                    value={formData.Special_Holiday_OT_With_OT}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>

              <Col size="3">
                <div className="form-group">
                  <label>Referral Fee:</label>
                  <input
                    type="number"
                    placeholder="Enter Referral Fee"
                    className="form-control"
                    name='Referral_Fee'
                    value={formData.Referral_Fee}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>Bonus:</label>
                  <input
                    type="number"
                    placeholder="Enter Bonus"
                    className="form-control"
                    name='Bonus'
                    value={formData.Bonus}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>
              <Col size="3">
                <div className="form-group">
                  <label>LWOP Adjustment:</label>
                  <input
                    type="number"
                    placeholder="Enter LWOP Adjustment"
                    className="form-control"
                    name='LWOP_Adjustment'
                    value={formData.LWOP_Adjustment}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>

              <Col size="3">
                <div className="form-group">
                  <label>Commission:</label>
                  <input
                    type="number"
                    placeholder="Enter Commission"
                    className="form-control"
                    name='Commission'
                    value={formData.Commission}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>


              <Col size="3">
                <div className="form-group">
                  <label>BP's Remarks:</label>
                  <textarea
                    placeholder="Enter BP's Remarks"
                    className="form-control"
                    name="BPs_Remarks"
                    value={formData.BPs_Remarks}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                </div>
              </Col>

              <Col size="3">
                <div className="form-group">
                  <label>BPs Date Encoded:</label>
                  {!props.params.id ? 
                  <input
                    type="date"
                    placeholder="Enter BPs Date Encoded"
                    className="form-control"
                    name="BPs_Date_Encoded"
                    value={formData.BPs_Date_Encoded}
                    onChange={handleChange}
                    disabled = {!props.params.id ?false : true }
                  />
                  :
                  <input
                      type="text"
                      placeholder="BPs Date Encoded"
                      className="form-control"
                      value={formData.BPs_Date_Encoded}
                      disabled
                    ></input>
                  }
                </div>
              </Col>
              {(Authenticator.scanLevel("Payroll")) && (
              <Col size="3">
                <div className="form-group">
                  <label>Payroll Remarks:</label>
                  <textarea
                    placeholder="Enter Payroll Remarks"
                    className="form-control"
                    name="Payroll_Remarks"
                    value={formData.Payroll_Remarks}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Col>
              )}
              {(Authenticator.scanLevel("Payroll")) && (
              <Col size="3">
                <div className="form-group">
                  <label>Payout Inclusion:</label>
                  <input
                    type="text"
                    placeholder="Enter Payout Inclusion"
                    className="form-control"
                    name="Payout_Inclusion"
                    value={formData.Payout_Inclusion}
                    onChange={handleChange}
                    required
                  />
                </div>
              </Col>
               )}
                            {props.params.id ?
              <Col size="3">
                <div className="form-group">
                  <label>Status:</label>
                  <select
				  className="form-control" 
				  name="status"
          required
				  value={formData.status}
				  style={{ display: 'block' }}
                  onChange={handleChange}
				  >
				<option    label="Select Type" />
                <option value={"approve"} label={"Approve"} />
                <option value={"reject"} label={"Reject"} />
				</select>
                </div>
              </Col>
              : 
              ""
        //       <Col size="3">
        //         <div className="form-group">
        //           <label>Status:</label>
        // <input
				//   className="form-control" 
				//   name="status"
        //   type='text'
        //   required
				//   value={"open"}
				//   style={{ display: 'block' }}
        //   onChange={handleChange}
        //   disabled = {props.params.id ? false : true }
				// >
				// </input>                
        // </div>
        //       </Col>
              }
            </Row>
            <Row>
             { !props.params.id ? 
              <Col size="12">
                <div className="form-group">
                  <button type="submit" className="btn btn-primary">Submit Dispute</button>
                  { validateeid === false ?
                  <label style={{"color":"red"}}>*Employee ID Not Found</label> :
                  ""}
                </div>
              </Col>
              :
             <Col size="12">
               <div className="form-group">
                <button type="submit" className="btn btn-primary">Submit</button>
                { validateeid === false ?
                <label style={{"color":"red"}}>*Employee ID Not Found</label> :
                ""}
              </div>
            </Col>
             }
            </Row>
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
	}
  }
  
  const mapDispatchToProps = (dispatch) => {
	  return {
    // fetchUserDispute       		: () => dispatch( fetchUserDispute() ),
		fetchUserRolePermission       	: ( user_id ) => dispatch( fetchUserRolePermission( user_id ) ),
		fetchUserFeatures       	: ( user_id ) => dispatch( fetchUserFeatures( user_id ) ),
		
		assignRolesPermissions  : ( user_id , post_data ) => dispatch( assignRolesPermissions( user_id , post_data ) ),
		assignLevelFeatures  : ( user_id , post_data ) => dispatch( assignLevelFeatures( user_id , post_data ) ),
	  } 
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DisputeForm);

