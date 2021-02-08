
import { viewEmployeeDtr, getFilterForDtr, setSelectedPayrollCutoff,getUserDtrSummary } from '../../store/actions/dtr/dtrActions';
import { fetchUser } from '../../store/actions/userActions'
import { setRedirect } from '../../store/actions/redirectActions';

import React, { Component } from "react";
import "./DailyTimeRecord.css";

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

class DailyTimeRecord extends Component {

    constructor(props){
        super(props);

        this.initialState = {

          selectedYear : {},
          selectedMonth : {},
          selectedPayrollCutoff: {},
          
          isCurrentPayrollCutoffLoaded : false,
          isDtrSummaryLoaded : true
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

        this.props.viewEmployeeDtr(this.props.params.id, payrollCutoff.start_date, payrollCutoff.end_date);

        this.props.getUserDtrSummary(this.props.params.id, payrollCutoff.start_date, payrollCutoff.end_date);


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

      await this.props.viewEmployeeDtr(this.props.params.id , payrollCutoff.start_date, payrollCutoff.end_date);

      await this.props.getUserDtrSummary(this.props.params.id, payrollCutoff.start_date, payrollCutoff.end_date);
      
      await this.props.setSelectedPayrollCutoff( payrollCutoff );
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
        
        var holidaycolumn = [];
        var dtrSummaryData = this.props.dtr.dtrSummary.data;
       
        for (var key in this.props.dtr.dtrSummary.column) {
          holidaycolumn.push(key);
        }
        
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

        console.log(this.props);
        return (
        <Wrapper>
          <ContainerWrapper>
            <ContainerBody>
          
              <Content col="12" title="Daily Time Record" subtitle={ <BackButton {...this.props}/> } subtitle={<RequestSubtitle method={method} user={this.props.dtr.employeeInfo} />} >
                { this.props.dtr.isFilterLoaded? 
                    <div className="dtr-filter col-6 col-md-12 col-sm-12 "> 
                      
                      <Select
                        name="year"
                        value={this.state.selectedYear}
                        className="year-dropdown"
                        onChange={this.handleSelectYear}
                        options={yearOptions}
                        placeholder="Select Year"
                      />

                      { Validator.isValid( this.state.selectedYear?.value ) ?
                          
                          <Select
                            name="month"
                            value={this.state.selectedMonth}
                            className="month-dropdown"
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
                            className="payroll-cutoff-dropdown"
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
                
              { this.props.dtr.isDtrLoaded && Validator.isValid( this.state.selectedYear?.value ) && Validator.isValid( this.state.selectedMonth?.value ) && this.state.selectedPayrollCutoff?.value != undefined  ?
                <React.Fragment>
                  { this.props.dtr.isDtrSummaryLoaded? 
                  <Row>
                    <Col>
                      <Toast >
                        <Toast.Header>
                          <strong className="mr-auto">LATE</strong> 
                        </Toast.Header>
                        <Toast.Body>{this.props.dtr.dtrSummary.data.reg.late} hr</Toast.Body>
                      </Toast>
                    </Col>
                    <Col>
                      <Toast >
                        <Toast.Header>
                          <strong className="mr-auto">UNDERTIME</strong>
                        </Toast.Header>
                        <Toast.Body>{this.props.dtr.dtrSummary.data.reg.undertime} hr</Toast.Body>
                      </Toast>
                      </Col>
                  <Col>
                  <Toast >
                    <Toast.Header>
                      <strong className="mr-auto">NIGHT DIFF</strong>
                    </Toast.Header>
                    <Toast.Body>{this.props.dtr.dtrSummary.data.reg.night_diff} hr</Toast.Body>
                  </Toast>
                  </Col>
                  <Col>
                  <Toast >
                    <Toast.Header>
                      <strong className="mr-auto">OVERTIME</strong>
                    </Toast.Header>
                    <Toast.Body>{this.props.dtr.dtrSummary.data.reg.overtime} hr</Toast.Body>
                  </Toast>
                  </Col>
                  <Col>
                  <Toast >
                    <Toast.Header>
                      <strong className="mr-auto">OT w/ ND</strong>
                    </Toast.Header>
                    <Toast.Body>{this.props.dtr.dtrSummary.data.reg.overtime_night_diff} hr</Toast.Body>
                  </Toast>
                  </Col>
                  <Col>
                  <Toast >
                    <Toast.Header>
                      <strong className="mr-auto">ABSENT</strong>
                    </Toast.Header>
                    <Toast.Body>{this.props.dtr.dtrSummary.data.reg.ul} day/s</Toast.Body>
                  </Toast>
                  </Col>
                   {holidaycolumn.map((dtr_type, index) => {
                   return (<DtrSummaryHolidays holiday={dtr_type} nd={eval('dtrSummaryData?.' + dtr_type+'?.night_diff')}  ot={eval('dtrSummaryData?.' + dtr_type+'?.overtime')}
                   rd={eval('dtrSummaryData?.' + dtr_type+'?.rendered_hours')} ot_nd={eval('dtrSummaryData?.' + dtr_type+'?.overtime_night_diff')}/>);
                    })}
                  </Row>
                  : 
                  null
              } 

                <Table responsive hover dtr-table>
                    <thead>
                        <tr>
                            <th className="dtr-date">Date</th>
                            <th className="dtr-status">Status</th>
                            <th className="dtr-schedule">Schedule</th>
                            <th className="dtr-log">Clock In</th>
                            <th className="dtr-log">Clock Out</th>
                            <th className="dtr-item">Late</th>
                            <th className="dtr-item">Undertime</th>
                            <th className="dtr-item">NightDiff</th>
                            <th className="dtr-item">Overtime</th>
                            <th className="dtr-item">OT w/ ND</th>
                            <th className="dtr-requests">Requests STATUS</th>
                            <th className="dtr-actions"><i></i></th>
                        </tr>
                    </thead>
                    <tbody>
                    {this.props.dtr.list.map((dtr, index) => {

                          // Get the Alter Log instance including it's ID and Status to be used for the Alter Log Button
                          let alter_log_id = null;
                          let alter_log_status = null;
                          
                          {dtr.requests.map((request, index) => {
                              if( request.request_type == "alter_log" ) {
                                  alter_log_id = request.id;
                                  alter_log_status = request.status;
                              }
                          })};

                          let dtr_type = dtr.attendance_status.slug;
                          let status = <div><div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></div>;

                          // If the attendance status is absent but has a holiday, set the dtr_type and status to holiday
                          if( dtr.attendance_status.slug == 'absent' && dtr.holidays.length > 0){
                              dtr_type = "holiday";
                              status = <div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></div>;
                          } 
                          
                          // If the DTR date is beyond the current date, don't show the DTR row by returning null.
                          if( moment().diff(moment(dtr.date)) < 0 ) {
                            return null;
                          }

                          return <tr className={"center "+dtr_type+"-bg-color"}>
                                  <td className="dtr-date">{DtrFormatter.displayDate(dtr.date)}</td> 
                                  <td className="dtr-status">{status}</td>
                                  <td className="dtr-schedule"><div>{DtrFormatter.displaySchedule(dtr)}</div></td>
                                  <td className="dtr-log"><div>{DtrFormatter.displayLog(dtr.time_in)}</div></td>
                                  <td className="dtr-log"><div>{DtrFormatter.displayLog(dtr.time_out)}</div></td>
                                  <td className="dtr-item">{dtr?.payroll_items?.late}</td>
                                  <td className="dtr-item">{dtr?.payroll_items?.undertime}</td>
                                  <td className="dtr-item">{dtr?.payroll_items?.night_diff}</td>
                                  <td className="dtr-item">{dtr?.payroll_items?.overtime}</td>
                                  <td className="dtr-item">{dtr?.payroll_items?.overtime_night_diff}</td>
                                  <td className="requests-list">{<DtrRequest requests={dtr.requests}/>}</td>
                                  <td className="dtr-actions">
                                      {
                                        ( this.props.params.id == this.props.user.id 
                                          && alter_log_status != "approved" ) ?
                                        <Link className="btn btn-primary" 
                                              title="Alter Log"
                                              to={{
                                                pathname: global.base_url +'request/AlterLog/' + (( alter_log_id != null ) ? alter_log_id : ""),
                                                previousPath: this.props.location.pathname, 
                                                date: dtr.date,
                                                current_time_in: dtr.time_in,
                                                current_time_out: dtr.time_out
                                              }}
                                        >
                                        <i className="fa fa-edit" 
                                           style={{color : "#ffffff" }}></i>
                                        </Link>
                                        :
                                        null
                                      }
                                    </td>
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
  <Col>
      <Toast >
        <Toast.Header>
          <strong className="mr-auto">DAY</strong> 
        </Toast.Header>
        <Toast.Body>{props.rd}</Toast.Body>
      </Toast>
    </Col>
    <Col>
    <Toast >
      <Toast.Header>
        <strong className="mr-auto">OT</strong> 
      </Toast.Header>
      <Toast.Body>{props.ot}</Toast.Body>
    </Toast>
  </Col>
  <Col>
  <Toast >
    <Toast.Header>
      <strong className="mr-auto">ND</strong> 
    </Toast.Header>
    <Toast.Body>{props.nd}</Toast.Body>
  </Toast>
</Col>
<Col>
<Toast >
  <Toast.Header>
    <strong className="mr-auto">OT W/ ND</strong> 
  </Toast.Header>
  <Toast.Body>{props.ot_nd}</Toast.Body>
</Toast>
</Col>
</React.Fragment>);
}

// Component for the DTR Request List
const DtrRequest = (props) => { 
  return <ul style={{ listStyle: 'none'}}>
      {props.requests.map((request, index) => {
          return <li className={Formatter.slug_to_title( request.status )}><span className="circ"></span>{Formatter.slug_to_title( request.request_type )} - <span>{Formatter.slug_to_title( request.status )}</span></li> 
      })}
  </ul>;
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
    getUserDtrSummary : (user_id,from,to , isInitialLoad) => dispatch( getUserDtrSummary(user_id,from,to , isInitialLoad) ),
    getFilterForDtr : (user_id) => dispatch( getFilterForDtr(user_id) ),
    setSelectedPayrollCutoff :   ( payrollCutoff ) => dispatch( setSelectedPayrollCutoff( payrollCutoff ) ),
    setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DailyTimeRecord);
