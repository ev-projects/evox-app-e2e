import React, { Component } from "react";
import "./SyncUserUpdates.css";
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
import { syncBhrUsers } from '../../../store/actions/admin/bhrSyncActions'

class SyncUserUpdates extends Component {
    constructor(props){
      super(props)
      this.initialState = {
        filters: {
          valid_from:       this.props.filters?.valid_from ? new Date( this.props.filters?.valid_from ) : (( this.props.settings?.current_payroll_cutoff?.start_date ) ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null)
        }
      }

      this.state = this.initialState; 
    }

    onSubmitHandler = (values) => {
      var formData = {};


      for (var key in values) {
      
        if( values[key] != null ) {
            switch( key ) {
                case "valid_from":
                      formData[key] =  moment( values[key] ).format("YYYY-MM-DD");
                    break;
                default:
                    formData[key] =  values[key];
                    break;
            }
        }
    }
      this.props.syncBhrUsers(formData);
    }

    componentDidMount(){
      var filters = {
        ...this.state.filters,
        valid_from: Validator.isValid(this.state.filters.valid_from) ? this.state.filters.valid_from.toISOString().substring(0, 10) : null
      };
  
    }

    render(){
      const {  data } = this.props;

      const validationSchema = Yup.object().shape({
        valid_from: Yup.date().required("This field is required"),
      });
    
      return(<Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler} 
        validationSchema={validationSchema} 
        initialValues={this.state.filters}>
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        <form onSubmit={handleSubmit}>
            <Wrapper>
               <ContainerWrapper>
                  <ContainerHeader>
                  </ContainerHeader>
                  <ContainerBody>
                    <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                        <Content col="12" title="Sync BHR User Updates"  subtitle={ <BackButton {...this.props}/>} >
                        <Row>
                          <Col className="col-sm"> 
                            <div className="form-group">
                              <label>Changes From:</label>
                              <InputDate name="valid_from" value={values.valid_from}/>
                            </div>
                          </Col> 

                          <Col className="col-sm"> 
                          <div className="form-group">
                                <label>&nbsp;</label>  
                            <Button className="display-block" variant="primary" type="submit" >
                               Submit
                            </Button>
                            </div>
                          </Col>
                          <Col className="col-sm">
                          </Col> 
                          <Col className="col-sm">
                          </Col> 
                        </Row>
                        { data.isSuccessful ?
                          <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Employee No</th>
                              <th>Name</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>

                            {data.data.map(function (data, i) {
                                                                return  (<tr>
                                                                <td>{i+1}</td>
                                                                <td>{data.emp_num}</td>
                                                                <td>{data.name}</td>
                                                                <td>{data.action}</td>
                                                                </tr>)
                                                            }) 
                                                        }
                          </tbody>
                        </Table>
                          :
                          null
                          } 
                        
                        </Content>
                    </div>
                  </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
            </form>
      )}
    
      </Formik>);
    }
};

const mapStateToProps = (state) => {
  return {
      data            : state.syncBhrReducers,
      settings        : state.settings
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    syncBhrUsers       : (data) => dispatch( syncBhrUsers(data) )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(SyncUserUpdates);
