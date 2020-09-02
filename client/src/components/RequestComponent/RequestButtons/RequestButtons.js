import React, { Component } from "react";
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import { useFormikContext } from 'formik';

export const RequestButtons = (context) => {

    // This function promps a confirmation dialog box to confirm if their action towards the request is final.
    function confirmAction( status ){
      if( window.confirm("Are you sure you want to "+ status +" this request?") ) { 
        context.setAction( status ); 
        submitForm(); 
      }
    }

    const { submitForm } = useFormikContext();
    return (
        <span>
         { /** Shows the respective buttons base on the onApproval variable  */
             context.method == 'store' ? 
                 <Button type="submit" className="btn btn-primary" onClick={()=> { context.setAction(null); }}>Submit</Button>
             : 
             context.method == 'update' ?
                 <Button type="submit" className="btn btn-primary" onClick={()=> { context.setAction(null); }}>Update</Button>   
             : 
             context.method == 'approval' ?
               <span>
                 <Button type="button" className="btn btn-primary" onClick={()=> { confirmAction('approve'); }} >Approve</Button> &nbsp;
                 <Button type="button" className="btn btn-danger" onClick={()=> { confirmAction('decline'); }} >Decline</Button>  &nbsp;
               </span>
             :
             ''
           }
           { context.method != 'store' ? 
             <span>&nbsp;<Button type="button" className="btn btn-secondary" onClick={()=> { confirmAction('cancel') }}>Cancel</Button></span>
             :
             null
           }
           &nbsp;<Button type="button" className="btn btn-secondary float-right" onClick={context.goBack} >Go Back</Button> 
        </span>
    );
}

