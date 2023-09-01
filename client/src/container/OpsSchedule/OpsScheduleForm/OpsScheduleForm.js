import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,FormControl, InputGroup } from 'react-bootstrap';

import "./OpsScheduleForm.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';
/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import { setRedirect } from '../../../store/actions/redirectActions';

import { fetchOpsSchedule, addOpsSchedule, updateOpsSchedule, clearOpsScheduleInstance } from '../../../store/actions/opsschedule/opsScheduleActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";


class OpsScheduleForm extends Component {

  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      action: null
    }
  }


  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update
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

    if (values.method === "update") {
      const id = values.id;
      formData.append('_method', 'PUT');
      this.props.updateOpsSchedule( id, formData );
    } else {
      this.props.addOpsSchedule( formData );
    }
  }

  componentWillMount(){
      // Clear the Instance of Ops Schedule before rendering new Instance (If applicable)
      this.props.clearOpsScheduleInstance();
      
      // If the ID is defined, load the Ops Schedule Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {
        const id = this.props.params.id;
        this.props.fetchOpsSchedule( id );
      }
  }

  
  render = () => {  
    // Get all Ops Departments from server constants
    const opsDepts = this.props.constant.OPS_DEPTS != undefined ? this.props.constant.OPS_DEPTS : [];

    // Sets the Method of the current state.
    const method = this.props.params.id != undefined ? 'update' : 'store';

    // Get the fetched ops schedule instance
    const opsSched = this.props.params.id != undefined ? this.props.instance : [];

    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:           null,
        method:           method,
        id:               opsSched.id != undefined ? opsSched.id : null,
        department:       opsSched.department_id != undefined ? opsSched.department_id : null,
        name:             opsSched.name != undefined ? opsSched.name : null,
        position:         opsSched.position != undefined ? opsSched.position : null,
        email:            opsSched.email != undefined ? opsSched.email : null,
        domain:           opsSched.domain != undefined ? opsSched.domain : null,
        scope:            opsSched.scope != undefined ? opsSched.scope : null,
        start_time:       opsSched.start_time != undefined ? new Date("2020-01-01 " + opsSched.start_time) : null,
        end_time:         opsSched.end_time != undefined ? new Date("2020-01-01 " + opsSched.end_time) : null,
        timezone:         opsSched.timezone != undefined ? opsSched.timezone : null,
        mon:              opsSched.mon != undefined ? opsSched.mon : false,
        tue:              opsSched.tue != undefined ? opsSched.tue : false,
        wed:              opsSched.wed != undefined ? opsSched.wed : false,
        thu:              opsSched.thu != undefined ? opsSched.thu : false,
        fri:              opsSched.fri != undefined ? opsSched.fri : false,
        sat:              opsSched.sat != undefined ? opsSched.sat : false,
        sun:              opsSched.sun != undefined ? opsSched.sun : false,
    }

    // Set title.
    let title = 'Operations Schedule Form';
  
    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( method == 'store' || method ==  'update' && this.props.isInstanceLoaded) {

      return <Wrapper {...this.props} >
        <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          validationSchema={validationSchema} 
          initialValues={initialValue}>
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="action" value={values.action} />
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="date" value={values.date} />
            <input type="hidden" name="id"  value={values.id} />
            <ContainerWrapper>
              <ContainerBody>
                <Content col="6"  title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
                  <Row>  
                    <Col size="4"> 
                      <div className="form-group">
                        <label className="dep-announcement-required">Department:</label>
                        <select name="department" value={ values.department } className="form-control" onChange={handleChange}>
                            <option></option>
                            { /** Iterates the Ops Departments */
                              opsDepts != null ? 
                              opsDepts.map(function(item, index){
                                  return <option value={ item['id'] } >{ item['name'] }</option>
                                }) 
                                : 
                                null
                            }
                        </select>
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="department" className="input-feedback" />
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                  </Row>

                  <Row>
                    <Col size="4"> 
                      <div className="form-group">
                        <label className="dep-announcement-required">Name(POC):</label>
                        <FormControl variant="primary" name="name" className="name" onChange={handleChange} value={values.name} />
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="name" className="input-feedback" />
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                    <Col size="4"> 
                      <div className="form-group">
                        <label className="dep-announcement-required">Position:</label>
                        <FormControl variant="primary" name="position" className="position" onChange={handleChange} value={values.position} />
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="position" className="input-feedback" />
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                    <Col size="4">
                      <div className="form-group">
                        <label className="dep-announcement-required">Email:</label>
                        <FormControl variant="primary" name="email" className="email" onChange={handleChange} value={values.email} />
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="email" className="input-feedback" />
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                  </Row> 

                  <Row>
                    <Col size="4"> 
                      <div className="form-group">
                        <label>Domain:</label>
                        <FormControl variant="primary" name="domain" className="domain" onChange={handleChange} value={values.domain} />
                      </div>
                    </Col>
                    <Col size="4"> 
                      <div className="form-group">
                        <label>Scope:</label>
                        <InputGroup>
                            {/* <InputDate name="date" value={values.date} readOnly={onApproval}/> */}
                            <FormControl variant="primary" name="scope" className="scope" onChange={handleChange} value={values.scope} placeholder="Use comma(,) for multiple answers" />
                        </InputGroup>
                      </div>
                    </Col>
                  </Row>

                  <Row>
										<Col size="12">
											<div className="form-group">
												<label className="dep-announcement-required" htmlFor="valid_to">Work Days:</label>
                          <div>
                            <label><input type="checkbox" name="mon" onChange={handleChange} checked={values.mon} />Monday &nbsp;</label>
                            <label><input type="checkbox" name="tue" onChange={handleChange} checked={values.tue} />Tuesday &nbsp;</label>
                            <label><input type="checkbox" name="wed" onChange={handleChange} checked={values.wed} />Wednesday &nbsp;</label>
                            <label><input type="checkbox" name="thu" onChange={handleChange} checked={values.thu} />Thursday &nbsp;</label>
                            <label><input type="checkbox" name="fri" onChange={handleChange} checked={values.fri} />Friday &nbsp;</label>
                            <label><input type="checkbox" name="sat" onChange={handleChange} checked={values.sat} />Saturday &nbsp;</label>
                            <label><input type="checkbox" name="sun" onChange={handleChange} checked={values.sun} />Sunday &nbsp;</label>
                          </div>
											</div>
										</Col>
									</Row>

                  <Row>  
                    <Col size="4">   
                      <div className="form-group">
                        <label className="dep-announcement-required">Start Time: </label>
                        <InputTime name="start_time" value={values.start_time} contrast_too = "start_time" />
                      </div>
                    </Col> 
                    <Col size="4"> 
                      <div className="form-group">
                        <label className="dep-announcement-required">End Time: </label>
                        <InputTime name="end_time" value={values.end_time} contrast_too = "end_time" />
                      </div>  
                    </Col> 
                    <Col size="4"> 
                      <div className="form-group">
                        <label className="dep-announcement-required">Timezone: </label>
                        <select name="timezone" value={ values.timezone } className="form-control" onChange={handleChange}>
                            <option></option>
                            <option value="PST">PST</option>
                            <option value="IST">IST</option>
                            <option value="EET">EET</option>
                        </select>
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="timezone" className="input-feedback" />
                        </Form.Control.Feedback>
                      </div>  
                    </Col>
                  </Row>

                  <RequestButtons method={method} {...this} />
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
    
      </Formik>;    
      </Wrapper>
    }
  return <PageLoading/>;
}
}


/** Form Validation */

const validationSchema = Yup.object().shape({
    department:     Yup.string().required("This field is required").nullable(),
    name:           Yup.string().required("This field is required").nullable(),
    position:       Yup.string().required("This field is required").nullable(),
    email:          Yup.string().required("This field is required").nullable(),
    start_time:     Yup.string().required("This field is required").nullable(),
    end_time:       Yup.string().required("This field is required").nullable(),
    timezone:       Yup.string().required("This field is required").nullable(),
  });

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.opsSchedule.instance,
    isInstanceLoaded  : state.opsSchedule.isInstanceLoaded,
		user			        : state.user,
    settings          : state.settings,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchOpsSchedule          : ( id ) => dispatch( fetchOpsSchedule( id ) ),
      addOpsSchedule            : ( post_data ) => dispatch( addOpsSchedule( post_data ) ),
      updateOpsSchedule         : ( id, post_data ) => dispatch( updateOpsSchedule( id, post_data ) ),
      setRedirect               : ( link ) => dispatch( setRedirect( link ) ),
      clearOpsScheduleInstance  : () => dispatch( clearOpsScheduleInstance() )
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(OpsScheduleForm);








