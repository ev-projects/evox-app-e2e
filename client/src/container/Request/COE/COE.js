import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form  } from 'react-bootstrap';
import Select from "react-select";

import "./COE.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import moment from 'moment';
/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import Formatter from "../../../services/Formatter";
import DateFormatter from "../../../services/DateFormatter";

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";

import { addCOE, fetchCOE } from "../../../store/actions/requests/coeActions";

class COE extends Component {

  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      action: null
    }
  }


  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {

    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

    for (var key in values) {

        if( values[key] != null ) {
            switch( key ) {
                default:
                    formData.set(key, values[key]);
                    break;
            }
        }
    }

    // include session id in the post parameter
    formData.set('session_id', localStorage.getItem('session_id'));
    
    this.props.addCOE( formData );
  }

  // Set the setAction Function for Setting of the Approval Action to be proceeded
  setAction = (action) => {
    this.setState({'action':action});
  }

  componentWillMount(){
    this.props.fetchCOE()
  }

  
  render = () => {
    // Sets the Overtime Type
    const coePurposes = this.props.constant.COE_PURPOSES != undefined ? this.props.constant.COE_PURPOSES : [];
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        purpose_index:      this.props.purpose_index != undefined ? this.props.purpose_index : '',
        show_compensation:  this.props.show_compensation != undefined ? this.props.show_compensation : ''
    }

    // Sets the default title for hte Request. Checks aswell if it's for approval.
    let title = 'Certificate of Employment';
    return <Wrapper {...this.props} >
        <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          validationSchema={validationSchema} 
          initialValues={initialValue}>
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
            <ContainerWrapper>
              <ContainerBody>
                <Content col="6"  title={title} subtitle={<RequestSubtitle method={'store'} user={this.props.instance.user} />}>
                  <Row>
                    <Col size="8">   
                      <div className="form-group">
                        <label>Purpose:</label>
                        <select name="purpose_index" value={ values.purpose_index } className="form-control" onChange={handleChange}>
                            <option></option>
                            { /** Iterates the Overtime Type */
                              coePurposes != null ? 
                              coePurposes.map(function(item, index){
                                  return <option value={index} >{item['purpose']}</option>
                                }) 
                                : 
                                null
                            }
                        </select>
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="purpose_index" className="input-feedback" />
                        </Form.Control.Feedback> 
                      </div>
                    </Col>
                    <Col size="4">   
                      <div className="form-group">
                        <label>With Salary:</label>
                        <select name="show_compensation" value={ values.show_compensation } className="form-control" onChange={handleChange}>
                            <option></option>
                            <option value={'0'}>No</option>
                            <option value={'1'}>Yes</option>
                        </select>
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="show_compensation" className="input-feedback" />
                        </Form.Control.Feedback> 
                      </div>
                    </Col> 
                  </Row>
                  <p class="note" >NOTE: For employees with special allowances, please email <a href="mailto:happiness@eastvantage.com">happiness@eastvantage.com</a>.</p>
                  <RequestButtons method={'store'} {...this} />
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
      </Formik>
    </Wrapper>
  }
}


/** Form Validation */

const validationSchema = Yup.object().shape({
  purpose_index:           Yup.string().required("This field is required").nullable(),
  show_compensation:       Yup.string().required("This field is required").nullable(),
  });

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.coe.instance,
    purpose_index              : null,
		user			        : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      addCOE                : ( post_data ) => dispatch( addCOE( post_data ) ),
      fetchCOE              : () => dispatch(fetchCOE()),
      setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(COE);








