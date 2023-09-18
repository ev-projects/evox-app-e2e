import React, { Component } from "react";
import "./DPAFormIndia.css";
import { Row, Button, Form } from "react-bootstrap";
import { connect } from "react-redux";
import { tickDpa } from "../../store/actions/profile/profileActions";
import { showAlert } from "../../store/actions/settings/alertActions";
import ReactGoogleSlides from "react-google-slides";
import {
  Content,
  ContainerWrapper,
  ContainerBody,
} from "../../components/GridComponent/AdminLte.js";
import Wrapper from "../../components/Template/Wrapper";
import ReactPlayer from "react-player/lazy";
import { Formik } from "formik";
import * as yup from "yup";

class DPAFormIndia extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showSubmitForm: true,
      confirm: false,
    };
  }


  // Toggle show of DPA Form
  toggleSubmitForm = (bool) => {
    this.setState({
      showSubmitForm: bool,
    });
  };

  // Toggle Confirm Button
  toggleConfirmButton = () => {
    this.setState({
      confirm: !this.state.confirm,
    });
  };

  // Submit DPA Form
  onSubmitHandler = (values) => {
    if (values.confirm) {
      this.props.tickDpa(this.props.user.id);
    }
  };

  render() {
    const {

      showSubmitForm,
    } = this.state;
    const { user } = this.props;

    return (
      <Wrapper {...this.props}>
        <ContainerWrapper>
          <ContainerBody>
            <Content col="12" title="Webinar: Data Privacy For India">
              <Row>
                <div className="col-lg-12 col-md-12 col-sm-12">
                  <h2></h2>
                  <p>
                    All employees of India are required to view the Data Privacy Protection Policy and Training presentation
                    below. Please tick the checkbox upon completion. <br />
                    <br />This is a 12 slide presentation for Indian Eastvantage employees
                    that provides information on Data Privacy and Data
                    Protection. In this presentation, you are given an overview
                    of data protection key principles, India's growth in the digital society, and your role in keeping
                    data confidential as an employee or associate for our
                    clients. Moreover, this presentation covers the basics approach in protection policies.
                  </p>
                  <br />
                  <div  className="slides">
                    <ReactGoogleSlides
                      width={"100%"}
                      height={540}
                      //old link
                      // slidesLink="https://docs.google.com/presentation/d/1vM61z8DLcJ8anfs3krQEHNGrtEE2-lR0/edit?usp=sharing&ouid=117493291069253670001&rtpof=true&sd=true"
                  

                      //new
                      slidesLink="https://docs.google.com/presentation/d/1RkTgDxzDup7muLYdigHDVJhPOYEobyAf/edit?usp=sharing&ouid=110230619843845605120&rtpof=true&sd=true"

                      position={1}
                      showControls
                      loop
                    />
                  </div>
                  <Formik
                    validationSchema={validationSchema}
                    onSubmit={this.onSubmitHandler}
                    initialValues={{ confirm: this.state.confirm }}
                  >
                    {({
                      values,
                      handleChange,
                      handleSubmit,
                      touched,
                      errors,
                    }) => (
                      <form onSubmit={handleSubmit}>
                        {
                          // If the DPA is not yet ticked, allow the condition to show the Submit Form
                          user.dpa_ticked_at == null ? (
                            // If the showSubmitForm is true ( which triggered by the video ending/ video reaching 23:15 seconds ), show the Submit form and button.
                            showSubmitForm ? (
                              <p>
                                <br />
                                <Form.Control.Feedback type="invalid">
                                  &nbsp;
                                  {errors.confirm &&
                                    touched.confirm &&
                                    errors.confirm}
                                </Form.Control.Feedback>
                                <input
                                  name="confirm"
                                  type="checkbox"
                                  checked={values.confirm}
                                  onChange={handleChange}
                                />
                                I confirm that I completed the presentation seen 
                                above. I  read, and understood
                                the training, and I understand that as an
                                employee, it is my responsibility to abide by
                                Eastvantage policy and procedures, in accordance
                                with the training. If I have questions about the
                                training, materials presented or Eastvantage
                                policy and procedures, I understand it is my
                                responsibility to seek clarification from the
                                Human Resources Department.
                                <br />
                                <br />
                                <Button
                                  type="button"
                                  className="btn btn-secondary"
                                  type="submit"
                                >
                                  <i className="fa fa-location-arrow" /> Submit
                                </Button>
                              </p>
                            ) : null
                          ) : (
                            <p>
                              <br /> Thank you for your participation! <br />
                              DPA Submission Date:{" "}
                              <strong>{user.dpa_ticked_at}</strong>
                            </p>
                          )
                        }
                      </form>
                    )}
                  </Formik>
                </div>
              </Row>
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    );
  }
}

// Object for Data Validation
const validationSchema = yup.object().shape({
  confirm: yup
    .bool()
    .oneOf([true], "Please tick the checkbox to confirm the submission."),
});

const mapStateToProps = (state) => {
  return {
    user: state.user,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    tickDpa: (id) => dispatch(tickDpa(id)),
    showAlert: (message, timeout) => dispatch(showAlert(message, timeout)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(DPAFormIndia);
