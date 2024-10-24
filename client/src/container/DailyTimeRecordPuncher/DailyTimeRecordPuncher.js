
import { viewEmployeeDtr, getFilterForDtr, setSelectedPayrollCutoff,getUserDtrSummary, viewEmployeePunch } from '../../store/actions/dtr/dtrActions';
import { fetchUser } from '../../store/actions/userActions'
import { setRedirect } from '../../store/actions/redirectActions';

import React, { Component } from "react";
import "./DailyTimeRecordPuncher.css";

import { Container,Row,Col,Table,Image,Card,Spinner, Form,Button,InputGroup,FormControl,Toast  } from 'react-bootstrap';
import  BackButton from '../../components/Template/BackButton'

import moment from 'moment';
import Select from "react-select";
import { connect } from 'react-redux';
import DtrFormatter from '../../services/DtrFormatter';
import { Link } from "react-router-dom"; 
import { ContainerHeader,Content,ContainerWrapper, ContainerBody } from '../../components/GridComponent/AdminLte.js';
import RequestSubtitle from "../../components/RequestComponent/RequestButtons/RequestSubtitle";

import Formatter from '../../services/Formatter';
import Wrapper from '../../components/Template/Wrapper';
import Validator from '../../services/Validator';
import Authenticator from '../../services/Authenticator';
import { s } from '@fullcalendar/core/internal-common';

class DailyTimeRecordPuncher extends Component {

    constructor(props){
        super(props);

        this.initialState = {

          selectedYear : {},
          selectedMonth : {},
          selectedPayrollCutoff: {},
          
          isCurrentPayrollCutoffLoaded : false,
          isDtrSummaryLoaded : true,
          payrollCutoff_start: null,
          payrollCutoff_end: null,
          toggle_pov: false
        }
        
        this.state = this.initialState; 
    }

    

    // Function for handling the onChange of Select Year
    handleSelectYear = ( selected ) => {
      this.setState({
          selectedYear: Validator.isValid( selected ) ? selected : null,
          selectedMonth: {},
          selectedPayrollCutoff: {},
      });
    }

    // Function for handling the onChange of Select Month
    handleSelectMonth = ( selected ) => {
      this.setState({
          selectedMonth: Validator.isValid( selected ) ? selected : null,
          selectedPayrollCutoff: {},
      });
    }

    // Function for handling the onChange of Select Payroll Cutoff
    handleSelectPayrollCutoff = ( selected ) => {
      this.setState({
          selectedPayrollCutoff: Validator.isValid( selected ) ? selected : null,
      });

      // If there's a selected year, month, and payroll cutoff, fetch the DTR base on the selected cutoff.
      if( Validator.isValid( this.state.selectedYear ) 
          && Validator.isValid( this.state.selectedMonth ) 
          && Validator.isValid( selected ) ) {

        const payrollCutoff = this.props.dtr.filter[this.state.selectedYear.value][this.state.selectedMonth.value].data[selected.value]

        this.props.viewEmployeePunch(this.props.params.id, payrollCutoff.start_date, payrollCutoff.end_date);

        this.props.getUserDtrSummary(this.props.params.id, payrollCutoff.start_date, payrollCutoff.end_date);

      this.setState({
          payrollCutoff_start:payrollCutoff.start_date,
          payrollCutoff_end:payrollCutoff.end_date
        })

        this.props.setSelectedPayrollCutoff( payrollCutoff );
      }
    }


    // Sets the selected Payorll Cutoff Instance of the DTR filters.
    setPayrollCutoffInstance = async( payrollCutoff ) => {
      
      await this.setState({
        selectedYear: {
          label: payrollCutoff.year,
          value: payrollCutoff.year,
        },
        selectedMonth: {
          label: payrollCutoff.month_label,
          value: payrollCutoff.month,
        },
        selectedPayrollCutoff: {
          label: payrollCutoff.name,
          value: payrollCutoff.id,
        },
        isCurrentPayrollCutoffLoaded : true
      })

      await this.props.viewEmployeePunch(this.props.params.id , payrollCutoff.start_date, payrollCutoff.end_date);

      await this.props.getUserDtrSummary(this.props.params.id, payrollCutoff.start_date, payrollCutoff.end_date);
      
      await this.props.setSelectedPayrollCutoff( payrollCutoff );
      await this.setState({
        payrollCutoff_start:payrollCutoff.start_date,
        payrollCutoff_end:payrollCutoff.end_date
      })
      
     
      
    }

    


