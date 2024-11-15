import React, { useState, useEffect } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { connect,useDispatch } from 'react-redux';
import { useFormikContext } from 'formik';
import Select from "react-select";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import {
  fecthUserContry,
} from "./PayrollReportApi.js";
import Wrapper from "../../components/Template/Wrapper";
import "./ViewReport.css";

import { clearOpsScheduleInstance } from "../../store/actions/opsschedule/opsScheduleActions.js";
const ViewReport = (props) => {
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");
    const [noofdays, setNoofdays] = useState("");
    const [currentmonth, setCurrentmonth] = useState("");
    const [text, settext] = useState("");
    const [text1, settext1] = useState("");
    const [newrow, setNewrow] = useState(false);
    const [datayear, setDatayear] = useState([]);
    const [validmonth, setvalidmonth] = useState(false);
    const [validyear, setvalidyear] = useState(false);
    const [validcountry, setvalidcountry] = useState(false);
    const [datatimeoff,Setdatatimeoff] = useState([]);
    const [datatimeoffnew,Setdatatimeoffnew] = useState([]);
    const [datatimeoffbelgium,Setdatatimeoffbelgium] = useState([]);
    const [datatimeoffmoroco,Setdatatimeoffmoroco] = useState([]);
    const [country,setCountry] = useState({});
    const [countryid,setCountryid] = useState("");
    const dispatch = useDispatch();

    const { user, usercountry } = props;
    useEffect(() => {
      const currentYear = new Date().getFullYear();
      const yearsArray = [];
      for (let year = 2024; year <= currentYear; year++) {
        yearsArray.push(year);
      }
      yearsArray.sort((a, b) => b - a);
      setDatayear(yearsArray); 
      dispatch(fecthUserContry());
    }, []);



    const getMonthName = (monthNumber) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[monthNumber - 1];
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

    const handlesave = async (e) => {
      settext(currentmonth + " 01 - " + currentmonth + " " + getDaysInMonth(year,month));
      settext1(((month - 1) == 0 ? getMonthName(12) + " 21 - " + currentmonth + " 20" : getMonthName(month - 1) + " 21 - " + currentmonth + " 20"));
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
          // url: `/report/timeoff_allocation?timeoff_year=${year}&timeoff_month=${month}&country=${countryid}`,
          url: `/report/timeoff_allocation?timeoff_year=${year}&timeoff_month=${month}`,
        })
          .then((result) => {
            console.log(result);
            // dispatch(Formatter.alert_success(result, 3000));
            if (result.status == 200) {
              console.log(result.data.content.
                timeoffItems);
              Setdatatimeoff(result.data.content.
                timeoffItems)
                Setdatatimeoffnew(result.data.content.
                  timeoffItemsnew)
                  // Setdatatimeoffbelgium(result.data.content.
                  //   timeoffItemsbelgium)
                  //   Setdatatimeoffmoroco(result.data.content.
                  //     timeoffItemsmoroco)
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
          url: `/report/timeoff_allocation?timeoff_year=${year}&timeoff_month=${month}&export=1&country=${countryid}`,
        })
          .then((result) => {

            const url = window.URL.createObjectURL(new Blob([result.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', "India_Payroll_Report_"+getMonthName(month)+"_"+year+".csv");
            document.body.appendChild(link);
            link.click();

            // var fileURL = window.URL.createObjectURL(new Blob([result.data]));
            //     var fileLink = document.createElement('a');
            //     fileLink.href = fileURL;
            //     fileLink.setAttribute('download', 'Timeoff_report.xlsx');
            //     document.body.appendChild(fileLink);
            //     fileLink.click();
            //     document.body.removeChild(fileLink);
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
                        <h2 className="page-title">India Payroll Report</h2>
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
                          setCurrentmonth(getMonthName(e.target.value));
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

                        {/* <Col size="3"> 
                        <div className="form-group">
                    <select
                      name="type"
                      className="form-control"
                      required
                      value={countryid}
                      onChange={(e) => {
                        console.log(e.target.value,"CountryId");
                        setCountryid(e.target.value);
                        if (e.target.value == "") {
                          setvalidcountry(true);
                        } else {
                          setvalidcountry(false);
                        }
                      }}
                    >
                      <option value="">- Select Country -</option>
                      {usercountry && usercountry.length > 0 &&
                        usercountry.map((country, pos) => (
                          <option value={country.country_id}>
                            {country.country_name}
                          </option>
                        ))}
                    </select>
                    {validcountry && (
                      <label style={{ color: "red" }}>
                        Please Select Country
                      </label>
                    )}
                  </div>
                        </Col> */}

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
            <Table striped bordered hover tableheader>
                <thead>
                  <tr>
                    <th className="tableheader" rowspan="2">Sno</th>
                    <th className="tableheader" rowspan="2">Employee Name</th>
                    <th className="tableheader" rowspan="2">Employment Status</th>
                    <th className="tableheader" rowspan="2">Account</th>
                    <th className="tableheader" rowspan="2">Start Date</th>
                    <th className="tableheader" rowspan="2">Present Days <br></br> {text}</th>
                    <th className="tableheader" colspan="2">No of Lv availed <br></br> {text1}</th>
                    <th className="tableheader" rowspan="2">Max Lv Eligible</th>
                    <th className="tableheader" colspan="2">Prev. Used</th>
                    <th className="tableheader" rowspan="2">Clos. Bal</th>
                  </tr>
                  <tr>  
                  <th className="tableheader">Paid</th>
                  <th className="tableheader">LWP</th>
                  <th className="tableheader">Paid</th>
                  <th className="tableheader">LWP</th>
                  </tr>
                </thead>
                <tbody>
              
                  {datatimeoff.map((timeoff, pos) => (
                    <tr>
                      <td>{timeoff.Sno}</td>
                      <td>{timeoff.Employee_Name}</td>
                      <td>{timeoff.Employee_status}</td>
                      <td>{timeoff.Account}</td>
                      <td>{timeoff.startdate}</td>
                      <td>{timeoff.presentdays} </td>
                      <td>{timeoff.AvaiPaid} </td>
                      <td>{timeoff.AvaiLWP}</td>
                      <td>{timeoff.MaxLv}</td>
                      <td>{timeoff.PrePais}</td>
                      <td>{timeoff.PreLWP} </td>
                      <td>{timeoff.CloseBal} </td>
                    </tr>
                  ))}
                  {datatimeoffnew.length > 0 ?
                  <tr>
                  <td colspan="3" className="newhire">

                  NEW HIRE ({text1})

                  </td>
                 

                </tr>
                : ""
                  }
                {datatimeoffnew.map((timeoff, pos) => (
                    <tr>
                      <td>{timeoff.Sno}</td>
                      <td>{timeoff.Employee_Name}</td>
                      <td>{timeoff.Employee_status}</td>
                      <td>{timeoff.Account}</td>
                      <td>{timeoff.startdate}</td>
                      <td>{timeoff.presentdays} </td>
                      <td>{timeoff.AvaiPaid} </td>
                      <td>{timeoff.AvaiLWP}</td>
                      <td>{timeoff.MaxLv}</td>
                      <td>{timeoff.PrePais}</td>
                      <td>{timeoff.PreLWP} </td>
                      <td>{timeoff.CloseBal} </td>
                    </tr>
                  ))}
                 {/* {datatimeoffbelgium.length > 0 ?
                  <tr>
                  <td colspan="3" className="newhire">

                  BELGIUM HOLIDAYS TAKEN

                  </td>
                 

                </tr>
                : ""
                  }
                   {datatimeoffbelgium.map((timeoff, pos) => (
                    <tr>
                      <td>{timeoff.Sno}</td>
                      <td>{timeoff.Employee_Name}</td>
                      <td>{timeoff.Employee_status}</td>
                      <td>{timeoff.Account}</td>
                      <td>{timeoff.startdate}</td>
                      <td>{timeoff.presentdays} </td>
                      <td>{timeoff.AvaiPaid} </td>
                      <td>{timeoff.AvaiLWP}</td>
                      <td>{timeoff.MaxLv}</td>
                      <td>{timeoff.PrePais}</td>
                      <td>{timeoff.PreLWP} </td>
                      <td>{timeoff.CloseBal} </td>
                    </tr>
                  ))} */}
                  {/* {datatimeoffmoroco.length > 0 ?
                  <tr>
                  <td colspan="3" className="newhire">

                  MOROCCO HOLIDAYS TAKEN

                  </td>
                 

                </tr>
                : ""
                  }
                   {datatimeoffmoroco.map((timeoff, pos) => (
                    <tr>
                      <td>{timeoff.Sno}</td>
                      <td>{timeoff.Employee_Name}</td>
                      <td>{timeoff.Employee_status}</td>
                      <td>{timeoff.Account}</td>
                      <td>{timeoff.startdate}</td>
                      <td>{timeoff.presentdays} </td>
                      <td>{timeoff.AvaiPaid} </td>
                      <td>{timeoff.AvaiLWP}</td>
                      <td>{timeoff.MaxLv}</td>
                      <td>{timeoff.PrePais}</td>
                      <td>{timeoff.PreLWP} </td>
                      <td>{timeoff.CloseBal} </td>
                    </tr>
                  ))} */}
                </tbody>
              </Table>
            
            </div>
                 
                </ContainerBody>  
                </ContainerWrapper>
              </Wrapper>
          </form>
      
        
          )}
const mapStateToProps = (state) => {
    return {
      user: state.user,
      usercountry: state.dashboard.my_country,
    };
};

export default connect(mapStateToProps)(ViewReport)