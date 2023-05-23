import React, { Component } from "react";

import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import { connect } from 'react-redux';
import BackButton from "../../../components/Template/BackButton";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import moment from 'moment';
import Validator from "../../../services/Validator";
import { syncUTCAdjusetment } from '../../../store/actions/admin/syncActions'


class SyncUTCAdjustment extends Component {
    constructor(props){
      super(props)
      this.initialState = {
        filters: {
          valid_from:       this.props.filters?.valid_from ? new Date( this.props.filters?.valid_from ) : (( this.props.settings?.current_payroll_cutoff?.start_date ) ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
          valid_to:         this.props.filters?.valid_to ? new Date( this.props.filters?.valid_to ) : (( this.props.settings?.current_payroll_cutoff?.end_date ) ? new Date( this.props.settings.current_payroll_cutoff.end_date ) : null),
        }
      }

      this.state = this.initialState; 
    }

    onSubmitHandler = (values) => {
      var formData = {};

      for (var key in values) {
        if( values[key] != null ) {
            switch( key ) {
                // case "valid_from":
                // case "valid_to":
                //       formData[key] =  moment( values[key] ).format("YYYY-MM-DD");
                //     break;
                default:
                    formData[key] =  values[key];
                    break;
            }
        }
    }
    

      this.props.syncUTCAdjusetment(formData);
    }

    componentDidMount(){
 
    }

    render(){
      const { sync } = this.props;

      console.log(this.props);

      const validationSchema = Yup.object().shape({
        // valid_from: Yup.date().nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
        // valid_to: Yup.date().nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.')
      });
    
      return(
        <Wrapper>
          <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          // validationSchema={validationSchema} 
          initialValues={this.state.filters}>
          {
          ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
            <form onSubmit={handleSubmit}>
              <ContainerWrapper>
                <ContainerBody>
                      <Content col="12" title="Sync UTC Adjustment"  subtitle={ ""} >
                        <Row>
        
                          <Col className="col-sm"> 
                          <div className="form-group">
                                <label>&nbsp;</label>  
                            <Button className="display-block" variant="primary" type="submit" >
                               Check Adjustment
                            </Button>
                            </div>
                          </Col>
                          <Col className="col-sm">
                          </Col> 
                        </Row>
                    
                      </Content>
                </ContainerBody>
              </ContainerWrapper>
            </form>
        )}
    
        </Formik>
      </Wrapper>);
    }
};

const mapStateToProps = (state) => {
  return {
      sync            : state.sync,
      settings        : state.settings
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    syncUTCAdjusetment       : (data) => dispatch( syncUTCAdjusetment(data) )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(SyncUTCAdjustment);