    componentWillMount(){
        // Get the Filters to be used for the DTR (Payroll Cutoffs)
        this.props.getFilterForDtr(this.props.params.id);
    }

    componentWillReceiveProps = async(nextProps) => {
      // If the 'settings' props is not yet loaded OR the settings prop is already loaded but the isCurrentPayrollCutoffLoaded is FALSE, set the default selected data.
      if( nextProps.settings != this.props.settings  ||
          ( nextProps.settings == this.props.settings && !this.state.isCurrentPayrollCutoffLoaded )) {
          
          // If there's a selected Payroll Cutoff AND there's no resetInitialState on the props, use it as the current instance.
          if( Object.keys(this.props.dtr.selectedPayrollCutoff).length > 0 && (nextProps.location.resetInitialState == undefined  || !nextProps.location.resetInitialState) ) {
            this.setPayrollCutoffInstance( this.props.dtr.selectedPayrollCutoff );

          // If there's NOT selected Payroll Cutoff OR there's a force reset of Initial State, use the default payroll cutoff instance.
          } else {
            this.setPayrollCutoffInstance( nextProps.settings.current_payroll_cutoff );
          }
      }

      
  }
    render(){
      
        var yearOptions = [];
        var monthOptions = [];
        var payrollCutoffOptions = [];

        const method = (this.props.user.id==this.props.params.id) ? 'store' : 'approval';

        // Construction of Year Options to be rendered in the select.
        for (const [key, value] of Object.entries(this.props.dtr.filter)) {
          // yearOptions.push(<option value={key}>{key}</option>);
          yearOptions.push({
            value : key,
            label : key,
          });
        };

        if( Object.keys(this.props.dtr.filter).length > 0 ) {
          // Construction of Month Options to be rendered in the select. Checks first if there's a selected Year before proceeding.
          if( Validator.isValid( this.state.selectedYear?.value ) ) {

              var monthKeys = Object.keys(this.props.dtr.filter[this.state.selectedYear.value]).sort();

              for (var i = 0; i < monthKeys.length; i++) {
                monthOptions.push({
                    value : monthKeys[i],
                    label : this.props.dtr.filter[this.state.selectedYear.value][monthKeys[i]].label,
                });
              }


              // Construction of Payroll Cutoff Options to be rendered in the select. Checks first if there's a selected Year and Month before proceeding.
              if( Validator.isValid( this.state.selectedMonth?.value ) ) {

                var payrollCutoffKeys = Object.keys(this.props.dtr.filter[this.state.selectedYear.value][this.state.selectedMonth.value].data).sort();
  
                for (var i = 0; i < payrollCutoffKeys.length; i++) {
                  payrollCutoffOptions.push({
                      value : this.props.dtr.filter[this.state.selectedYear.value][this.state.selectedMonth.value].data[payrollCutoffKeys[i]].id,
                      label : this.props.dtr.filter[this.state.selectedYear.value][this.state.selectedMonth.value].data[payrollCutoffKeys[i]].name,
                  });
                }
              }
              
          }
        }
        return (
        <Wrapper {...this.props} >
          <ContainerWrapper>
          <ContainerBody className="dtr-wrapper">
              <Content col="12" title="Punch History" subtitle={<RequestSubtitle method={method} user={this.props.dtr.employeeInfo} />} >
              
              <BackButton style={{'float': 'right'}} {...this.props}/>
             
                { this.props.dtr.isFilterLoaded? 
                    <div className="dtr-filter col-lg-12 col-md-12 col-sm-12 "> 
                      
                      <Select
                        name="year"
                        value={this.state.selectedYear}
                        className="year-dropdown col-lg-2 col-md-2 col-sm-3 col-12"
                        onChange={this.handleSelectYear}
                        options={yearOptions}
                        placeholder="Select Year"
                      />

                      { Validator.isValid( this.state.selectedYear?.value ) ?
                          
                          <Select
                            name="month"
                            value={this.state.selectedMonth}
                            className="month-dropdown  col-lg-2 col-md-3 col-sm-3 col-12"
                            onChange={this.handleSelectMonth}
                            options={monthOptions}
                            placeholder={"Select Payroll Cutoff"}
                          /> 
                        : 
                          null
                      }

                      { Validator.isValid( this.state.selectedYear?.value ) && Validator.isValid( this.state.selectedMonth?.value ) ?
                          
                          <Select
                            name="payroll_cutoff"
                            value={this.state.selectedPayrollCutoff}
                            className="payroll-cutoff-dropdown  col-lg-2 col-md-4 col-sm-3 col-12"
                            onChange={this.handleSelectPayrollCutoff}
                            options={payrollCutoffOptions}
                            placeholder={"Select Payroll Cutoff"}
                          />
                        : 
                          null
                      }
                    </div>
                  : 
                    null
                } 
                
              { this.props.dtr.isListPunchLoaded && Validator.isValid( this.state.selectedYear?.value ) && Validator.isValid( this.state.selectedMonth?.value ) && this.state.selectedPayrollCutoff?.value != undefined  ?
                <React.Fragment>
                  { this.props.dtr.isDtrSummaryLoaded? 
                    <DtrSummaryBlock computations={this.props.dtr.dtrSummary}  />
                  : 
                  null
              } 
              
              <div>
                {this.state.payrollCutoff_end != null ? 
                <div className="cutoff-text-border" >
                  <b>
                <span className="cutoff-text">{this.state.payrollCutoff_start}</span> <i class="fa fa-arrow-right" aria-hidden="true"></i>  <span className="cutoff-text">{this.state.payrollCutoff_end}</span>
                </b>
                </div>
                : null

                }


                {    this.props.params.id != this.props.user.id ? <div style={{'float': 'right'}}>
                    <Button className="toggle-outlook-dtr"
              onClick={() => this.setState({
                toggle_pov: !this.state.toggle_pov
              })}
              > <i class={"fa "+(this.state.toggle_pov ? "fa-eye":"fa-eye-slash")  } aria-hidden="true"></i> Toggle Outlook {this.state.toggle_pov}</Button>
              </div> : null }
              </div>

                  <Table className="responsive hover dtr-table">
                    <thead>
                        <tr>
                            <th className="dtr-date">Date</th>
                            <th className="dtr-log">Clock In  { this.props.params.id != this.props.user.id && this.state.toggle_pov == true? " ( "+ this.props.dtr.employeeInfo.timezone+" )": null}</th>
                            <th className="dtr-log">Clock Out  { this.props.params.id != this.props.user.id && this.state.toggle_pov == true? " ( "+ this.props.dtr.employeeInfo.timezone+" )": null}</th>
                            <th className="dtr-status">Log Action</th>
                            <th className="dtr-item">Render HR </th>
                            <th className="dtr-item">NSD</th>
                            <th className="dtr-item">OT</th>
                            <th className="dtr-item">OTND</th>
                            <th className="dtr-item">Projects and Remarks</th>
                           
                        </tr>
                    </thead>
                    <tbody>
                    {this.props.dtr.punch_list.map((punch, index) => {

                          // Get the Alter Log instance including it's ID and Status to be used for the Alter Log Button
                          
                          
                          // If the DTR date is beyond the current date, don't show the DTR row by returning null.
                          // if( moment().diff(moment(dtr.date)) < 0 ) {
                          //   return null;
                          // }

              

                          return <tr className={"center punch-row"}>
                                    <td className="punch-date">{DtrFormatter.displayDate(punch.date)}</td>
                                    <td className="punch-log">
                                      <ul className='punch-bullet'>
                                        {punch?.time_log.map((log, index) => {
                                          return(
                                            <li>
                                              {this.state.toggle_pov == false ?<>{log.time_in}</> :<>{log.owner_POV.time_in}</>}
                                           
                                            </li>)

                                        })}
                                      </ul>
                                    </td>
                                    <td className="punch-log">
                                      
                                      <ul className='punch-bullet'>
                                        {punch?.time_log.map((log, index) => {
                                          return(
                                            <li>
                                             
                                              {this.state.toggle_pov == false ?<>{log.time_out}</> :<>{log.owner_POV.time_out}</>}
                                            </li>)

                                        })}
                                      </ul>
                                    </td>
                                    <td className="punch-status"> 
                                        <ul className='punch-bullet'>
                                          {punch?.time_log.map((log, index) => {
                                            return(
                                              <li>
                                                {log.log_in_type}|{log.log_out_type}
                                              </li>)

                                          })}
                                        </ul>
                                      </td>
                                    <td className="punch-item">{punch?.payroll_items?.rendered_hours} </td>
                                    <td className="punch-item">{punch?.payroll_items?.night_diff}</td>
                                  <td className="punch-item">{punch?.payroll_items?.overtime}</td>
                                  <td className="punch-item">{punch?.payroll_items?.overtime_night_diff}</td>

                                  <td className="punch-item"><ul className='punch-bullet'>
                                          {punch?.time_log.map((log, index) => {
                                            return(
                                              <li>
                                                {/* {punch?.payroll_items?.project_name} -  {punch?.payroll_items?.project_name} */}
                                                {log.project_name} -{log.remarks}
                                              </li>)

                                          })}
                                        </ul></td>
                                 
                                   
                                </tr>
                    })}

    
                    </tbody>
                </Table>
                </React.Fragment> 
                :
                null  
              }
              </Content>
            </ContainerBody>
          </ContainerWrapper>          
        </Wrapper>
        );
        // }
        // return <PageLoading/>;
    }
};

