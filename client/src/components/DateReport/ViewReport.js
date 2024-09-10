import React, { useState, useEffect } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { connect,useDispatch } from 'react-redux';
import { useFormikContext } from 'formik';
import Select from "react-select";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import "./ViewReport.css";
import { clearOpsScheduleInstance } from "../../store/actions/opsschedule/opsScheduleActions.js";
const ViewReport = () => {
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [datayear, setDatayear] = useState([]);
    const [validmonth, setvalidmonth] = useState(false);
    const [validyear, setvalidyear] = useState(false);
    const [datatimeoff,Setdatatimeoff] = useState([]);
    const dispatch = useDispatch();
    useEffect(() => {
      const currentYear = new Date().getFullYear();
      const yearsArray = [];
      for (let year = 2011; year <= currentYear; year++) {
        yearsArray.push(year);
      }
      setDatayear(yearsArray); 
    }, []);

    const handlesave = async (e) => {
      console.log("test");
      if (year == "" && month == "") {
        setvalidyear(true);
        setvalidmonth(true);
      }else if (year == "") {
        setvalidyear(true);
      }else if(month == ""){
        setvalidmonth(true);
      }else{
        await API.call({
          method: "GET",
          url: `/report/timeoff_allocation?timeoff_year=${year}&timeoff_month=${month}`,
        })
          .then((result) => {
            console.log(result);
            dispatch(Formatter.alert_success(result, 3000));
            if (result.status == 200) {
              console.log(result.data.content.
                timeoffItems);
              Setdatatimeoff(result.data.content.
                timeoffItems)
            }
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
      }
    }
    const exporthandlesave = async (e) => {
      console.log("test");
      if (year == "" && month == "") {
        setvalidyear(true);
        setvalidmonth(true);
      }else if (year == "") {
        setvalidyear(true);
      }else if(month == ""){
        setvalidmonth(true);
      }else{
        await API.call({
          method: "GET",
          url: `/report/timeoff_allocation?timeoff_year=${year}&timeoff_month=${month}&export=1`,
        })
          .then((result) => {
console.log(result);
            var fileURL = window.URL.createObjectURL(new Blob([result.data]));
                var fileLink = document.createElement('a');
                fileLink.href = fileURL;
                fileLink.setAttribute('download', 'TimeoffAllocationExport.csv');
                document.body.appendChild(fileLink);
                fileLink.click();
                document.body.removeChild(fileLink);
          })
          .catch((e) => {
            dispatch(Formatter.alert_error(e));
          });
      }
    }

  return (
 
          <form>
            <Wrapper>
                <ContainerWrapper>   
                    <ContainerBody>  
                        <h2 className="page-title">TimeOff Allocation Report</h2>
                        <div className="content-table">
                      
                        <Row className="filters filter-dtr">  
                        <Col size="3">
                        <div className="form-group">
                    <select
                      name="type"
                      className="form-control"
                      required
                      value={month}
                      onChange={(e) => {
                        setMonth(e.target.value);
                        if (e.target.value == "") {
                          setvalidmonth(true);
                        } else {
                          setvalidmonth(false);
                        }
                      }}
                    >
                      <option value="">- Select Month -</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    {validmonth && (
                      <label style={{ color: "red" }}>
                        Please Select Month
                      </label>
                    )}
                  </div>
                </Col>
                        <Col size="3"> 
                        <div className="form-group">
                    <select
                      name="type"
                      className="form-control"
                      required
                      value={year}
                      onChange={(e) => {
                        setYear(e.target.value);
                        if (e.target.value == "") {
                          setvalidyear(true);
                        } else {
                          setvalidyear(false);
                        }
                      }}
                    >
                      <option value="">- Select Year -</option>
                      {datayear.length > 0 &&
                        datayear.map((years, pos) => (
                          <option value={years}>
                            {years}
                          </option>
                        ))}
                    </select>
                    {validyear && (
                      <label style={{ color: "red" }}>
                        Please Select Year
                      </label>
                    )}
                  </div>
                        </Col>

                        <Col size="2"> 
                          
                            <Button variant="primary" className="mr-2" onClick={handlesave}>
                              <i className="fa fa-filter" /> Filter
                            </Button>
          
                            <Dropdown className="export-drop-down" onClick={exporthandlesave}>
                              <Dropdown.Toggle variant="success" id="dropdown-basic">
                                  <i className="fa fa-download" /> Export
                              </Dropdown.Toggle>
                            </Dropdown>
                          
                        </Col> 
                      </Row>
                      
                 </div>  

            <div className="mt-4 mb-3">
            <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>EmployeeNo</th>
                    <th>Name</th>
                    <th>TimeOff Type</th>
                    <th>Description</th>
                    <th>Duration</th>
                    <th>ValidFrom</th>
                    <th>ValidTo</th>
                    <th>RemainingDays</th>
                    <th>AllocationType</th>
                  </tr>
                </thead>
                <tbody>
               
                  {datatimeoff.map((timeoff, pos) => (
                    <tr>
                      <td>{timeoff.Employee_Number}</td>
                      <td>{timeoff.Employee_Name}</td>
                      <td>{timeoff.Timeoff_Type}</td>
                      <td>{timeoff.Description} </td>
                      <td>{timeoff.Duration + " Days"} </td>
                      <td>{timeoff.ValidFrom}</td>
                      <td>{timeoff.ValidTo}</td>
                      <td>{timeoff.RemainingDays}</td>
                      <td>{timeoff.AllocationType} </td>
                    </tr>
                  ))}

                </tbody>
              </Table>
            
            </div>
                 
                </ContainerBody>  
                </ContainerWrapper>
              </Wrapper>
          </form>
      
        
          )}


export default ViewReport
