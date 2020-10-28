import { viewEmployeeDtr, getFilterForDtr } from '../../store/actions/dtrActions';
import { fetchUser } from '../../store/actions/userActions'

import React, { Component } from "react";
import "./DailyTimeRecord.css";

import { Container,Row,Col,Table,Image,Card,Spinner } from 'react-bootstrap';
import Select from "react-select";
import { connect } from 'react-redux';
import DtrFormatter from '../../services/DtrFormatter';
import { Link } from "react-router-dom"; 
import { ContainerHeader,Content,ContainerWrapper, ContainerBody } from '../../components/GridComponent/AdminLte.js';
import PageLoading from "../PageLoading";
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

        const payroll_cutoff = this.props.dtr.filter[this.state.selectedYear.value][this.state.selectedMonth.value].data[selected.value]

        this.props.viewEmployeeDtr(this.props.params.id,payroll_cutoff.start_date,payroll_cutoff.end_date);
        
      }
    }

    


    componentWillMount(){
        // Get the Filters to be used for the DTR (Payroll Cutoffs)
        this.props.getFilterForDtr(this.props.params.id);
    }

    componentWillReceiveProps = async(nextProps) => {
      
      // If the 'settings' props is not yet loaded OR the settings prop is already loaded but the isCurrentPayrollCutoffLoaded is FALSE, set the default selected data.
      if( nextProps.settings != this.props.settings  ||
          ( nextProps.settings == this.props.settings && !this.state.isCurrentPayrollCutoffLoaded )) {

        this.setState({
          selectedYear: {
            label: nextProps.settings.current_payroll_cutoff.year,
            value: nextProps.settings.current_payroll_cutoff.year,
          },
          selectedMonth: {
            label: nextProps.settings.current_payroll_cutoff.month_label,
            value: nextProps.settings.current_payroll_cutoff.month,
          },
          selectedPayrollCutoff: {
            label: nextProps.settings.current_payroll_cutoff.name,
            value: nextProps.settings.current_payroll_cutoff.id,
          },
          isCurrentPayrollCutoffLoaded : true
        })

        await this.props.viewEmployeeDtr(this.props.params.id , nextProps.settings.current_payroll_cutoff.start_date, nextProps.settings.current_payroll_cutoff.end_date);
      }

      
  }

    render(){

      console.log(this.state)
      console.log(this.props)

        var yearOptions = [];
        var monthOptions = [];
        var payrollCutoffOptions = [];

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

              for (const [key, value] of Object.entries(this.props.dtr.filter[this.state.selectedYear.value])) {
                // monthOptions.push(<option value={key}>{value.label}</option>);
                monthOptions.push({
                  value : key,
                  label : value.label,
                });
              };

              // Construction of Payroll Cutoff Options to be rendered in the select. Checks first if there's a selected Year and Month before proceeding.
              if( Validator.isValid( this.state.selectedMonth?.value ) ) {
                for (const [key, value] of Object.entries(this.props.dtr.filter[this.state.selectedYear.value][this.state.selectedMonth.value].data)) {
                  // payrollCutoffOptions.push(<option value={key}>{value.name}</option>);
                  payrollCutoffOptions.push({
                    value : value.id,
                    label : value.name,
                  });
                };
              }
          }
        }

        
            
        console.log(this.state, yearOptions, monthOptions, payrollCutoffOptions)

        return (
        <Wrapper>
          <ContainerWrapper>
            <ContainerBody>
              <Content col="12" title="Daily Time Record">
                { this.props.dtr.isFilterLoaded? 
                    <div className="dtr-filter"> 
                      
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
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th><i className="fa fa-calendar"></i> Date</th>
                            <th><i className="fa fa-calendar"></i> Status</th>
                            <th><i className="fa fa-calendar"></i> Schedule</th>
                            <th><i className="fa fa-clock-o"></i> Clock In</th>
                            <th><i className="fa fa-clock-o"></i> Clock Out</th>
                            <th><i className="fa fa-hourglass-end"></i> Late</th>
                            <th><i className="fa fa-hourglass-start"></i> Undertime</th>
                            <th><i className="fa fa-moon-o"></i> NightDiff</th>
                            <th><i className="fa fa-hourglass"></i> Overtime</th>
                            <th><i className="fa fa-hourglass"></i> OT w/ Nightdiff</th>
                            <th><i className="fa fa-list"></i> Requests</th>
                            <th><i></i></th>
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

                          return <tr className={"center "+dtr.attendance_status.slug+"-bg-color"}>
                                  <td>{DtrFormatter.displayDate(dtr.date)}</td> 
                                  <td><div className={dtr.attendance_status.slug}>{dtr.attendance_status.name}</div><div>{DtrFormatter.displayHoliday(dtr.holidays)}</div></td>
                                  <td><div>{DtrFormatter.displaySchedule(dtr)}</div></td>
                                  <td><div>{DtrFormatter.displayLog(dtr.time_in)}</div></td>
                                  <td><div>{DtrFormatter.displayLog(dtr.time_out)}</div></td>
                                  <td>{dtr?.payroll_items?.late}</td>
                                  <td>{dtr?.payroll_items?.undertime}</td>
                                  <td>{dtr?.payroll_items?.night_diff}</td>
                                  <td>{dtr?.payroll_items?.overtime}</td>
                                  <td>{dtr?.payroll_items?.overtime_night_diff}</td>
                                  <td>{<DtrRequest requests={dtr.requests}/>}</td>
                                  <td>
                                      {
                                        ( alter_log_status != "approved" ) ?
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
                                           style={{color : "white" }}></i>
                                        </Link>
                                        :
                                        null
                                      }
                                    </td>
                                </tr>
                    })}
                    </tbody>
                </Table>
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
const DtrRequest = (props) => { 
  return <ul style={{ listStyle: 'none'}}>
      {props.requests.map((request, index) => {
          return <li>{Formatter.slug_to_title( request.request_type )} - {Formatter.slug_to_title( request.status )}</li> 
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
    getFilterForDtr : (user_id) => dispatch( getFilterForDtr(user_id) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DailyTimeRecord);
