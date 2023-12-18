import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,Table,InputGroup,FormControl  } from 'react-bootstrap';

import "./JobOpeningsUpdate.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';

import { importJobOpening } from '../../../store/actions/admin/jobOpeningActions.js';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Papa from "papaparse";


class JobOpeningsUpdate extends Component {
  
  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      type:       'csv',
      error:      false,
      message:    '',
      parsedJobs: [],
    };
    // this.onChangeHandler = this.onChangeHandler.bind(this);
  }

  componentWillMount() {}

  onChangeHandler = (event) => {
    if (event.currentTarget.files.length !== 0) {
        if (event.currentTarget.files[0].type !== "text/csv") {
          this.setState({ 
            error: true,
            message: 'Please provide the correct file format.',
            parsedJobs: [],
            csv_file: [],
          });
        } else {
          this.setState({
            csv_file: event.currentTarget.files[0],
          });
          Papa.parse(event.currentTarget.files[0], {
            header: false,
            skipEmptyLines: true,
            complete: function (results) {
              this.setState({ 
                error: false,
                message: '',
                parsedJobs: results.data.slice(1),
              });
            }.bind(this),
          });
        }
    }
  }

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update
  onSubmitHandler = (values) => {
    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

    if (this.state.csv_file === undefined) {
      this.setState({ 
        error: true,
        message: 'This field is required.',
      });
    } else {
      if (this.state.csv_file.type !== "text/csv") {
        this.setState({ 
          error: true,
          message: 'Please provide the correct file format.',
        });
      } else {
        formData.set('parsedJobs', JSON.stringify(this.state.parsedJobs));
        this.props.importJobOpening( formData );

        this.setState({ 
          error: false,
          message: '',
        });
      }
    }
  }

  render = () => {  
    // Sets the Method of the current state.
    const method = 'store';

    // Sets the Type of the current state.
    const type = this.state.type;

    // Sets the Type of the current state.
    const parsedJobs = this.state.parsedJobs;

    // Sets the Error and Message of the current state.
    const error   = this.state.error;
    const message = this.state.message;

    // Sets Initial Value of the current Formik form.
    const initialValue = {
      action:       null,
      method:       method,
      type:         type,
      error:        error,
      message:      message,
      parsedJobs:   parsedJobs,
    }

    return <Wrapper {...this.props} >
        <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler}
          initialValues={initialValue}>
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="id"  value={values.id} />
            <ContainerWrapper>
              <ContainerBody>
                <Content col="8" title="Job Openings Import" subtitle={<RequestSubtitle method={method} />}>
                  {(type != null && type === "csv") ? 
                  <Row>  
                    <Col size="8">
                      <div className="form-group">
                        <label className="dep-announcement-required">Choose a csv file: </label>
                        <input type="file" name="file" id="csv-to-upload" accept="csv/*" onChange={this.onChangeHandler} />
                        {(error === true) ? 
                          <div class="invalid-feedback"><div class="input-feedback">{message}</div></div> : <></>
                        }
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="file" className="input-feedback" />
                        </Form.Control.Feedback>
                      </div>
                    </Col>
                  </Row> : <></>
                  }

                  { (parsedJobs !== null && parsedJobs.length > 0) ?
                    <div>
                      {/* Record Displayed:  */}
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>Position Title</th>
                            <th>EV Careers Link</th>
                            <th>Category</th>
                            <th>Country</th>
                          </tr>
                        </thead>
                        <tbody>
                          { parsedJobs.map((job, key) => {
                              return <tr key={key}>
                              <td>{job[0]}</td>
                              <td>{job[1]}</td>
                              <td>{job[2]}</td>
                              <td>{job[3]}</td>
                            </tr>         
                          })}
                        </tbody>
                      </Table>
                    </div>
                  : <></> }

                  <RequestButtons method={method} {...this} />
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
      </Formik>;    
      </Wrapper>
  }
}

const mapStateToProps = (state) => {
  return {
    user      : state.user,
    constant  : state.constant,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    importJobOpening : ( post_data ) => dispatch( importJobOpening( post_data ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(JobOpeningsUpdate);