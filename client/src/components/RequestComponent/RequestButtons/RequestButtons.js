import React, { Component } from "react";
import { connect } from 'react-redux'
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import { useFormikContext } from 'formik';

const RequestButtons = (context) => {

  const { handleSubmit, setFieldValue } = useFormikContext();

    return (
      
      <span>
      { /** Shows the respective buttons base on the onApproval variable  */
          context.method == 'store' ? 
              <Button type="submit" className="btn btn-primary" onClick={(e)=>{ setFieldValue('action',null); handleSubmit(e); }}>Submit</Button>
          : 
          context.method == 'update' ?
              <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action',null); handleSubmit(e); }}>Update</Button>   
          : 
          context.method == 'approval' ?
            <span>
              <Button type="submit" className="btn btn-primary" onClick={(e)=> { setFieldValue('action','approve'); handleSubmit(e);  }} >Approve</Button> &nbsp;
              <Button type="submit" className="btn btn-danger" onClick={(e)=> { setFieldValue('action','decline'); handleSubmit(e);  }} >Decline</Button>  &nbsp;
            </span>
          :
          ''
        }
        { context.method != 'store' ? 
          <span>&nbsp;<Button type="submit" className="btn btn-secondary" onClick={(e)=> { setFieldValue('action','cancel'); handleSubmit(e);  }}>Cancel</Button></span>
          :
          null
        }
        &nbsp;<Button type="button" className="btn btn-secondary float-right" onClick={context.goBack} >Go Back</Button> 
      </span>
    );
}

export default connect(null, null)(RequestButtons);