// Component for the DTR Request List
const DtrSummaryHolidays = ( props  ) => { 
  return (<React.Fragment>
    <div className="holidays col-lg-2 col-md-4 col-sm-6">
    <h5>
      {/* <span className="ion-ios-calendar-outline"></span> */}
      <i class="fa fa-calendar" aria-hidden="true"></i>
    {props.column_name}</h5>
    <Row>
    
  <Col className="col-3">
      <Toast >
        <Toast.Header>
          DAY
        </Toast.Header>
        <Toast.Body>{( props.data?.rendered_hours !== undefined ) ? props.data?.rendered_hours: "0"}</Toast.Body>
      </Toast>
    </Col>
    <Col className="col-3">
  <Toast >
    <Toast.Header>
      ND
    </Toast.Header>
    <Toast.Body> {( props.data?.night_diff !== undefined ) ? props.data?.night_diff: "0"}</Toast.Body>
  </Toast>
</Col>
    <Col className="col-3">
    <Toast >
      <Toast.Header>
       OT
      </Toast.Header>
      <Toast.Body> {( props.data?.overtime !== undefined ) ? props.data?.overtime: "0"}</Toast.Body>
    </Toast>
  </Col>
  
<Col className="col-3">
<Toast >
  <Toast.Header>
    <strong className="mr-auto">OTND</strong> 
  </Toast.Header>
  <Toast.Body>  {( props.data?.overtime_night_diff !== undefined ) ? props.data?.overtime_night_diff: "0"}</Toast.Body>
</Toast>
</Col>
</Row>
</div>
</React.Fragment>);
}


