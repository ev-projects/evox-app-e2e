import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form  } from 'react-bootstrap';
import API from "../../../services/API";

import "./COEHR.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import Formatter from "../../../services/Formatter";

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";

import { addCOE, fetchCOE } from "../../../store/actions/requests/coeActions";

class COEHR extends Component {

  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      action: null,
      employeeSuggestions: [],
      loadingEmployees: false,
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

  debounceTimeout = null;
  searchEmployees = (query) => {
    // Clear previous timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Set a new timeout
    this.debounceTimeout = setTimeout(async () => {
      if (!query || query.length < 2) {
        this.setState({ employeeSuggestions: [] });
        return;
      }

      this.setState({ loadingEmployees: true });

      try {
        const result = await API.call({
          method: "get",
          url: "/request/coe/user/",
          params: {
            keyword: query
          }
        });

        this.setState({ employeeSuggestions: result.data, loadingEmployees: false });
      } catch (error) {
        this.props.dispatch(Formatter.alert_error(error));
        this.setState({ employeeSuggestions: [], loadingEmployees: false });
      }
    }, 1000);
  };

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
        purpose_note:       this.props.purpose_note != undefined ? this.props.purpose_note : '',
        show_compensation:  this.props.show_compensation != undefined ? this.props.show_compensation : '',
        employee_name:      null,
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
                      <div className="form-group" style={{ position: "relative" }}>
                        <label>Search Employee:</label>
                        <input
                          type="text"
                          name="employee_name"
                          value={values.employee_name}
                          className="form-control"
                          onChange={async (e) => {
                            const val = e.target.value;
                            setFieldValue("employee_name", val);
                            await this.searchEmployees(val);
                          }}
                          autoComplete="off"
                        />
                        {/* Suggestion dropdown */}
                        {this.state.employeeSuggestions.length > 0 && (
                          <ul className="suggestions-dropdown" style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #ccc",
                            zIndex: 1000,
                            listStyle: "none",
                            margin: 0,
                            padding: 0,
                            maxHeight: "150px",
                            overflowY: "auto"
                          }}>
                            {this.state.employeeSuggestions.map((emp) => (
                              <li
                                key={emp.id}
                                style={{ padding: "6px 10px", cursor: "pointer" }}
                                onClick={() => {
                                  setFieldValue("employee_name", emp.name);
                                  setFieldValue("employee_id", emp.id);
                                  this.setState({ employeeSuggestions: [] });
                                }}
                              >
                                {emp.name}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="employee_name" className="input-feedback" />
                        </Form.Control.Feedback> 
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col size="4">   
                      <div className="form-group">
                        <label>Purpose:</label>
                        <select name="purpose_index" value={ values.purpose_index } className="form-control" onChange={(e) => {
                          const selectedValue = e.target.value;
                          setFieldValue("purpose_index", selectedValue);

                          // Clear purpose_note if index is 6 or 10
                          if (![6, 10].includes(Number(selectedValue))) {
                            setFieldValue("purpose_note", "");
                          }
                        }}>
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
                    {[6, 10].includes(Number(values.purpose_index)) && (
                    <Col size="4">
                      <div className="form-group">
                        <label>Travel To:</label>
                        <input type="text" name="purpose_note" value={ values.purpose_note } className="form-control" onChange={handleChange}></input>
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="purpose_note" className="input-feedback" />
                        </Form.Control.Feedback> 
                      </div>
                    </Col>
                    )}
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
  purpose_index:      Yup.string().required("This field is required").nullable(),
  show_compensation:  Yup.string().required("This field is required").nullable(),
  employee_name:      Yup.string().required("Employee name is required").nullable(),
});

const mapStateToProps = (state) => {
  return {
    constant        : state.constant,
    instance        : state.coe.instance,
    purpose_index   : null,
    user            : state.user,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      addCOE                : ( post_data ) => dispatch( addCOE( post_data ) ),
      fetchCOE              : () => dispatch(fetchCOE()),
      setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(COEHR);