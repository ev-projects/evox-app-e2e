import React, { Component } from "react";
import { connect } from 'react-redux'
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import { useFormikContext } from 'formik';
import BackButton from "../../Template/BackButton";

const RequestButtons = (context) => {
  
  const { handleSubmit, setFieldValue } = useFormikContext();
    console.log(context.props.instance.status);
    return (
      
      <span>
      { /** Shows the respective buttons base on the onApproval variable  */
          /** If Store, show Submit button  */
          context.method == 'store' ? 
            <Button type="submit" className="btn btn-primary" onClick={(e)=>{ setFieldValue('action',null); handleSubmit(e); }}><i className="fa fa-location-arrow" /> Submit</Button>
            : 
            /** If Update and the Instance's status is NOT Approved, Show Update button  */
            context.method == 'update' && context.props.instance.status != 'approved' ?
              <span>
                <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action',null); handleSubmit(e); }}><i className="fa fa-edit" /> Update</Button>&nbsp;
                
                { /** If Update and the Instance's status is NOT Canceled, Show Cancel button  */
                  context.props.instance.status != 'canceled' ? 
                    <Button type="submit" className="btn btn-danger" onClick={(e)=> { setFieldValue('action','cancel'); handleSubmit(e);  }}><i className="fa fa-window-close" /> Cancel</Button>
                    :
                    null
                }
                
              </span>
          : 
                  context.method == 'update' ?
                  <span>
                    <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action',null); handleSubmit(e); }}><i className="fa fa-edit" /> Update and Reopen</Button>&nbsp;
                    
                  </span>
              : 
          /** If Approval  */
          context.method == 'approval' ?
            /** ... and the Status is Approved, show the Decline button */
            (context.props.instance.status == 'approved' ? 
              <span>
                <Button type="submit" className="btn btn-danger" onClick={(e)=> { setFieldValue('action','decline'); handleSubmit(e);  }} ><i className="fa fa-thumbs-down" /> Decline</Button>  &nbsp;
              </span>
              :
              
              /** ... and the Status is Declined, show the Approve button */
              (context.props.instance.status == 'declined' ? 
                <span>
                  <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action','approve'); handleSubmit(e);  }} ><i className="fa fa-thumbs-up" /> Approve</Button> &nbsp;
                </span>
                :

                /** ... and the Status is Pending, show the Approve & Decline button */
                (context.props.instance.status == 'pending' ?
                  <span>
                    <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action','approve'); handleSubmit(e);  }} ><i className="fa fa-thumbs-up" /> Approve</Button> &nbsp;
                    <Button type="submit" className="btn btn-danger" onClick={(e)=> { setFieldValue('action','decline'); handleSubmit(e);  }} ><i className="fa fa-thumbs-down" /> Decline</Button>  &nbsp;
                  </span>
                  :
                
                /** ... and the Status is Canceled, show no buttons */
                  ''
                )
              )
            )
          :
          ''
        }
        &nbsp;<BackButton style={{'float': 'right'}} {...context.props} /> 
      </span>
    );
}

export default connect(null, null)(RequestButtons);