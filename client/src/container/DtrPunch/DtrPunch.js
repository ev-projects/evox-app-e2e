
import { viewEmployeeDtr, getFilterForDtr, setSelectedPayrollCutoff,getUserDtrSummary } from '../../store/actions/dtr/dtrActions';
import { fetchUser } from '../../store/actions/userActions'
import { setRedirect } from '../../store/actions/redirectActions';

import React, { Component } from "react";
import "./DtrPunch.css";

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
import MultiQuickpunch from '../../components/Dashboard/PunchComponents/MultiQuickpunch';
import RecentPunch from '../../components/Dashboard/PunchComponents/RecentPunch';

class DtrPunch extends Component {

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

    


    componentWillMount(){
        // Get the Filters to be used for the DTR (Payroll Cutoffs)
        // this.props.getFilterForDtr(this.props.params.id);
    }

    componentWillReceiveProps = async(nextProps) => {
      // If the 'settings' props is not yet loaded OR the settings prop is already loaded but the isCurrentPayrollCutoffLoaded is FALSE, set the default selected data.
      // if( nextProps.settings != this.props.settings  ||
      //     ( nextProps.settings == this.props.settings && !this.state.isCurrentPayrollCutoffLoaded )) {
          
      //     // If there's a selected Payroll Cutoff AND there's no resetInitialState on the props, use it as the current instance.
      //     if( Object.keys(this.props.dtr.selectedPayrollCutoff).length > 0 && (nextProps.location.resetInitialState == undefined  || !nextProps.location.resetInitialState) ) {
      //       this.setPayrollCutoffInstance( this.props.dtr.selectedPayrollCutoff );

      //     // If there's NOT selected Payroll Cutoff OR there's a force reset of Initial State, use the default payroll cutoff instance.
      //     } else {
      //       this.setPayrollCutoffInstance( nextProps.settings.current_payroll_cutoff );
      //     }
      // }

      
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
              {/* <Content col="12" title="Punch for DTR" subtitle={<RequestSubtitle method={method} user={this.props.dtr.employeeInfo} />} > */}
              <Content col="12" title="Multi Clock in" subtitle={<RequestSubtitle method={method} user={this.props.dtr.employeeInfo} />} >
              
                
                <Row>
                  <Col size="5">
                      <MultiQuickpunch />
                  </Col>
                  <Col size="7">
                      <RecentPunch />
                  </Col>
                </Row>
              </Content>
            </ContainerBody>
          </ContainerWrapper>          
        </Wrapper>
        );
        // }
        // return <PageLoading/>;
    }
};







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
export default connect(mapStateToProps, mapDispatchToProps)(DtrPunch);
