import React, { Component } from "react";
import { connect } from 'react-redux'
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import { useFormikContext } from 'formik';

const RequestButtons = (context) => {

  const { handleSubmit, setFieldValue } = useFormikContext();
  
    return (
      
      <span>
      { /** Shows the respective buttons base on the onApproval variable  */
          /** If Store, show Submit button  */
          context.method == 'store' ? 
            <Button type="submit" className="btn btn-primary" onClick={(e)=>{ setFieldValue('action',null); handleSubmit(e); }}>Submit</Button>
            : 
            /** If Update and the Instance's status is NOT Approved, Show Update button  */
            context.method == 'update' && context.props.instance.status != 'approved' ?
              <span>
                <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action',null); handleSubmit(e); }}>Update</Button>&nbsp;
                
                { /** If Update and the Instance's status is NOT Canceled, Show Cancel button  */
                  context.props.instance.status != 'canceled' ? 
                    <Button type="submit" className="btn btn-secondary" onClick={(e)=> { setFieldValue('action','cancel'); handleSubmit(e);  }}>Cancel</Button>
                    :
                    null
                }
                
              </span>
          : 

          /** If Approval  */
          context.method == 'approval' ?
            /** ... and the Status is Approved, show the Decline button */
            (context.props.instance.status == 'approved' ? 
              <span>
                <Button type="submit" className="btn btn-danger" onClick={(e)=> { setFieldValue('action','decline'); handleSubmit(e);  }} >Decline</Button>  &nbsp;
              </span>
              :
              
              /** ... and the Status is Declined, show the Approve button */
              (context.props.instance.status == 'declined' ? 
                <span>
                  <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action','approve'); handleSubmit(e);  }} >Approve</Button> &nbsp;
                </span>
                :

                /** ... and the Status is Pending, show the Approve & Decline button */
                (context.props.instance.status == 'pending' ?
                  <span>
                    <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action','approve'); handleSubmit(e);  }} >Approve</Button> &nbsp;
                    <Button type="submit" className="btn btn-danger" onClick={(e)=> { setFieldValue('action','decline'); handleSubmit(e);  }} >Decline</Button>  &nbsp;
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
        &nbsp;<Button type="button" className="btn btn-secondary float-right" onClick={context.goBack} >Go Back</Button> 
      </span>
    );
}

export default connect(null, null)(RequestButtons);