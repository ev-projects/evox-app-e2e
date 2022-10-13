import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import moment from 'moment';

import "./ChangeLogs.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { addChangeLogs } from '../../../store/actions/admin/changeLogsActions';

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import BackButton from "../../../components/Template/BackButton";

class ChangeLogs extends Component {

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {

    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

    for (var key in values) {
      if( values[key] != null ) {
        switch( key ) {
          case "log_from":
            formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
            break;
          case "log_to":
            formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
            break;
          default:
            formData.set(key, values[key]);
            break;
        }
      }
    }

    // Checks on what action to use depending on the values.action
    if (values.method == "store") {
      if (window.confirm("Are you sure you want to submit this change log?")) {
        switch( values.method ) {
          case "store":
              this.props.addChangeLogs( formData );
              break;
          default:
              break;

        }
      }
    }
  }

  render = () => {
    // Sets the Method of the current state.
    const method = 'store';

    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        log_from:           this.props.instance.log_from != undefined ? new Date( this.props.instance.log_from ) : null,
        log_to:             this.props.instance.log_to != undefined ? new Date( this.props.instance.log_to ) : null,
        title:              this.props.instance.title != undefined ? this.props.instance.title : null,
        description:        this.props.instance.description != undefined ? this.props.instance.description : null,
    }

    // Sets the default title for the Request. Checks aswell if it's for approval.
    let title = 'Change Logs';

    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( (method == 'store') || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){

      return <Wrapper {...this.props} >
        <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler}
        validationSchema={validationSchema} 
        initialValues={initialValue}
        >
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="action" value={values.action} />
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="date" value={values.date} />
            <input type="hidden" name="id"  value={values.id} />
            <input type="hidden" name="status"  value={values.status} />
            <ContainerWrapper>
              <ContainerBody>
                <Content col="6" title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
                  <Row>
                    <Col size="4">
                      <div className="form-group">
                        <label>Date Range: </label>
                        <InputDate name="log_from" value={values.date}/>
                      </div>
                    </Col>
                    <Col size="4">
                      <div className="form-group">
                        <label>&nbsp;</label>
                        <InputDate name="log_to" value={values.date}/>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col size="8">
                      <div className="form-group">
                        <label>Title:</label>
                        <InputGroup>
                            <FormControl variant="primary" name="title" onChange={handleChange} value={values.title} />
                            <Form.Control.Feedback type="invalid">
                            &nbsp;{errors.title && touched.title && errors.title}
                            </Form.Control.Feedback>
                        </InputGroup>
                      </div>
                    </Col>
                  </Row> 
                  <Row>
                    <Col size="12">
                      <div className="form-group">
                        <label>Description:</label>
                        <textarea className="form-control" rows="3" name="description" onChange={handleChange} value={values.description??''} placeholder="Change log summary..."></textarea>
                        <Form.Control.Feedback type="invalid">
                          &nbsp;{errors.description && touched.description && errors.description}
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                  </Row>

                  <span>
                    <Button type="submit" className="btn btn-primary" onClick={(e)=>{ setFieldValue('action',null); handleSubmit(e); }}>
                      <i className="fa fa-location-arrow" /> Submit
                    </Button>&nbsp;
                    <BackButton style={{'float': 'right'}} {...this.props} />
                  </span>
                  
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
    
      </Formik>
      </Wrapper>
    
    }
    return <PageLoading/>;
  }
}
/** Form Validation */

const validationSchema = Yup.object().shape({
    title:        Yup.string().required("This field is required").nullable(),
    description:  Yup.string().required("This field is required").nullable(),
    log_from:     Yup.date().required("This field is required").nullable(),
    log_to:       Yup.date().required("This field is required").nullable(),
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.restDayWork.instance,
    isInstanceLoaded  : state.restDayWork.isInstanceLoaded,
		user			        : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      // addRestDayWork        : ( post_data ) => dispatch( addRestDayWork( post_data ) ),
      addChangeLogs : ( post_data ) => dispatch( addChangeLogs( post_data ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(ChangeLogs);