// Component for the DTR Summary Block
const DtrSummaryBlock = ( props  ) => { 
  console.log();
  var holidaycolumn = [];
  var data = props.computations.data.reg;
      
  for (var key in props.computations.column) {
    holidaycolumn.push(key);
  }

  return (<React.Fragment>
                <Row className="SummaryBlock">
                  
                  <Col className="nsd  col-lg-2 col-md-2 col-sm-3">
                  <Toast >
                    <Toast.Header>
                      NSD
                    </Toast.Header>
                    <Toast.Body>{data.night_diff}</Toast.Body>
                  </Toast>
                  </Col>
                  <Col className="ot  col-lg-2 col-md-2 col-sm-3">
                  <Toast >
                    <Toast.Header>
                      OT
                    </Toast.Header>
                    <Toast.Body>{data.overtime}</Toast.Body>
                  </Toast>
                  </Col>
                  <Col className="otnd  col-lg-2 col-md-2 col-sm-3">
                  <Toast >
                    <Toast.Header>
                      OTND
                    </Toast.Header>
                    <Toast.Body>{data.overtime_night_diff}</Toast.Body>
                  </Toast>
                  </Col>
                  
                  {holidaycolumn.map((dtr_type, index) => {
                    return (<DtrSummaryHolidays column_name={eval('props.computations.column_names?.' + dtr_type)} data={eval('props.computations.data?.' + dtr_type)}/>);
                    })}
                  </Row>
</React.Fragment>);
}






const mapStateToProps = (state) => {
  return {
      dtr : state.dtr,
      settings: state.settings
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchUser : () => dispatch( fetchUser() ),
    viewEmployeeDtr : (user_id,from,to) => dispatch( viewEmployeeDtr(user_id,from,to) ),
    viewEmployeePunch: (user_id,from,to) => dispatch( viewEmployeePunch(user_id,from,to) ),
    getUserDtrSummary : (user_id,from,to , isInitialLoad) => dispatch( getUserDtrSummary(user_id,from,to , isInitialLoad) ),
    getFilterForDtr : (user_id) => dispatch( getFilterForDtr(user_id) ),
    setSelectedPayrollCutoff :   ( payrollCutoff ) => dispatch( setSelectedPayrollCutoff( payrollCutoff ) ),
    setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DailyTimeRecordPuncher);
