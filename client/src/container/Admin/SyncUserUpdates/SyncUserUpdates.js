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
import { syncBhrUsers } from '../../../store/actions/admin/syncActions'

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
      const { sync } = this.props;
      console.log(this.props);
      const validationSchema = Yup.object().shape({
        valid_from: Yup.date().required("This field is required"),
      });
    
      return(
        <Wrapper>
          <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          validationSchema={validationSchema} 
          initialValues={this.state.filters}>
          {
          ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
            <form onSubmit={handleSubmit}>
              <ContainerWrapper>
                <ContainerBody>
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
                        { sync?.users?.length > 0 ?
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

                            { sync?.users?.map(function (user, i) {
                                                                return  (<tr>
                                                                <td>{i+1}</td>
                                                                <td>{user.emp_num}</td>
                                                                <td>{user.name}</td>
                                                                <td>{user.action}</td>
                                                                </tr>)
                                                            }) 
                                                        }
                          </tbody>
                        </Table>
                          :
                          null
                          } 
                        
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
    syncBhrUsers       : (data) => dispatch( syncBhrUsers(data) )
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(SyncUserUpdates);
